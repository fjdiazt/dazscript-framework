# Scripts Project - AI Agent Context Guide

This document provides guidance for AI agents (like GitHub Copilot) working on the scripts projects. It covers architecture patterns, conventions, common practices, and gotchas.

---

## 🎯 Quick Reference

**Framework:** `dazscript-framework` + `dazscript-types` (local file imports via `@dsf/*`)

**Projects:**
- `scripts/common/` - 77 utility scripts in categories
- `scripts/paramate/` - Model-based parameter manager with UI
- `scripts/power-menu/` - State-driven menu system

**Build:** TypeScript → Webpack+Babel → ES5 JavaScript → Daz Studio scripts

---

## ⚠️ CRITICAL: Read DAZ_ENVIRONMENT.md First

**Before implementing ANY feature, read [DAZ_ENVIRONMENT.md](./DAZ_ENVIRONMENT.md).** 

Daz Studio scripts run in a restricted ECMA-262 sandbox where many standard JavaScript features are **unavailable**. This includes:
- ❌ No Promise/async-await
- ❌ No native Set/Map (use `CustomSet<T>`)
- ❌ No array `.includes()` (use `contains()` helper)
- ❌ No setTimeout (use `Delayed` class)
- ❌ No fetch/AJAX

**DAZ_ENVIRONMENT.md provides:**
- Complete "Standard JS → Daz Replace" reference table
- Helper function inventory
- Common patterns & workarounds
- Troubleshooting guide

**Failure to check this causes runtime errors that only appear when testing in Daz Studio.**

---

## 📐 Architecture Patterns

### Pattern 1: Simple Action Scripts (Stateless)

**Used in:** `common/src/scripts/**/*.dsa.ts`

**Structure:**
```typescript
import { action } from '@dsf/core/action-decorator';
import { BaseScript } from '@dsf/core/base-script';
import { getSelectedNodes } from '@dsf/helpers/scene-helper';

/**
 * Brief description of what the script does
 */
@action({ 
  text: 'Menu Display Text',
  menuPath: '/Vholf3Dv3/scripts/category/'  // Optional, auto=category name
  // toolbar: 'ToolbarName',                  // Optional
  // shortcut: 'Ctrl+Alt+K',                  // Optional
  // icon: 'scripts/category/name.dsa.png'   // Optional
})
class DoSomethingScript extends BaseScript {
  run() {
    const nodes = getSelectedNodes()
    if (nodes.length === 0) return
    
    this.acceptUndo(() => {
      // Perform operations here
    })
  }
}
new DoSomethingScript().exec()
```

**Key Points:**
- `@action` decorator configures menu placement and metadata
- `BaseScript` provides `acceptUndo()` for undo/redo support
- Single `run()` method performs the action
- Instantiate and call `.exec()` at module level
- Use helpers from `@dsf/helpers/*` for common operations
- Always wrap state changes in `acceptUndo()`

**Common Helpers:**
```typescript
import { getSelectedNodes, getSelectedFigure } from '@dsf/helpers/scene-helper'
import { getProperties } from '@dsf/helpers/node-helper'
import { progress } from '@dsf/helpers/progress-helper'
import { info, warn, confirm, prompt } from '@dsf/helpers/message-box-helper'
import { unlock, lock } from '@dsf/helpers/property-helper'
```

---

### Pattern 2: Model-Based Scripts with Dialog UI

**Used in:** `paramate/`, `power-menu/`

**Consists of:**
1. **Entry Script** (*.dsa.ts) - Creates model, launches dialog
2. **Model** (paramate-model.ts) - Data structure with Observables
3. **Model Factory** (paramate-model-factory.ts) - Creates and initializes model
4. **Dialog** (paramate-dialog.ts) - Extends BasicDialog
5. **Pane Classes** (parameters-pane.ts, presets-pane.ts) - UI builder components
6. **Services** (presets-service.ts) - Business logic helpers

