# Daz Studio Runtime Environment

## ⚠️ Critical for All Development

**This document is essential reading before writing any code.** Daz Studio scripts run in a restricted ECMA-262 sandbox with Daz-specific APIs. Many standard JavaScript features are **unavailable** and will cause runtime errors. Always check this guide first before attempting to use JavaScript functions, standard library methods, or async patterns.

**Note:** This document covers the most common unavailable features and their replacements. Other functions not listed here may also be unavailable — errors will be discovered at runtime during testing in Daz Studio. If you encounter an error about an undefined function, consult the framework helpers or the framework source code.

---

## 🚨 Runtime Constraints Overview

Daz Studio scripts are compiled to ES5 and executed in a proprietary script engine with limited feature support:

- ❌ **No Node.js APIs** (fs, path, os, etc.)
- ❌ **No async/await or Promises**
- ❌ **No native Set/Map collections** (use CustomSet instead)
- ❌ **No fetch/AJAX/HTTP** (no network)
- ❌ **No setTimeout/setInterval** (use DzTimer wrapper)
- ❌ **Limited console API** (use framework logging)
- ✅ **ES5 syntax and features**
- ✅ **JSON, Math, Date objects**
- ✅ **Regular expressions**
- ✅ **Daz-specific objects** (DzNode, DzProperty, DzSkeleton, etc.)

---

## 📋 Standard JS → Daz Framework Replacements

Use this table to convert standard JavaScript to Daz-compatible code:

### String Functions

| Standard JS | Use Instead | Import | Notes |
|-------------|-------------|--------|-------|
| `str.includes(search)` | `contains(str, search)` | `@dsf/helpers/string-helper` | Works with single string or array |
| `str.replace(old, new)` | `remove(str, old)` | `@dsf/helpers/string-helper` | Only removes first occurrence |
| `str.endsWith(suffix)` + `.slice()` | `trimEnd(str, suffix)` | `@dsf/helpers/string-helper` | Removes suffix from end |
| Count occurrences manually | `count(str, search)` | `@dsf/helpers/string-helper` | Returns count of occurrences |
| Check UUID format manually | `isGUID(str)` | `@dsf/helpers/string-helper` | Validates GUID pattern |
| `parseFloat(str)` | `isNumeric(str)` | `@dsf/helpers/string-helper` | Validates if string is numeric |

**Example:**
```typescript
import { contains, remove, trimEnd, count, isGUID } from '@dsf/helpers/string-helper'

const path = "/some/path/image.png"
if (contains(path, ".png")) { /* ... */ }
const cleaned = remove(path, "/")  // removes first /
const withoutExt = trimEnd(path, ".png")  // "/some/path/image"
const occurrences = count(path, "/")  // 2
if (isGUID("550e8400-e29b-41d4-a716-446655440000")) { /* ... */ }
```

---

### Array Functions

| Standard JS | Use Instead | Import | Notes |
|-------------|-------------|--------|-------|
| `array.includes(item)` | `contains(array, item)` | `@dsf/helpers/array-helper` | Optional fromIndex parameter |
| `array.find(predicate)` | `find(array, predicate)` | `@dsf/helpers/array-helper` | Returns null if not found |
| Remove duplicates manually | `distinct(array)` or `distinct(array, keyFn)` | `@dsf/helpers/array-helper` | Removes duplicates, optional key function |
| `new Set()` | `new CustomSet<T>()` | `@dsf/lib/set` | Use `.add()`, `.has()`, `.values()` |

**Example:**
```typescript
import { contains, find, distinct } from '@dsf/helpers/array-helper'
import CustomSet from '@dsf/lib/set'

const nodes = [n1, n2, n3]
if (contains(nodes, selectedNode)) { /* ... */ }

const match = find(nodes, n => n.getName() === "Root")
if (!match) { /* not found */ }

const unique = distinct(items)
const uniqueByName = distinct(items, item => item.name)

const set = new CustomSet<Item>()
set.add(item1)
if (set.has(item1)) { /* ... */ }
const values = set.values()  // T[]
```

---

### Number Functions

| Standard JS | Use Instead | Import | Notes |
|-------------|-------------|--------|-------|
| `parseInt(str)` with error handling | `tryParse(str)` | `@dsf/helpers/number-helper` | Returns `{ valid: boolean, value: number }` |
| Manual clamping | `clamp(value, min, max)` | `@dsf/helpers/number-helper` | Ensures value within range |
| `Math.random()` | ✅ Built-in | — | Works natively |
| `Math.floor/ceil/round/abs` | ✅ Built-in | — | All Math methods work |

**Example:**
```typescript
import { tryParse, clamp } from '@dsf/helpers/number-helper'

const result = tryParse("42")
if (result.valid) { 
  console.log(result.value)  // 42
}

const clamped = clamp(150, 0, 100)  // 100
```

---

### Collections & Data Structures

