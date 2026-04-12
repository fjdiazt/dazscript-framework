# Scripts Project Overview

## 📋 Summary

The `/scripts` folder contains **three independent Daz Studio script projects** written in TypeScript. These are production scripts that extend Daz Studio's functionality. Each project is built using Webpack+Babel and compiled from TypeScript (.dsa.ts) into installable Daz Studio scripts (.dsa files). All projects leverage the centralized **dazscript-framework** and **dazscript-types** packages from the root folder for common utilities, helpers, and type definitions.

---

## 📁 Project Structure

```
scripts/
├── common/          # Utility scripts for daily workflow tasks
├── paramate/        # Character parameter customization tool
├── power-menu/      # Quick access menu system for Daz Studio
└── docs/            # Documentation (this folder)
```

---

## 🔧 Build System

All three projects share the **same build configuration pattern**:

### Build Pipeline
```
TypeScript Source (.dsa.ts)
        ↓
    Babel + Webpack (npm run build)
        ↓
    ES5 JavaScript (.dsa)
        ↓
    Daz Studio Installation Script (Install.dsa)
        ↓
    Deployed to Daz Studio
```

### Build Steps (identical across all projects)
1. `npm run prebuild` → Runs `npm run installer` (generates Install.dsa from scripts)
2. `npm run build` → Webpack transpiles TypeScript → ES5 JavaScript
3. `npm run postbuild` → Runs `npm run icons` (copies .png icons)
4. `npm run watch` → Watches for changes and rebuilds

### Shared Build Dependencies
- **Module Bundler** - Webpack (configures TypeScript & Babel transpilation)
- **JavaScript Transpiler** - Babel (targets ES5 for Daz Studio compatibility)
- **Language** - TypeScript
- **dazscript-framework** - Framework package (local file path)
- **dazscript-types** - Type definitions (local file path)

---

## 📦 Project Details

### 1. **common** - Vholf3D Scripts Collection
**Purpose:** General-purpose utility scripts for Daz Studio animation, rendering, and scene manipulation

**Location:** `scripts/common/`

**Script Categories:**
| Category | Purpose |
|----------|---------|
| **animation** | Keyframe management, animation utilities |
| **camera** | Camera controls and management |
| **scene** | Scene manipulation and querying |
| **selection** | Selection tools and utilities |
| **parameters** | Parameter handling |
| **render** | Rendering tools |
| **transforms** | Transformation utilities |
| **lights** | Lighting management |
| **morphs** | Morph controls |
| **helpers** | Helper utilities |
| **content** | Content management |
| **locks** | Locking mechanisms |
| **nodes** | Node utilities |
| **shaders** | Shader tools |
| **sandbox** | Sandbox environment |
| **zero** | Reset/zeroing utilities |

**Installation Menu Path:** `/Vholf3Dv3/scripts/[category]/`

**Example Script:**
```typescript
@action({ text: 'Delete Keyframes' })
class DeleteKeyframesScript extends BaseScript {
    run() {
        const nodes = getSelectedNodes()
        // ... deletes keyframes for selected nodes
    }
}
```

**Shared Utilities:** Located in `src/shared/` (camera, config, globals, nodeProperties, nodeTags, scene)

---

### 2. **paramate** - Parameter Customization Tool
**Purpose:** Advanced Genesis figure parameter management with preset saving/loading

**Location:** `scripts/paramate/`

**Main Components:**
- `Paramate.dsa.ts` - Main entry point with dialog UI
- `paramate-model.ts` - Data model with observables
- `paramate-dialog.ts` - Dialog UI components
- `paramate-config.ts` - Configuration management
- `paramate-settings.ts` - Settings persistence
- `presets/` - Preset save/load system
- `prameters/` - Parameter definitions

**Key Features:**
- Select Genesis figures
- Manage parameters
- Save/load parameter presets
- Organize presets (Parameters vs Favorites)
- Dialog-based interface

**Installation Menu:** `/Vholf3Dv3/Paramate`

**Example Usage:**
```typescript
@action({ text: 'Paramate' })
class ParamateScript extends BaseScript {
    run() {
        let figure = getSelectedFigure()
        let model = createModel(figure)
        let dialog = new Dialog(model)
        dialog.run()
    }
}
```