**Entry Script:**
```typescript
import { action } from '@dsf/core/action-decorator';
import { BaseScript } from '@dsf/core/base-script';
import { PowerMenuModel } from './power-menu/power-menu-model';
import powerMenuScript from './power-menu/power-menu-script';

@action({ text: 'Power Menu', toolbar: 'Vholf3D_PowerMenu', shortcut: 'F24' })
export class PowerMenuScript extends BaseScript {
  protected run(): void {
    let model = new PowerMenuModel()
    model.recentItems$.value = getRecents()
    powerMenuScript(model)
  }
}
new PowerMenuScript().exec()
```

**Model Structure:**
```typescript
import { Observable } from '@dsf/lib/observable';
import { TreeNode } from '@dsf/lib/tree-node';

export class PresetsModel {
  selectedNodeLabel$: Observable<string> = new Observable()
  parametersPresets$: Observable<TreeNode<Preset>[]> = new Observable([])
  selectedPreset$: Observable<Preset> = new Observable()
  presetType$: Observable<PresetType> = new Observable()
}

export class ParamateModel {
  constructor(
    public readonly parameters: ParametersModel,
    public readonly presets: PresetsModel
  ) { }
}
```

**Model Factory:**
```typescript
export const createModel = (figure: DzSkeleton, node: DzNode): ParamateModel => {
  const createParametersModel = (): ParametersModel => {
    let model = new ParametersModel()
    model.node = figure
    model.properties$.value = getProperties(model.node)
    return model
  }

  const createPresetsModel = (): PresetsModel => {
    let model = new PresetsModel()
    model.selectedNodeLabel$.value = figure.getLabel().valueOf()
    return model
  }

  return new ParamateModel(createParametersModel(), createPresetsModel())
}
```

**Dialog:**
```typescript
import { BasicDialog } from '@dsf/dialog/basic-dialog';
import { ParamateModel } from './paramate-model';

export class Dialog extends BasicDialog {
  readonly parameters: ParametersPane
  readonly presets: PresetsPane

  constructor(private model: ParamateModel) {
    super('Dialog Title')
    this.builder.options({ resizable: true })
    this.parameters = new ParametersPane(this.builder)
    this.presets = new PresetsPane(this.builder)
  }

  build() {
    this.dialog.showAcceptButton(false)

    this.add.tab('Parameters').bind(settings.currentTab).build(() => {
      this.parameters.build(this.model.parameters)
    })

    this.add.tab('Presets').bind(settings.currentTab).build(() => {
      this.presets.build(this.model.presets)
    })
  }
}
```

**Pane Component:**
```typescript
import { DialogBuilder } from '@dsf/dialog/builders/dialog-builder'
import { Observable } from '@dsf/lib/observable'
import { PresetsModel, Preset } from '../paramate-model'

export default class PresetsPane {
  private presetName$ = new Observable<string>()
  
  onApply?: (preset: Preset) => void
  onSave?: (name: string, type: PresetType) => void
  onDelete?: (preset: Preset) => void

  constructor(private add: DialogBuilder) { }

  build(model: PresetsModel): this {
    model.selectedPreset$.connect((preset) => {
      this.presetName$.value = preset?.name
    })

    this.add.group('Preset').horizontal().build(() => {
      this.add.edit().value(this.presetName$).focus().build()
      this.add.button('Load').clicked(() => {
        this.onApply?.(model.selectedPreset$.value)
      }).build()
    })

    return this
  }
}
```

---

## 🔄 Observable Pattern (Reactive State)

**Key Concept:** Observables enable reactive UI binding and cross-component communication.

```typescript
import { Observable } from '@dsf/lib/observable'

// Create an observable
const isLoading$ = new Observable<boolean>(false)
const selectedItem$ = new Observable<Item>()

// Subscribe to changes
isLoading$.connect((value) => {
  console.log('Loading state changed:', value)
})

// Set value (propagates to all subscribers)
isLoading$.value = true

// Get value
console.log(isLoading$.value)

// Bind to UI
add.button('Load').enabled(isLoading$).build()
add.edit().value(selectedItem$).build()

// Access observable value (`$` suffix convention)
model.items$.value = newItems
```