| Standard JS | Use Instead | Import | Notes |
|-------------|-------------|--------|-------|
| `new Map()` | `Dictionary<K, V>` (type) | `@dsf/lib/dictionary` | Type-safe key-value, use plain objects |
| `new Set()` | `CustomSet<T>` | `@dsf/lib/set` | Custom implementation |
| Hierarchical data | `TreeNode<T>` | `@dsf/lib/tree-node` | Full tree structure with parent/child |

**Example:**
```typescript
import { Observable } from '@dsf/lib/observable'
import { Dictionary } from '@dsf/lib/dictionary'
import CustomSet from '@dsf/lib/set'
import { TreeNode } from '@dsf/lib/tree-node'

// Dictionary (typed key-value)
type UserDict = Dictionary<string, string>
const users: UserDict = {
  "profile_name": "John",
  "profile_email": "john@example.com"
}

// CustomSet
const visited = new CustomSet<string>()
visited.add("node1")
visited.add("node2")
const all = visited.values()

// TreeNode
const root = new TreeNode("Root", "/", null, [
  new TreeNode("Child1", "/child1", null),
  new TreeNode("Child2", "/child2", null)
])
root.children[0].parent === root  // true
```

---

### Async/Timers

| Standard JS | Use Instead | Import | Notes |
|-------------|-------------|--------|-------|
| `setTimeout(fn, ms)` | `new Delayed(fn, min, max)` | `@dsf/lib/delayed` | Requires min and max delays |
| `setInterval(fn, ms)` | `new DzTimer()` directly | (Daz API) | Use with `.timeout.connect()` |
| `Promise` | ❌ Not available | — | Use callbacks or Observable pattern |
| `async/await` | ❌ Not available | — | Use callbacks |

**Example:**
```typescript
import { Delayed } from '@dsf/lib/delayed'

// Delayed execution with debounce-like behavior
const delayed = new Delayed(() => {
  doSomething()
}, 100, 500)

delayed.trigger()  // Schedule action, can be re-triggered
delayed.trigger()  // Resets timer

// For reactive changes, use Observable instead
import { Observable } from '@dsf/lib/observable'
const value$ = new Observable(0)
value$.connect(val => {
  console.log("Value changed:", val)
})
value$.value = 1  // Triggers observer
```

---

### Console & Logging

| Standard JS | Use Instead | Import | Notes |
|-------------|-------------|--------|-------|
| `console.log()` | `debug()` or `info()` | `@dsf/common/log` | Logs to Daz Studio console |
| `console.error()` | `error()` | `@dsf/common/log` | Displayed as warning in Daz |
| `console.warn()` | `warn()` | `@dsf/common/log` | Yellow warning in console |
| Manual dump formatting | `dump(obj)` | `@dsf/common/log` | Pretty-printed JSON dump |
| Manual throw + log | `raise(msg)` | `@dsf/common/log` | Logs error then throws |

**Example:**
```typescript
import { debug, info, error, warn, dump, raise } from '@dsf/common/log'

debug("Debug message")
info("Information message")
error("Error occurred")
warn("Warning message")
dump(complexObject)  // Outputs JSON formatted
// raise("Fatal error")  // Logs and throws
```

---

### Observable/Reactive

| Standard JS | Use Instead | Import | Notes |
|-------------|-------------|--------|-------|
| Manual observer pattern | `Observable<T>` | `@dsf/lib/observable` | Reactive state management |
| Manual event emitter | `Observable<void>` | `@dsf/lib/observable` | Trigger events with `trigger()` |
| Manual boolean state | `BooleanObservable` | `@dsf/lib/observable` | Observable<boolean> with utilities |

**Example:**
```typescript
import { Observable, BooleanObservable } from '@dsf/lib/observable'

// Reactive value
const isLoading$ = new Observable<boolean>(false)
isLoading$.connect(value => {
  console.log("Loading:", value)
})
isLoading$.value = true  // Triggers observer

// Event trigger
const updated$ = new Observable<void>()
updated$.connect(() => {
  console.log("Updated!")
})
updated$.trigger()  // Notify all observers

// Boolean observer with helpers
const isEnabled$ = new BooleanObservable(true)
```

---

## 🔗 Framework Helpers Reference

Beyond the replacements above, the framework provides domain-specific helpers:

### Scene & Node Operations
```typescript
import {
  getSelectedNodes,           // DzNode[]
  getSelectedFigure,          // DzSkeleton
  getSelectedNode,            // DzNode
  getSelectedNumericProperties // DzProperty[]
} from '@dsf/helpers/scene-helper'

import {
  getProperties,              // TreeNode<PropertyModel>[]
  getPropertiesFromSelectedGroup,
  getChildNodes
} from '@dsf/helpers/node-helper'
```

