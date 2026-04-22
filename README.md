# DazScript Framework

> ⚠️ This framework is under active development. The API may still evolve between releases. If you need a stable long-term surface, wait for `v1.0`.

The **DazScript Framework** is a TypeScript-based framework for writing Daz Studio scripts. It provides all the advantages of a typed language such as autocompletion, error checking, and method parameter documentation and hinting. The framework also includes a set of dialog helpers for rapid UI development.

## Benefits

- **Autocompletion:** Take advantage of IDE autocompletion for faster and more efficient script development.
- **Error Checking:** Catch potential errors early in the development process with TypeScript's static analysis.
- **Method Documentation & Hinting:** Get contextual documentation and hints for methods, classes, and parameters.

## Features

- TypeScript support with full IntelliSense.
- A lightweight `action(...)` entrypoint plus helper methods for building interactive scripts.
- A generated setup dialog for installing, updating, and removing custom action registrations.
- Setup generation is fully automated from `action(...)` metadata, including menu path, toolbar, shortcut, description, grouping, icons, and bundle-based setup outputs.
- Easy integration with Daz Studio for quick script deployment.

## Installation

To install the **DazScript Framework**, run the following command:

```bash
npm install dazscript-framework dazscript-types
```

## Setup

After installing the package, scaffold the project files:

```bash
npx dazscript init
```

If `--app-data-path` is not provided, `init` prompts for the AppData author namespace up front and uses the current folder name as the default product segment.

This generates:

- `dazscript.config.ts`
- `tsconfig.json`
- `package.json` script wiring for `build`, `watch`, `icons`, and `installer`

The generated package scripts use the framework CLI directly, so consumer projects do not need their own webpack or Babel setup.

You can customize the generated defaults:

```bash
npx dazscript init --menu-path /MyScripts --scripts-path ./src --out-dir ./out --app-data-path YourName/my-project
```