**Best Practices:**
- Use `$` suffix for Observable properties: `selectedItem$`, `isLoading$`, `data$`
- Connect subscribers in `build()` methods
- UI components automatically bind to observables
- Use `trigger()` for void observables that signal events

---

## 🎨 Dialog Builder Fluent API

**Pattern:** Chainable builder for creating complex UIs.

```typescript
import { DialogBuilder } from '@dsf/dialog/builders/dialog-builder'

export class Dialog extends BasicDialog {
  constructor() {
    super('Title')
    // this.builder available for building UI
  }

  build() {
    const add = this.add  // shorthand for this.builder

    // Layout containers
    add.horizontal(() => { /* content */ })
    add.vertical(() => { /* content */ })

    // Groups
    add.group('Title').build(() => { /* content */ })

    // Tabs
    add.tab('Tab Name').bind(settings.tabIndex$).build(() => { /* content */ })

    // Form controls
    add.edit()
      .value(observableString$)
      .placeholder('Enter text...')
      .focus()
      .build()

    add.button('Click Me')
      .enabled(isClickable$)
      .clicked(() => { doSomething() })
      .build()

    add.checkbox('Option')
      .value(isChecked$)
      .build()

    add.list.view<Item>()
      .items(items$)
      .columns(['Name', 'Date'], (index, current) => index === 0 ? current * 2 : current)
      .text((item) => [item.name, item.date.toString()])
      .data((item) => item.value)
      .selected(selectedItem$)
      .build()

    // Spacing and layout
    layout.addSpacing(10)
    layout.addStretch()
  }
}
```

---

## 📂 Project Structure Conventions

### File Naming
- **Scripts:** `FeatureName.dsa.ts` (e.g., `delete-keyframes.dsa.ts`)
- **Icons:** `FeatureName.dsa.png` (same name as script)
- **Models:** `domain-model.ts` (e.g., `paramate-model.ts`)
- **Factories:** `domain-model-factory.ts`
- **Dialogs:** `domain-dialog.ts`
- **Panes/Components:** `feature-pane.ts` (e.g., `parameters-pane.ts`)
- **Services:** `feature-service.ts` (e.g., `presets-service.ts`)
- **Settings:** `feature-settings.ts` (persisted observables)

### Directory Structure
```
scripts/projectname/
├── src/
│   ├── Install.dsa.ts              # Auto-generated
│   ├── Uninstall.dsa.ts            # Auto-generated
│   ├── MainScript.dsa.ts           # Entry points (*.dsa.ts)
│   ├── script-model.ts             # Model + Factory
│   ├── script-model-factory.ts
│   ├── script-dialog.ts
│   ├── script-settings.ts          # Persistent observables
│   ├── shared/                     # Project-wide utilities
│   │   ├── common-config.ts
│   │   └── helper-function.ts
│   ├── features/
│   │   ├── feature-pane.ts
│   │   ├── feature-service.ts
│   │   └── feature-settings.ts
│   └── subfeatures/
│       └── sub-feature.ts
├── out/                            # Build output
├── package.json
├── tsconfig.json
└── webpack.config.js
```

---

## 🛠️ Common Helpers Reference

### Scene Helpers
```typescript
import { 
  getSelectedNodes,
  getSelectedFigure,
  getSelectedNumericProperties,
  getSelectedNode
} from '@dsf/helpers/scene-helper'
```

### Node Helpers
```typescript
import {
  getProperties,
  getPropertiesFromSelectedGroup,
  getChildNodes
} from '@dsf/helpers/node-helper'
```

### Property Helpers
```typescript
import {
  unlock,
  lock,
  setPropertyValue,
  getPropertyValue
} from '@dsf/helpers/property-helper'
```

### Message Boxes
```typescript
import {
  info,
  warn,
  error,
  confirm,
  prompt
} from '@dsf/helpers/message-box-helper'
```