### Property Operations
```typescript
import {
  unlock,                     // (prop, fn) => unlock property temporarily
  lock,                       // (prop) => lock property
  setPropertyValue,           // Set with optional animation
  getPropertyValue            // Get current value
} from '@dsf/helpers/property-helper'
```

### UI & Dialogs
```typescript
import {
  info, warn, error,          // Alert boxes
  confirm,                    // Yes/No dialog
  prompt                      // Text input dialog
} from '@dsf/helpers/message-box-helper'

import { BasicDialog } from '@dsf/dialog/basic-dialog'
import { DialogBuilder } from '@dsf/dialog/builders/dialog-builder'
```

### File Operations
```typescript
import {
  readFile,
  writeFile,
  deleteFile,
  fileExists,
  createPath
} from '@dsf/helpers/file-helper'
```

### Progress & Performance
```typescript
import {
  progress                    // Show progress bar with loop
} from '@dsf/helpers/progress-helper'
```

### Menus & Actions
```typescript
import {
  getMainMenuItems,
  getToolsMenuItems,
  getRecents
} from '@dsf/helpers/menu-helper'

import { setKeyboardShortcut } from '@dsf/shared/set-keyboard-shortcut'
```

See [AGENTS.md](./AGENTS.md#-common-helpers-reference) for the complete helper inventory.

---

## 🎯 Common Patterns

### Instead of setTimeout
```typescript
// ❌ Wrong
setTimeout(() => { doSomething() }, 1000)

// ✅ Right
import { Delayed } from '@dsf/lib/delayed'
new Delayed(() => { doSomething() }, 500, 1000).trigger()
```

### Instead of Set
```typescript
// ❌ Wrong
const unique = new Set(items)

// ✅ Right
import CustomSet from '@dsf/lib/set'
const unique = new CustomSet<Item>()
items.forEach(item => unique.add(item))
const array = unique.values()
```

### Instead of .includes()
```typescript
// ❌ Wrong
if (nodes.includes(selectedNode)) { /* ... */ }

// ✅ Right
import { contains } from '@dsf/helpers/array-helper'
if (contains(nodes, selectedNode)) { /* ... */ }
```

### Instead of Promise chains
```typescript
// ❌ Wrong
loadData().then(data => {
  process(data)
}).catch(err => {
  handleError(err)
})

// ✅ Right
import { Observable } from '@dsf/lib/observable'
const data$ = new Observable()
data$.connect(data => {
  if (data) process(data)
})
loadData((err, data) => {
  if (err) handleError(err)
  else data$.value = data
})
```

---

## 🚀 What IS Available

You can safely use:

- **ES5 Syntax:** let, const, arrow functions, template literals, destructuring, spread operator (when transpiled)
- **Built-in Objects:** Object, Array, String, Number, Math, Date, RegExp, JSON, Error
- **Daz Objects:** DzNode, DzProperty, DzSkeleton, DzScene, DzApp, DzTimer, and many more from `dazscript-types`
- **TypeScript Features:** By the time it reaches Daz, it's transpiled to ES5 JavaScript

---

## 🔍 Troubleshooting Runtime Errors

### "function is not defined"
This feature is not available in Daz. Check:
1. This document for a replacement
2. [AGENTS.md](./AGENTS.md) helper reference
3. Framework source code in `/framework/src/helpers/`

### "Cannot read property X of undefined"
Daz objects may not always have expected properties. Always check for null/undefined:
```typescript
if (!figure?.objectName.toLowerCase().startsWith("genesis")) {
  info("Invalid selection")
  return
}
```

### "Uncaught: Property is read-only"
Some Daz properties are locked. Use the framework helper:
```typescript
import { unlock } from '@dsf/helpers/property-helper'
unlock(property, () => {
  property.setValue(newValue)
})
```

### "Cannot find module 'xyz'"
Check the import path uses `@dsf/*` alias. Verify it's defined in `tsconfig.json`:
```typescript
// ❌ Wrong
import { something } from '../../lib/something'

// ✅ Right
import { something } from '@dsf/lib/something'
```

---

## 📝 Important Notes

1. **Experimental Features:** Features not documented here may fail at runtime. Test in Daz Studio directly.

2. **Daz Version Differences:** Different Daz Studio versions may have different API capabilities. Target the minimum version your scripts support.

3. **Performance:** Avoid loops over large datasets without `progress()` helper. Daz UI becomes unresponsive otherwise.

4. **Memory:** Daz scripts run in the main thread. Complex operations block the UI. Use `this.acceptUndo()` to mark operations as undoable.

5. **Type Definitions:** Check `dazscript-types` for complete type signatures of Daz API objects.

---

## 🔗 Related Documentation

- [AGENTS.md](./AGENTS.md) — Architecture patterns and best practices
- [OVERVIEW.md](./OVERVIEW.md) — Project structure overview
- Framework source: `/framework/src/` — Implementation of all helpers
- Types source: `/dazscript-types/src/types/` — Daz API type definitions