- `--menu-path` sets which Daz Studio menu the scripts are added to by default. See [The `action(...)` Entrypoint](#the-action-entrypoint) for how a script can override that with `menuPath`.
- `--scripts-path` tells the installer generator where to scan for runnable `.dsa.ts` entry files.
- `--out-dir` sets the webpack build output directory for generated `.dsa` files and copied icons.
- `--app-data-path` sets the AppData namespace used by launcher fallback resolution. Use a unique `Author/Product` path.

Use `--scripts-path ./src/scripts` for projects shaped like `scripts/common`, where runnable `.dsa.ts` files live under `src/scripts/`. Use `--scripts-path ./src` for packages shaped like `scripts/power-menu`, where runnable `.dsa.ts` files live at the source root.

Set `appDataPath` explicitly in `dazscript.config.ts` for every project. It is required for builds that generate launcher shims:

```typescript
import { defineConfig } from 'dazscript-framework/config';

export default defineConfig({
  scriptsPath: './src',
  outDir: './out',
  defaultMenuPath: '/MyScripts',
  appDataPath: 'YourName/my-project',
  bundleName: 'My Project',
});
```

`bundleName` is optional display metadata for generated setup dialogs. If omitted, the dialog falls back to `Setup Scripts`. `dazscript init` now scaffolds it automatically from the project folder name.

Built action outputs now use stable launcher shims by default:

- `out/<script>.dsa` is the stable launcher registered with Daz Studio menus, toolbars, and shortcuts
- `out/<folder>/lib/<script-name>/script.dsa` is the current implementation bundle that the launcher executes

Rebuilding updates the implementation bundle under the shim's sibling `lib/` folder. At runtime, each launcher checks that local `lib/` path first and falls back to `App.getAppDataPath()/...` second. Because the registered launcher path stays stable, action updates normally do not require reinstalling the action in Daz Studio.

## Usage

### Quick Start: Hello World

Create a simple script that logs to the console:

```typescript
import { debug } from '@dsf/common/log';
import { action } from '@dsf/core/action';
import { info } from '@dsf/helpers/message-box-helper';

action({ text: 'Hello World' }, () => {
    debug('Hello World!');
    info('Hello World!');
});
```

### The `action(...)` Entrypoint

Use `action(...)` at module scope to define how a runnable `.dsa.ts` file should appear in Daz Studio and what it should execute.

```typescript
action({
  text: 'Hello World',
  menuPath: '#{defaultMenuPath}/Examples',
  shortcut: 'CTRL+SHIFT+H',
  toolbar: 'MyToolbar',
  group: 'Examples',
  description: 'Runs the Hello World script',
}, () => {
    info('Hello World!');
});
```

`action(...)` also accepts a reusable class with a `run()` method:

```typescript
class HelloWorldScript {
    run(): void {
        info('Hello World!');
    }
}

action({ text: 'Hello World' }, HelloWorldScript);
```

Common `action(...)` parameters:

- `text`: the label shown for the script in Daz Studio.
- `menuPath`: the menu path where the script should be added. Set it to `false` to skip adding the script to a menu. If omitted, the default menu from `--menu-path` is used.
- `shortcut`: the keyboard shortcut for the action.
- `toolbar`: the toolbar name used when the action should appear on a toolbar.
- `group`: an optional grouping label used by Daz Studio for related actions.
- `description`: a longer description for the action.
- `bundle`: generates an additional setup script next to the action file. Use `true` for `Setup.dsa.ts` or a string for `Setup <bundle>.dsa.ts`.

When an action is built, the framework emits two files for it:

- the stable launcher at the original output path
- the implementation bundle under a sibling `lib/<script-name>/script.dsa` path

Generated installers register the launcher path, so menu placement, toolbars, shortcuts, and icons keep pointing at a stable target across rebuilds.

If the local `lib/` implementation is missing, the launcher falls back to the configured `appDataPath`. Builds now require this value and validate it as a unique `Author/Product` style path.

### Generated Setup Script

Running `npm run installer` generates `src/Setup.dsa.ts` for the project.

This flow is completely automated. The installer generator scans runnable `.dsa.ts` entry files, reads the top-level `action(...)` call, and derives the setup dialog rows and registration behavior directly from that metadata. In practice, the menu path, toolbar target, shortcut, description, grouping, icon usage, and bundle-specific setup outputs all come from the action definition rather than from separate installer code you have to maintain by hand.

The generated setup script:

- Scans all runnable top-level `.dsa.ts` files under `scriptsPath`
- Reads `action(...)` metadata directly from the source
- Normalizes default menu paths relative to `defaultMenuPath`
- Derives action labels, descriptions, shortcuts, toolbar targets, grouping, and icons from the action definition
- Writes one searchable setup entry per discovered action
- Uses `appDataPath/Installer` as the installer settings namespace
- Passes `bundleName` through so the dialog title can be project-specific

The setup dialog initializes from the current Daz Studio install state rather than assuming a clean install. It checks which actions are already installed, which ones are present in menus or toolbars, and what shortcut is currently assigned.

Current setup dialog behavior:

- Shows an install checkbox plus the columns `Action`, `Shortcut`, `Description`, `Menu`, and `Toolbar`
- Includes a search box that filters by action name, shortcut, description, menu path, and toolbar
- Supports `Select All` and `Deselect All` for the currently visible rows
- Lets the user right-click an action to set a shortcut or reset it to the default shortcut
- Shows shortcut overrides with an `[ovr]` marker
- Displays the configured toolbar name directly instead of a generic yes/no flag
- Uses the configured `bundleName` in the window title when available

Applying the setup dialog does both install and cleanup work:

- Selected rows are installed or updated through the framework custom action helpers
- Unselected rows are removed from supported menu and toolbar targets
- Affected toolbars are rebuilt after removal so remaining selected actions stay grouped correctly
- Empty toolbars created by the framework are cleaned up automatically

The generated project-level setup file replaces the older generated `Install.dsa.ts` and `Uninstall.dsa.ts` flow. The installer generator now removes those legacy files if they still exist.

### Action-Level Bundles

The `bundle` property on `action(...)` is separate from project `bundleName`.

- `bundleName` in `dazscript.config.ts` is project metadata used for the setup dialog title
- `bundle` in an action definition changes installer generation behavior for that action

When `bundle` is set on an action, the installer generator also writes a setup script beside that action:

- `bundle: true` writes `Setup.dsa.ts`
- `bundle: 'Utilities'` writes `Setup Utilities.dsa.ts`

Those bundle-generated setup files use the same setup dialog helper and now also receive the project `bundleName`.

### Building UIs with Observables & Dialogs

The framework uses a **Model-View pattern** with reactive data bindings:

#### 1. Define Your Model

```typescript
import { BasicDialog } from '@dsf/dialog/basic-dialog';
import { Observable } from '@dsf/lib/observable';
import { AppSettings } from '@dsf/lib/settings';

// Model extends AppSettings for automatic persistence
export class MyDialogModel extends AppSettings {
    constructor() {
        super('MyAuthor/MyDialog'); // Namespace for saved settings
    }

    selectedNode$ = new Observable<DzNode>();
    nodeLabel$ = new Observable<string>();
}
```

#### 2. Build Your Dialog

```typescript
import { BasicDialog } from '@dsf/dialog/basic-dialog';
import { MyDialogModel } from './my-dialog-model';

export class MyDialog extends BasicDialog {
    constructor(private readonly model: MyDialogModel) {
        super('My Dialog');
    }

    protected build(): void {
        const add = this.add;  // Fluent builder API
        const model = this.model;

        add.group('Node Properties').build(() => {
            add.label('Label:');
            add.edit().value(model.nodeLabel$);  // Two-way binding
        });
    }
}
```

#### 3. Connect & Use in Your Script

```typescript
import { action } from '@dsf/core/action';
import { getSelectedNode } from '@dsf/helpers/scene-helper';
import { MyDialog, MyDialogModel } from './my-dialog';

action({ text: 'My Dialog Script' }, () => {
        const model = new MyDialogModel();
        const selectedNode = getSelectedNode();

        if (!selectedNode) {
            console.error('Please select a node');
            return;
        }

        // Set initial model values
        model.selectedNode$.value = selectedNode;
        model.nodeLabel$.value = selectedNode.getLabel();

        // React to model changes (two-way binding)
        model.nodeLabel$.connect((label) => {
            selectedNode.setLabel(label);
        });

        // Build and show dialog
        const dialog = new MyDialog(model);
        if (dialog.run()) {
            console.log('Dialog accepted');
        } else {
            console.log('Dialog cancelled');
        }
});
```

### Core Concepts

#### Observables (`Observable<T>`)

Reactive state management with change notifications:

```typescript
const name = new Observable<string>('John');

// Subscribe to changes
name.connect((value) => console.log(`Name: ${value}`));

// Set value (triggers callbacks)
name.value = 'Jane';  // Logs: "Name: Jane"

// Intercept/validate before change
name.intercept(
    (prev, current) => current.toUpperCase()  // Transform
);

// Pause/resume notifications
name.pause(() => {
    name.value = 'A';
    name.value = 'B';  // Won't trigger callbacks
});
```

#### Available Helpers

The framework includes 29 helper modules for common Daz Studio tasks:

- **Scene**: `getRoot()`, `getSelectedNode()`, `getNodes()`, scene modification
- **Nodes**: Type checking (figure, bone, etc.), transforms, visibility, selection
- **Properties**: Finding, adjusting, interpolating property values
- **Dialogs**: `BasicDialog`, `InputDialog`, `SelectionDialog`
- **Arrays**: `distinct()`, `flatten()`, `groupBy()`, unique operations
- **Strings**: Upper/lowercase, trimming, splitting
- **Files & Paths**: Reading, writing, directory operations
- **UI Helpers**: Message boxes, progress dialogs, menus, keyboard shortcuts

Example:

```typescript
import * as SceneHelper from '@dsf/helpers/scene-helper';
import * as NodeHelper from '@dsf/helpers/node-helper';
import * as ArrayHelper from '@dsf/helpers/array-helper';

const allNodes = SceneHelper.getNodes();
const figures = allNodes.filter(n => NodeHelper.isFigure(n));
const unique = ArrayHelper.distinct(figures);
```

#### Builder Pattern for UIs

Fluent, chainable API for rapid dialog construction:

```typescript
add.tab('Settings').build(() => {
    add.group('Colors').build(() => {
        add.colorPicker().value(colorObservable);
        add.label('Opacity:');
        add.slider(0, 100).value(opacityObservable);
    });

    add.horizontal((layout) => {
        add.label('Name:');
        add.edit().value(nameObservable);
    });

    add.listView()
        .items(itemsObservable)
        .value(selectedItemObservable)
        .changed((item) => console.log(`Selected: ${item}`));
});
```

Supported widgets:
- Basic: Label, Edit (text input), Button, Checkbox, Radio
- Selection: ComboBox, ListBox, Slider, ColorPicker
- Layout: Tab, Group, Horizontal, Vertical, Splitter
- Advanced: ListView, TreeView, Popup Menu

### Two-Way Data Binding

The power of this framework is reactive data binding between models and UI:

```typescript
// User types in UI → updates model → triggers logic
model.nodeLabel$ = new Observable<string>();

model.nodeLabel$.connect((newLabel) => {
    // React to UI changes
    selectedNode.setLabel(newLabel);
});

// Code updates model → UI automatically reflects
model.nodeLabel$.value = 'New Label';  // UI edit box updates
```

This eliminates the need for manual synchronization between UI and data.

### Directory Structure

For a typical project using this framework:

```
my-daz-scripts/
├── src/
│   ├── scripts/
│   │   ├── my-first-script.dsa.ts
│   │   ├── my-dialog-model.ts
│   │   ├── my-dialog.ts
│   │   └── my-dialog-script.dsa.ts
│   └── config.ts
├── out/                    # Generated launchers, implementations, and copied icons
├── package.json
├── tsconfig.json
└── dazscript.config.ts
```

**Key points:**
- Scripts ending in `.dsa.ts` compile to `.dsa` files for Daz Studio
- Regular `.ts` files are utility, model, or helper classes
- Built action outputs are split into stable launchers plus sibling `lib/<script-name>/script.dsa` implementations
- Run `npm run build` to compile TypeScript → Daz Scripts
- Run `npm run watch` during development for live rebuild
- Rebuild after script changes; reinstalling Daz actions is usually not required because the launcher path stays stable

## Development & Publishing

This project uses **semantic-release** for automatic versioning and npm publishing.

### Commit Message Conventions

Use conventional commit messages to control version bumping:

- **`fix: description`** → Patch version bump (`x.y.z` → `x.y.(z+1)`)
  - Bug fixes, patches, or minor improvements
  - Example: `fix: resolve dialog builder layout issue`

- **`feat: description`** → Minor version bump (`x.y.z` → `x.(y+1).0`)
  - New features or significant enhancements
  - Example: `feat: add tree view builder component`

- **`BREAKING CHANGE: description`** → Major version bump (`x.y.z` → `(x+1).0.0`)
  - Add to commit body for breaking changes
  - Example: `feat: refactor action decorator API\n\nBREAKING CHANGE: action() now requires explicit menu path`

- **No prefix** → No version bump
  - Documentation, style, or non-publishing changes
  - Example: `update README examples`

### Publishing

Every push to the `master` branch automatically triggers:

1. **Analyze** commit messages since last release
2. **Update** version in `package.json`
3. **Build** the project (`npm run build`)
4. **Create** a GitHub release with changelog
5. **Publish** to npm

No manual steps required—just commit with proper conventions and push!
