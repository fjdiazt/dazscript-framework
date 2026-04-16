# DazScript Framework

> ⚠️ **EARLY VERSION** — This framework is in active development (v0.1.15). The API is not yet stable and may change between releases. Not recommended for production use until v1.0 is released.

The **DazScript Framework** is a TypeScript-based framework for writing Daz Studio scripts. It provides all the advantages of a typed language such as autocompletion, error checking, and method parameter documentation and hinting. The framework also includes a set of dialog helpers for rapid UI development.

## Benefits

- **Autocompletion:** Take advantage of IDE autocompletion for faster and more efficient script development.
- **Error Checking:** Catch potential errors early in the development process with TypeScript's static analysis.
- **Method Documentation & Hinting:** Get contextual documentation and hints for methods, classes, and parameters.

## Features

- TypeScript support with full IntelliSense.
- A powerful set of decorators and helper methods for building interactive scripts.
- Easy integration with Daz Studio for quick script deployment.

## Installation

To install the **DazScript Framework**, run the following command:

```bash
npm install dazscript-framework
```

## Setup

After installing the package, you will need to configure a few files for your project.

1. **babel.config.js**

   Create the file and add the following content:

   ```javascript
   const sharedBabelConfig = require('dazscript-framework/babel');

   module.exports = {
     ...sharedBabelConfig,
     presets: [...sharedBabelConfig.presets],
     plugins: [...sharedBabelConfig.plugins],
   };
   ```

2. **package.json**

   Add the following scripts to your package.json:

   ```json
   "scripts": {
       "prebuild": "npm run installer",
       "build": "webpack --env outputPath=./out",
       "postbuild": "npm run icons",
       "watch": "webpack --env outputPath=./out --watch",
       "icons": "copyfiles -u 1 src/**/*.png out/",
       "installer": "node ./node_modules/dazscript-framework/dist/scripts/install-generator.js -p ./src/scripts -m /MyScripts"
   }
   ```

3. **tsconfig.json**

   Create the file and add the following content:

   ```json
   {
     "extends": "./node_modules/dazscript-framework/tsconfig.json",
     "compilerOptions": {
       "baseUrl": "./",
       "paths": {
         "shared/*": ["src/shared/*"],
         "@dst/*": ["node_modules/dazscript-types/*"],
         "@dsf/*": ["node_modules/dazscript-framework/src/*"]
       }
     },
     "include": ["node_modules/dazscript-types/**/*", "src/**/*"]
   }
   ```

4. **webpack.config.js**
   Create the file and add the following content:

   ```javascript
   const sharedWebpackConfig = require('dazscript-framework/webpack');

   module.exports = (env, argv) => {
     const sharedConfig = sharedWebpackConfig(env, argv);

     return {
       ...sharedConfig,
       // You can override or add more customizations here if needed
     };
   };
   ```

## Usage

### Quick Start: Hello World

Create a simple script that logs to the console:

```typescript
import { debug } from '@dsf/common/log';
import { action } from '@dsf/core/action-decorator';
import { BaseScript } from '@dsf/core/base-script';
import { info } from '@dsf/helpers/message-box-helper';

@action({ text: 'Hello World' })
class HelloWorldScript extends BaseScript {
    protected run(): void {
        debug('Hello World!');
        info('Hello World!');
    }
}

new HelloWorldScript().exec();
```

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
import { action } from '@dsf/core/action-decorator';
import { BaseScript } from '@dsf/core/base-script';
import { getSelectedNode } from '@dsf/helpers/scene-helper';
import { MyDialog, MyDialogModel } from './my-dialog';

@action({ text: 'My Dialog Script' })
class MyDialogScript extends BaseScript {
    protected run(): void {
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
    }
}

new MyDialogScript().exec();
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
├── out/                    # Generated .dsa files (build output)
├── package.json
├── tsconfig.json
├── webpack.config.js
└── babel.config.js
```

**Key points:**
- Scripts ending in `.dsa.ts` compile to `.dsa` files for Daz Studio
- Regular `.ts` files are utility, model, or helper classes
- Run `npm run build` to compile TypeScript → Daz Scripts
- Run `npm run watch` during development for live rebuild

## Development & Publishing

This project uses **semantic-release** for automatic versioning and npm publishing.

### Commit Message Conventions

Use conventional commit messages to control version bumping:

- **`fix: description`** → Patch version bump (0.1.15 → 0.1.16)
  - Bug fixes, patches, or minor improvements
  - Example: `fix: resolve dialog builder layout issue`

- **`feat: description`** → Minor version bump (0.1.15 → 0.2.0)
  - New features or significant enhancements
  - Example: `feat: add tree view builder component`

- **`BREAKING CHANGE: description`** → Major version bump (0.1.15 → 1.0.0)
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