### Progress/Logging
```typescript
import { progress } from '@dsf/helpers/progress-helper'
import { log, debug, trace } from '@dsf/common/log'
```

### Menu Helpers
```typescript
import {
  getMainMenuItems,
  getToolsMenuItems,
  getRecents
} from '@dsf/helpers/menu-helper'
```

### File Helpers
```typescript
import {
  readFile,
  writeFile,
  deleteFile,
  fileExists
} from '@dsf/helpers/file-helper'
```

**Note:** Helpers are namespaced under `@dsf/*` via TypeScript path alias in tsconfig.json

---

## 🎯 Best Practices & Patterns

### ✅ DO:

1. **Use TypeScript Classes**
   ```typescript
   class MyFeature extends BaseScript { /* ... */ }
   ```

2. **Declare Observables with $**
   ```typescript
   selectedItem$: Observable<Item> = new Observable()
   ```

3. **Wrap State Changes in acceptUndo()**
   ```typescript
   this.acceptUndo(() => {
     property.setValue(newValue)
   })
   ```

4. **Use Factory Pattern for Complex Models**
   ```typescript
   export const createModel = (data): Model => { /* ... */ }
   ```

5. **Connect Observables in build() Methods**
   ```typescript
   model.selectedItem$.connect((item) => {
     // Respond to changes
   })
   ```

6. **Handle null/undefined Checks**
   ```typescript
   if (!figure?.objectName.toLowerCase().startsWith("genesis")) {
     info("Invalid selection")
     return
   }
   ```

7. **Use Progress Helper for Loops**
   ```typescript
   progress('Processing...', items, (item) => {
     // Process each item, shows progress bar
   })
   ```

8. **Use Service Functions for Reusable Logic**
   ```typescript
   // In presets-service.ts
   export const savePreset = (figure, name, type) => { /* ... */ }
   export const applyPreset = (figure, node, preset) => { /* ... */ }
   ```

### ❌ DON'T:

1. **Don't use console.log() - use log() helper**
   ```typescript
   // ❌ Bad
   console.log('Debug info')
   
   // ✅ Good
   import { debug } from '@dsf/common/log'
   debug('Debug info')
   ```

2. **Don't modify state outside acceptUndo()**
   ```typescript
   // ❌ Bad
   property.setValue(newValue)
   
   // ✅ Good
   this.acceptUndo(() => {
     property.setValue(newValue)
   })
   ```

3. **Don't create Raw DzObjects in Models**
   ```typescript
   // ❌ Bad (creates serialization issues)
   export class MyModel {
     dzNode: DzNode  // Don't store raw DZ objects
   }
   
   // ✅ Good (store references or identifiers)
   export class MyModel {
     nodeName: string
     getNode(): DzNode { /* retrieve */ }
   }
   ```

4. **Don't Forget the `$` Suffix Convention**
   ```typescript
   // ❌ Bad
   selectedItem: Observable<Item>
   
   // ✅ Good
   selectedItem$: Observable<Item>
   ```

5. **Don't Use Complex Logic in build() Methods**
   ```typescript
   // ❌ Bad
   build() {
     for (let i = 0; i < 1000; i++) {
       this.add.button(i.toString()).build()
     }
   }
   
   // ✅ Good
   build() {
     this.add.list.view<Item>()
       .items(this.items$)
       .build()
   }
   ```

6. **Don't Forget to Handle Cancel from Dialogs**
   ```typescript
   const response = prompt('Title', 'Message')
   if (response.cancel) return  // User cancelled
   ```

7. **Prefer spread syntax over `Array.from()` for iterable-to-array conversion**
   ```typescript
   // ❌ Bad
   const items = Array.from(actions)

   // ✅ Good
   const items = [...actions]
   ```

---

## 🔍 Debugging Tips

### Check Script Installation
- Look at generated `Install.dsa.ts` to verify @action metadata was processed
- Run `npm run installer` before `npm run build`

### Test DialogBuilder Output
- Dialogs must return items, not build in-place
- Always chain `.build()` at end
- Use `.visible(observable$)` for conditional UI

