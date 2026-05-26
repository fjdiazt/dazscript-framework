# DazScript Framework

**DazScript Framework** is a TypeScript toolkit for writing [Daz Studio](https://www.daz3d.com/daz-studio) scripts. It layers a full TypeScript development experience on top of [DAZ Script](https://docs.daz3d.com/public/software/dazstudio/4/referenceguide/scripting/start) (Qt Script / ECMAScript 5.1), and ships a fluent dialog builder so you can build UIs in code without touching the Qt widget API directly.

## Table of Contents

- [Why use it?](#why-use-it)
- [Quick Start: Hello World](#quick-start-hello-world)
- [Quick Start: A Simple Dialog](#quick-start-a-simple-dialog)
- [Documentation](#documentation)
  - [Installation & Setup](#installation--setup)
  - [Unit Tests](#unit-tests)
  - [DAZ Studio Integration Tests](#daz-studio-integration-tests)
  - [Project Configuration](#project-configuration)
  - [The `action(...)` Entrypoint](#the-action-entrypoint)
  - [Build Output: Launcher Shims](#build-output-launcher-shims)
  - [Generated Setup Script](#generated-setup-script)
  - [Setup Keyboard Shortcuts](#setup-keyboard-shortcuts)
  - [Action-Level Bundles](#action-level-bundles)
  - [Building UIs: Dialogs & Observables](#building-uis-dialogs--observables)
  - [Observables](#observables)
  - [Dialog Builder Reference](#dialog-builder-reference)
  - [Available Helpers](#available-helpers)
  - [Directory Structure](#directory-structure)
  - [Development & Publishing](#development--publishing)
- [Resources](#resources)
- [Examples](#examples)

## Why use it?

DAZ Script gives you direct access to the entire Daz Studio API. The DazScript Framework builds on that foundation and adds:

- **TypeScript everywhere** — full autocompletion and type checking for every Daz Studio API, your own models, and every helper in the framework.
- **Fast UI development** — a fluent builder API lets you describe dialogs declaratively without touching the Qt widget API by hand.
- **Two-way data binding** — link your data model to UI controls so they stay in sync automatically. The user types in a field and your model updates; you update the model in code and the UI reflects it instantly. No manual synchronization needed.
- **One-command build** — `npm run build` compiles TypeScript to `.dsa` files that Daz Studio runs directly.
- **Stable launcher shims** — built scripts use a launcher/implementation layout so iterating on your code never requires reinstalling actions in Daz Studio.
- **Automated installer generation** — `npm run installer` produces a full setup dialog by reading action metadata from your source code.

---

## Quick Start: Hello World

A script that shows a message box in Daz Studio.

### 1. Install

```bash
npm install dazscript-framework dazscript-types
```

### 2. Scaffold the project

```bash
npx dazscript init
```

Follow the prompt for your AppData author namespace (e.g. `YourName/my-project`). This creates `dazscript.config.ts`, `tsconfig.json`, and wires the `build`, `build:encrypted`, `build:release`, `watch`, `encrypt`, `icons`, and `installer` scripts into `package.json`.

To include optional test scaffolds, run one or both:

```bash
npx dazscript init --unit-tests
npx dazscript init --integration-tests
```

### 3. Write the script

Create `src/hello-world.dsa.ts`:

```typescript
import { action } from '@dsf/core/action';
import { info } from '@dsf/helpers/message-box-helper';

action({ text: 'Hello World' }, () => {
    info('Hello World!');
});
```

Files ending in `.dsa.ts` are compiled as runnable Daz Studio entry points.

### 4. Build

```bash
npm run build
```

Output lands in `./out/`.

### 5. Load in Daz Studio

**Option A — Copy:** copy the `out/` folder into your Daz Studio scripts directory.

**Option B — Symlink** (recommended for development, re-runs pick up the latest build automatically):

```bash
# Windows — run as Administrator
mklink /D "C:\Users\[Username]\Documents\DAZ 3D\Studio\My Library\Scripts\MyScripts" "C:\path\to\project\out"

# macOS
ln -s /path/to/project/out ~/Documents/DAZ\ 3D/Studio/My\ Library/Scripts/MyScripts
```

Then in Daz Studio: **Scripts > MyScripts > Hello World**. A message box appears.

---

## Quick Start: A Simple Dialog

A dialog with a name input and an OK/Cancel button pair.

```typescript
import { action } from '@dsf/core/action';
import { BasicDialog } from '@dsf/dialog/basic-dialog';
import { Observable } from '@dsf/lib/observable';
import { info } from '@dsf/helpers/message-box-helper';

// The model holds state
class GreetModel {
    name$ = new Observable<string>('World');
}

// The dialog describes the UI
class GreetDialog extends BasicDialog {
    constructor(private model: GreetModel) {
        super('Greet');
    }

    protected build(): void {
        this.add.label('Enter your name:');
        this.add.edit().value(this.model.name$);
        this.add.button('Say Hello').clicked(() => this.dialog.accept());
    }
}

action({ text: 'Greet Dialog' }, () => {
    const model = new GreetModel();
    const dialog = new GreetDialog(model);

    if (dialog.ok()) {
        info(`Hello, ${model.name$.value}!`);
    }
});
```

`add.edit().value(observable)` creates a two-way binding: typing in the field updates `name$.value`, and assigning `name$.value` in code updates the field.

---

## Documentation

### Installation & Setup

Install the framework and its peer dependency:

```bash
npm install dazscript-framework dazscript-types
```

Scaffold a new project:

```bash
npx dazscript init
```

If `--app-data-path` is not provided, `init` prompts for the AppData author namespace and uses the current folder name as the product segment.

This generates:
- `dazscript.config.ts`
- `tsconfig.json`
- `package.json` script wiring for `build`, `build:encrypted`, `watch`, `encrypt`, `icons`, and `installer`
- `build:release` uses `--log-level warn` before encryption so release packages suppress debug and trace output

Available `init` flags:

```bash
npx dazscript init --menu-path /MyScripts --scripts-path ./src --out-dir ./out --app-data-path YourName/my-project
npx dazscript init --unit-tests --app-data-path YourName/my-project
npx dazscript init --integration-tests --app-data-path YourName/my-project
```

| Flag | Description |
|---|---|
| `--menu-path` | Default menu where scripts appear in Daz Studio |
| `--scripts-path` | Where the generator scans for runnable `.dsa.ts` entry files |
| `--out-dir` | Where `build` writes `.dsa` files and copies icons |
| `--app-data-path` | AppData namespace for launcher fallback (`Author/Product` format) |
| `--unit-tests` | Add Vitest config, sample unit test, unit-test docs, `test` scripts, and the `vitest` dev dependency |
| `--integration-tests` | Add a DAZ Studio headless integration-test fixture, env examples, ignore entries, and `test:integration` script |

Builds also accept `--log-level <trace|debug|info|warn|error|off>`. This sets the minimum runtime log level for the compiled scripts. When omitted, builds default to `debug`; use `warn` for release packages.

Use `--scripts-path ./src/scripts` when runnable files live under a subfolder; use `--scripts-path ./src` when they are at the source root.

### Unit tests

Projects can bootstrap fast Node-side TypeScript tests with:

```bash
npx dazscript init --unit-tests
```

This adds:

- `vitest.config.ts`
- `tsconfig.test.json`
- `test/unit/smoke.test.ts`
- `test/unit/README.md`
- `npm test`
- `npm run test:watch`
- `vitest` as a dev dependency

Use unit tests for pure TypeScript helpers, parsing, normalization, and code that does not need Daz Studio runtime objects.

### DAZ Studio integration tests

Projects can run real DAZ Studio smoke tests through the published CLI:

```bash
npm run test:integration
```

The generated script calls `dazscript integration --fixture ./test/integration/fixtures/<project>-smoke.dsa.ts`. Configure local machine paths in an ignored `.env.integration.local`; `DAZ_STUDIO_EXE` is always required, and `DAZ_TEST_CONTENT_DUF` is required only for tests that use `--require-content`. See `test/integration/README.md` in this repository for maintainer and consuming-project details.

---

### Project Configuration

`dazscript.config.ts` is the single configuration file for a project:

```typescript
import { defineConfig } from 'dazscript-framework/config';

export default defineConfig({
    scriptsPath: './src',
    outDir: './out',
    defaultMenuPath: '/MyScripts',
    appDataPath: 'YourName/my-project',  // required
    bundleName: 'My Project',            // optional — used in the setup dialog title
});
```

`appDataPath` is required for builds that generate launcher shims and must be unique across your projects.

---

### The `action(...)` Entrypoint

Every runnable `.dsa.ts` file calls `action(...)` at module scope. This defines how the script registers in Daz Studio and what it executes.

```typescript
action({
    text: 'My Script',
    menuPath: '#{defaultMenuPath}/Tools',
    shortcut: 'CTRL+SHIFT+M',
    toolbar: 'MyToolbar',
    group: 'Tools',
    description: 'Does something useful',
}, () => {
    info('Running!');
});
```

`action(...)` also accepts a class with a `run()` method:

```typescript
class MyScript {
    run(): void {
        info('Running!');
    }
}

action({ text: 'My Script' }, MyScript);
```

| Parameter | Description |
|---|---|
| `text` | Label shown in Daz Studio |
| `menuPath` | Menu path where the action is registered. Set to `false` to skip. Defaults to `defaultMenuPath` from config. |
| `shortcut` | Keyboard shortcut (e.g. `CTRL+SHIFT+H`) |
| `toolbar` | Toolbar name the action should appear on |
| `group` | Grouping label for related actions in Daz Studio |
| `description` | Longer description for the action |
| `icon` | Image path used for the installed custom action. Overrides discovered icon files. |
| `bundle` | Generates a setup script beside the action. `true` → `Setup.dsa.ts`, a string → `Setup <name>.dsa.ts` |

---

### Build Output: Launcher Shims

Each built action produces two files:

- `out/<script>.dsa` — the stable **launcher** registered with Daz Studio (menus, toolbars, shortcuts)
- `out/<folder>/lib/<script-name>/<script-name>.dsa` — the **implementation bundle** the launcher executes

When you rebuild, only the implementation bundle changes. The launcher path stays stable, so re-registering the action in Daz Studio is normally not required.

At runtime the launcher looks for a local encrypted `script.dse` bundle first, then the local `script.dsa` bundle, then the same encrypted/plain fallback paths under `App.getAppDataPath()/<appDataPath>`.

To encrypt implementation bundles before packaging, run the build and then call Daz Studio through the framework CLI:

```bash
npx dazscript encrypt --out-dir ./out --daz-studio "C:/Program Files/DAZ 3D/DAZStudio4/DAZStudio.exe"
```

The `encrypt` command launches Daz Studio with `-headless -noPrompt`, converts each implementation bundle under `out/**/lib/**/*.dsa` to a matching `.dse` file, and deletes the source `.dsa` after the matching encrypted file is written. Add `--keep-source` to leave the plain implementation bundles in place.

Individual script packages can wrap this command in `package.json` scripts such as `npm run encrypt` or `npm run build:encrypted` so release packaging does not depend on remembering the full Daz Studio executable argument.

---

### Generated Setup Script

```bash
npm run installer
```

This scans all `.dsa.ts` entry files, reads each top-level `action(...)` call, and generates `src/Setup.dsa.ts` automatically. No installer code to maintain by hand.

The generated setup dialog:

- Shows an install checkbox per action with columns for Action, Shortcut, Description, Menu, and Toolbar
- Adds a `Keyboard Shortcuts` tab when a project defines shortcut JSON
- Includes a search box that filters across all columns
- Supports Select All / Deselect All on the visible rows
- Lets the user right-click to set or reset a shortcut (overrides shown with `[ovr]`)
- Initializes from the current Daz Studio install state — already-installed actions show as checked
- Uses `bundleName` from `dazscript.config.ts` in the window title

Applying the dialog:
- Checked rows are installed or updated
- Unchecked rows are removed from their menu and toolbar targets
- Affected toolbars are rebuilt; empty framework-created toolbars are removed
- Selected keyboard shortcut rows are applied after actions are installed

Custom action icons are selected from `action(...)` metadata and sibling image files in this order:

1. Explicit `action({ icon: '...' })`
2. `scriptname.action.png`
3. `scriptname.png`
4. `scriptname.dsa.png` legacy fallback

`scriptname.action.png` is the installed custom action icon. Daz Studio uses the same action icon for menu and toolbar placements. `scriptname.png` is the preferred script/content icon fallback. `scriptname.dsa.png` is a legacy fallback kept for older projects and will be removed in a future breaking release.

Setup dialog header assets are optional and are discovered beside `src/Setup.dsa.ts`:

1. `src/Setup.header.png`
2. `src/Setup.tip.png`
3. `src/Setup.png`
4. `src/Setup.dsa.png` legacy fallback

Header text can be placed in `src/Setup.header.html`, `src/Setup.header.md`, or `src/Setup.header.txt`, with `src/Setup.html`, `src/Setup.md`, and `src/Setup.txt` as script-named fallbacks. The installer generator embeds that text into `Setup.dsa.ts`, so Daz Studio does not need to read the text file at setup time. The setup dialog renders the header body with `DzTextBrowser` rich text support; no Markdown conversion is performed. The image remains a deployed PNG asset and is resolved relative to the generated setup script at runtime.

The same layout is available to custom dialogs through `add.header({ imagePath, html, text, height, imageWidth }).build()`. Use `html` for rich text, or `text` for escaped plain text.

This replaces the older `Install.dsa.ts` / `Uninstall.dsa.ts` pattern. The installer generator removes those legacy files if they exist.

### Setup Keyboard Shortcuts

Projects can define keyboard shortcuts for both framework custom actions and built-in Daz Studio actions. The installer generator looks for shortcut JSON in this order:

- `keyboardShortcutsPath`, `shortcutsPath`, or `actionAcceleratorsPath` in `dazscript.config.ts`
- `src/keyboard-shortcuts.json`
- `src/action-accelerators.json`
- `keyboard-shortcuts.json`
- `action-accelerators.json`

The JSON can be an array or an object containing `actions`, `shortcuts`, or `accelerators`. Each entry can use the Action Accelerator Finder style fields:

```json
[
  {
    "name": "DzRenderAction",
    "text": "Render",
    "shortcut": "CTRL+R"
  }
]
```

Accepted shortcut fields are `shortcut`, `accelerator`, or `key`. Accepted action-name fields are `name` or `action`.

At build time the JSON is embedded into generated `Setup.dsa.ts`; Daz Studio does not need to read the original JSON file at setup time. During setup, the `Keyboard Shortcuts` tab shows the action label, current shortcut, new shortcut, action type, and conflicts. The user chooses which shortcut rows to apply.

Before changing a non-custom Daz Studio action shortcut, setup writes the original value to:

```text
App.getAppDataPath()/<appDataPath>/Installer/keyboard-shortcuts-backup.json
```

Shortcut setup is part of the generated setup dialog. The generator does not create a separate shortcut-only uninstall script.

---

### Action-Level Bundles

The `bundle` property on `action(...)` is separate from the project-level `bundleName` in config.

When `bundle` is set, the installer generator also writes a setup script beside that action:

- `bundle: true` → writes `Setup.dsa.ts`
- `bundle: 'Utilities'` → writes `Setup Utilities.dsa.ts`

Those bundle-scoped setup files use the same setup dialog helper and also receive the project `bundleName`.

---

### Building UIs: Dialogs & Observables

The framework uses a **Model-View pattern** with reactive bindings.

#### 1. Define a model

```typescript
import { AppSettings } from '@dsf/lib/settings';
import { Observable } from '@dsf/lib/observable';

// AppSettings adds automatic persistence under the given namespace
class MyModel extends AppSettings {
    constructor() {
        super('YourName/MyDialog');
    }

    name$    = new Observable<string>();
    enabled$ = new Observable<boolean>(false);
}
```

#### 2. Build the dialog

```typescript
import { BasicDialog } from '@dsf/dialog/basic-dialog';

class MyDialog extends BasicDialog {
    constructor(private readonly model: MyModel) {
        super('My Dialog');
    }

    protected build(): void {
        const { add, model } = this;

        add.group('Settings').build(() => {
            add.label('Name:');
            add.edit().value(model.name$);

            add.checkbox('Enabled').value(model.enabled$);
        });
    }
}
```

#### 3. Show it from a script

```typescript
action({ text: 'My Dialog Script' }, () => {
    const model = new MyModel();
    const dialog = new MyDialog(model);

    if (dialog.ok()) {
        // model.name$.value holds whatever the user typed
    }
});
```

---

### Observables

`Observable<T>` is lightweight reactive state. Controls bound with `.value(observable)` stay in sync automatically.

```typescript
const name$ = new Observable<string>('initial');

// Subscribe to changes
name$.connect((value) => console.log(value));

// Set value — fires all subscribers
name$.value = 'updated';

// Transform values before they are applied
name$.intercept((prev, next) => next.trim());

// Batch updates without firing subscribers mid-batch
name$.pause(() => {
    name$.value = 'a';
    name$.value = 'b';  // only 'b' fires after the pause block
});
```

---

### Dialog Builder Reference

Use `this.add` inside `build()` to construct the UI declaratively.

**Widgets**

| Builder | Description |
|---|---|
| `add.label(text)` | Static text label |
| `add.edit()` | Single-line text input |
| `add.button(text)` | Push button |
| `add.checkbox(text)` | Checkbox |
| `add.radio(text)` | Radio button |
| `add.comboBox()` | Drop-down list |
| `add.listBox()` | Scrollable list |
| `add.slider(min, max)` | Numeric slider |
| `add.colorPicker()` | Color picker |
| `add.nodeSelection()` | Daz Studio node selector |

**Layout**

| Builder | Description |
|---|---|
| `add.group(text)` | Group box |
| `add.tab(text)` | Tab page |
| `add.horizontal(fn)` | Horizontal layout row |
| `add.splitter()` | Resizable splitter |

Most widget builders expose a fluent chain:

```typescript
add.edit()
    .value(model.name$)         // two-way binding
    .toolTip('Enter your name')
    .readOnly(false);

add.button('Apply')
    .clicked(() => applyChanges());

add.tab('Options').build(() => {
    add.group('Colors').build(() => {
        add.colorPicker().value(model.color$);
    });
});
```

---

### Available Helpers

The framework ships helpers for common Daz Studio tasks, all importable from `@dsf/helpers/*`.

| Module | Key functions |
|---|---|
| `scene-helper` | `getRoot()`, `getSelectedNode()`, `getNodes()` |
| `node-helper` | Type checks (`isFigure`, `isBone`), transforms, visibility |
| `property-helper` | Set paths, unlock, cast numeric types, and inspect property inputs/outputs |
| `array-helper` | `distinct()`, `flatten()`, `groupBy()` |
| `string-helper` | Case, trimming, splitting |
| `directory-helper` | File and path operations |
| `message-box-helper` | `info()`, `warn()`, `error()` message boxes |
| `progress-helper` | Progress dialogs |
| `menu-helper` | Custom menus |
| `undo-helper` | Undo stack integration |

```typescript
import * as SceneHelper from '@dsf/helpers/scene-helper';
import * as NodeHelper from '@dsf/helpers/node-helper';

const figures = SceneHelper.getNodes().filter(n => NodeHelper.isFigure(n));
```

---

### Directory Structure

```
my-daz-scripts/
├── src/
│   ├── hello-world.dsa.ts       # runnable entry point → compiles to .dsa
│   ├── my-dialog-model.ts       # plain TypeScript — model or helper class
│   ├── my-dialog.ts
│   └── my-dialog-script.dsa.ts  # runnable entry point
├── test/
│   ├── integration/
│   │   ├── fixtures/
│   │   │   └── my-daz-scripts-smoke.dsa.ts
│   │   ├── out/                 # integration output, ignored by git
│   │   └── README.md
│   └── unit/
│       ├── smoke.test.ts
│       └── README.md
├── out/                         # build output — launchers, bundles, icons
├── .env.integration.linux.example
├── .env.integration.windows.example
├── dazscript.config.ts
├── tsconfig.json
├── tsconfig.test.json
├── vitest.config.ts
└── package.json
```

Files ending in `.dsa.ts` are treated as runnable entry points and compiled to `.dsa`. Plain `.ts` files are modules — imported by entry points but not compiled independently.

The `test/unit/` files are generated only when you run `dazscript init --unit-tests`. The `test/integration/` files and env examples are generated only when you run `dazscript init --integration-tests`.

**Common commands**

| Command | What it does |
|---|---|
| `npm run build` | Compile TypeScript → Daz Script |
| `npm run build:release` | Build with `--log-level warn`, then encrypt implementation bundles |
| `npm run watch` | Recompile on every save |
| `npm run installer` | Generate the setup dialog |
| `npm run icons` | Copy icon assets to the output folder |
| `npm test` | Run fast Node/Vitest tests |
| `npm run test:integration` | Run a DAZ Studio headless integration fixture |

---

### Development & Publishing

This package uses **semantic-release** for automatic versioning and npm publishing.

#### Commit message conventions

| Prefix | Effect |
|---|---|
| `fix: ...` | Patch bump (`1.0.0` → `1.0.1`) |
| `feat: ...` | Minor bump (`1.0.0` → `1.1.0`) |
| `BREAKING CHANGE: ...` in commit body | Major bump (`1.0.0` → `2.0.0`) |
| No prefix | No version bump |

Examples:
```
fix: resolve layout overflow in group builder
feat: add tree view builder
feat: refactor action entrypoint

BREAKING CHANGE: action() now requires an explicit menuPath
```

#### Publishing

Every push to `master` automatically:

1. Analyzes commit messages since the last release
2. Updates the version in `package.json`
3. Builds the project
4. Creates a GitHub release with changelog
5. Publishes to npm

No manual steps required.

---

## Resources

- [DAZ Script Reference](https://docs.daz3d.com/public/software/dazstudio/4/referenceguide/scripting/start) — official Daz Studio scripting documentation
- [dazscript-types](https://www.npmjs.com/package/dazscript-types) — TypeScript type definitions for the Daz Studio API

## Examples

The `src/examples/` folder contains ready-to-run scripts demonstrating common patterns and fuller reference implementations for common Daz Studio workflows.