---

### 3. **power-menu** - Quick Access Menu System
**Purpose:** Context-sensitive menu system for rapid access to Daz Studio tools and recent items

**Location:** `scripts/power-menu/`

**Main Components:**
- `Power Menu.dsa.ts` - Primary menu interface
- `Power Menu Actions.dsa.ts` - Action handlers
- `Power Menu Recents.dsa.ts` - Recent items management
- `Power Menu Tool.dsa.ts` - Tool integration
- `power-menu/` subfolder - Menu model and service logic

**Key Features:**
- Quick toolbar menu with F24 shortcut
- Recent items access
- Main menu navigation
- Tool menu integration
- Active tool tracking

**Installation Menu:** `/Vholf3Dv3/Power Menu` (with toolbar: `Vholf3D_PowerMenu`)

**Example Script:**
```typescript
@action({ text: 'Power Menu', toolbar: 'Vholf3D_PowerMenu', shortcut: 'F24', menuPath: false })
export class PowerMenuScript extends BaseScript {
    protected run(): void {
        let model = new PowerMenuModel()
        model.recentItems$.value = getRecents()
        // ...
    }
}
```

---

## 🔗 Dependencies

### Framework Dependencies
All projects depend on the centralized framework package:

```json
{
  "dependencies": {
    "dazscript-framework": "file:C:/src/DazScript.Framework/framework",
    "dazscript-types": "file:C:/src/DazScript.Framework/dazscript-types"
  }
}
```

### Framework Imports (common patterns)
```typescript
import { action } from '@dsf/core/action-decorator'
import { BaseScript } from '@dsf/core/base-script'
import { getSelectedFigure } from '@dsf/helpers/scene-helper'
import { confirm, info } from '@dsf/helpers/message-box-helper'
// Many more helpers available...
```

**Note:** See [DAZ_ENVIRONMENT.md](./DAZ_ENVIRONMENT.md) for complete helper reference and standard JavaScript replacements.

---

## 🔄 Installation System

Each project generates an `Install.dsa` script that:

1. **Reads** all `*.dsa.ts` files from the project's `src/` directory
2. **Extracts** @action decorators to determine menu placement and properties
3. **Generates** dynamic installation that registers scripts with Daz Studio
4. **Sets** menu paths, descriptions, icons, and toolbar placements

**Installation Command Template:**
```
node ./node_modules/dazscript-framework/dist/scripts/install-generator.js -p ./src -m /Vholf3Dv3
```

---

## 🏗️ TypeScript Configuration

All projects use consistent TypeScript settings:
- **Target:** ES5 (Daz Studio compatibility)
- **Decorators:** Enabled (for @action and @property)
- **Module Resolution:** Configured for path aliases (@dsf/*)
- **Strict Mode:** Enabled for type safety

---

## 🎯 Script Naming Conventions

To be recognized as installable scripts:
- **Main entry scripts:** `NameOfScript.dsa.ts`
- **Icon files:** `NameOfScript.dsa.png` (optional, referenced in @action)
- **Utility files:** `*.ts` (not in .dsa.ts format, not auto-installed)

---

## 🚀 Development Workflow

### Building a Project
```bash
cd scripts/[project-name]
npm install          # First time only
npm run build        # Build with optimizations
npm run watch        # Watch mode for development
```

### Adding a New Script
1. Create `NewScript.dsa.ts` in appropriate category folder
2. Import framework helpers and decorators
3. Add @action decorator with menu path
4. Extend BaseScript and implement run()
5. Run `npm run build` - Install.dsa regenerates automatically

### Debugging
- Scripts output to Daz Studio's script console
- Use framework's `log()` and `progress()` helpers
- Icons must be placed alongside `.dsa.ts` files ✓

---

## 📝 Notes for Documentation

- All three projects use the **same Webpack/Babel configuration**
- Framework package provides shared utilities and helpers
- Scripts are **menu-driven** via @action decorators
- Each project has **independent build** and installation
- Projects can be built and deployed separately
- Framework updates automatically propagate to all projects (via local file reference)