### Observable Binding Issues
- Make sure observable is passed, not the value: `value(observable$)` not `value(observable$.value)`
- Connect subscribers before setting values
- Check `$` suffix naming convention

### Type Issues with TreeNode
```typescript
import { TreeNode } from '@dsf/lib/tree-node'

// TreeNode is a hierarchical structure
const treeItems: TreeNode<Item>[] = [
  { name: 'Item 1', value: new Item(), children: [] },
  { name: 'Item 2', value: new Item(), children: [/* nested */] }
]
```

### Settings Persistence
```typescript
import { Observable } from '@dsf/lib/observable'
import { Settings } from '@dsf/lib/settings'

const settings = new Settings('paramate')
export const currentTab = settings.observable('currentTab', 0)  // Key, default value
```

---

## 📦 Dependencies

**Always Available (via @dsf/*):**
- `core/` - action-decorator, base-script, custom-action, global
- `helpers/` - 20+ domain-specific helpers
- `dialog/` - BasicDialog, builders
- `lib/` - Observable, TreeNode, Settings, Dictionary, GUID, etc.
- `common/` - log, trace, dz-dump

**npm packages:**
- TypeScript 5.2
- Webpack 5
- Babel 7
- Commander.js

---

## 🔨 Build & TypeScript Validation

**Important:** Watch mode is NOT automatically running. After making significant changes:

```bash
npm run build
```

This runs the full build pipeline:
- **prebuild** - Regenerates `Install.dsa` from all @action decorators
- **build** - Validates TypeScript and transpiles to ES5 JavaScript
- **postbuild** - Copies `.png` icon files to output

**What it validates:**
- TypeScript compilation errors
- Missing imports or type mismatches
- Decorator syntax
- Icon file availability

**What it does NOT do:**
- Test at runtime in Daz Studio (user handles this)
- Require watch mode to be running

**When to build:**
- After adding new scripts or features
- After modifying type definitions or models
- After refactoring helper usage
- When you see TypeScript errors in the editor
- Before handing off to user for testing

**Do NOT assume watch mode is running.** Always run a build after substantial changes to validate TypeScript compilation and regenerate installation scripts.

---

## ⚡ Workflow Quick Reference

### Adding a New Simple Script
```bash
# 1. Create file in src/scripts/category/
# 2. Write: @action class extends BaseScript
# 3. npm run build  (Install.dsa regenerates)
# 4. Should appear in Daz menu
```

### Adding a New Complex Script (with Dialog)
```bash
# 1. Create Model class (script-model.ts)
# 2. Create Factory (script-model-factory.ts)
# 3. Create Dialog (script-dialog.ts)
# 4. Create Panes (feature-pane.ts)
# 5. Create Entry Script (Script.dsa.ts)
# 6. Create Install/Uninstall scripts
# 7. npm run build
```

### Debugging a Script
```typescript
import { debug } from '@dsf/common/log'

run() {
  debug('Script started')
  const nodes = getSelectedNodes()
  debug(`Found ${nodes.length} nodes`)
}
```

### Testing Observables
```typescript
const data$ = new Observable<string>('initial')
data$.connect(value => console.log('Changed:', value))
data$.value = 'updated'  // Triggers log
```

---

## 🚨 Common Gotchas

1. **Install.dsa.ts is auto-generated** - Don't edit directly, modify source scripts
2. **@action must have text property** - Menu text comes from this
3. **Icons must match script name** - `script.dsa.ts` → `script.dsa.png`
4. **DzNode storage in models causes issues** - Store names, fetch nodes when needed
5. **Observables need $ suffix** - Convention and visibility
6. **acceptUndo() wraps operations** - Outside of it, changes aren't undoable
7. **ES5 target limits features** - No arrow functions in property initializers
8. **Path aliases (@dsf/*) work in TypeScript** - They're resolved at build time
9. **npm run prebuild runs first** - Generates Install.dsa before build
10. **Tab binding uses numeric indices** - PresetType enum often matches tab order

