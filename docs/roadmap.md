# Roadmap

This document tracks framework improvements that are worth doing, but are not required for the current release.

## Installer Generation

### Generate an intermediate action manifest

Problem:
The installer generator currently discovers `action(...)` metadata and immediately writes `Setup.dsa.ts` plus any action-level bundle setup scripts. That makes the pipeline harder to debug and test because there is no intermediate artifact showing the normalized action data.

Current behavior:
- Scan source files for top-level `action(...)` calls
- Normalize action metadata in memory
- Write generated setup scripts directly into the project source tree

Proposed direction:
- Split the pipeline into `discover -> manifest -> generate scripts`
- Generate a machine-readable manifest, such as `dist/dazscript.actions.json`
- Generate `Setup.dsa.ts` and bundle-specific setup scripts from that manifest

Compatibility notes:
- Keep generated setup outputs unchanged at first
- Treat the manifest as an internal debugging and build artifact before making it public API

Priority:
Medium

### Refactor installer generation into smaller units

Problem:
`dist/scripts/install-generator.js` currently combines source discovery, decorator parsing, metadata normalization, bundle handling, and file output in one script.

Current behavior:
- One script handles the entire installer generation flow

Proposed direction:
- Separate responsibilities into small functions or modules:
  - discover actions
  - normalize action metadata
  - write manifest
  - write installer outputs

Compatibility notes:
- No user-facing behavior change required

Priority:
Medium

### Extend setup dialog customization

Problem:
The framework now provides a reusable setup dialog out of the box, but project-level customization is still intentionally narrow.

Current behavior:
- Generated setup scripts open a searchable selection dialog
- Users can inspect action metadata, select which actions to apply, and override shortcuts
- Projects can set dialog title metadata through `bundleName`
- The dialog copy, columns, and selection flow are framework-defined

Proposed direction:
- Allow limited project-level customization of setup dialog copy and labels
- Optionally expose hooks for extra metadata columns or row badges
- Consider project-specific grouping, presets, or setup modes without breaking the shared base experience

Compatibility notes:
- Keep the default generated setup UX stable
- Avoid turning setup generation into a UI framework of its own

Priority:
Medium

## Logging

### Add scoped logger helpers

Problem:
Scripts currently use `@dsf/common/log` directly and must manually prefix every message with a product or script tag, such as `[PowerMenu]` or `[MorphsLoader]`. `BaseScript` announces script execution, but the common log helpers do not provide a scoped logger that automatically prefixes each diagnostic line. This makes logs less consistent and increases copy/paste drift across products.

Current behavior:
- `BaseScript.exec()` logs the class/script name at startup and on errors
- `debug`, `info`, `warn`, `error`, and `trace` log messages as provided
- Products that need consistent diagnostic tags build their own local wrappers or string prefixes

Proposed direction:
- Add a helper such as `createLogger(scope)` or `createScopedLogger(scope)`
- Return scoped `debug`, `info`, `warn`, `error`, and `trace` functions
- Format messages consistently, for example `[Scope] message`
- Keep existing unscoped log helpers unchanged
- Allow nested scopes later if repeated by scripts, for example `[MorphVault][Discovery] message`

Compatibility notes:
- Do not change existing log output by default
- Keep scoped logging opt-in so current scripts and tests remain stable

Priority:
Medium

## List Refresh Stability

### Add manual progress callback helper

Problem:
The framework `progress(info, items, callback)` helper works well for simple item loops, but some scripts need multi-phase progress that does not map cleanly to one array iteration. Morphs Loader apply/refresh flows need manual steps across file operations, manifest sync, model sync, and UI refresh.

Current behavior:
- Scripts can use `progress(info, items, callback)` for array-driven work
- Multi-phase flows must call raw DAZ globals such as `startProgress`, `stepProgress`, and `finishProgress`

Proposed direction:
- Add a wrapper such as `withProgress(info, totalSteps, callback)`
- Provide a small progress handle to the callback, for example `step(count?)`
- Ensure `finishProgress()` runs in a `finally` block
- Keep cancellability and elapsed-time options consistent with the existing `progress()` helper

Compatibility notes:
- Keep existing `progress()` behavior unchanged
- Avoid forcing multi-phase work into fake arrays

Priority:
Medium

### Add richer list view builder helpers

Problem:
Consumer scripts still drop to raw `DzListView` and `DzPopupMenu` APIs for common list behavior. Morphs Loader currently needs typed item signals, selected row data extraction, submenu/separator context menus, manual column sizing, and checklist row setup.

Current behavior:
- `ListViewBuilder` supports core binding, columns, filters, context menus, refresh, rebuild mode, and selection mode
- Item signal overloads still require string-indexed `scriptConnect` calls in consumer code
- Selected row operations require each script to call `getItems(DzListView.Selected)` and unwrap stored data
- `PopupMenuBuilder` handles flat item lists but not submenus, explicit enabled state, or append-position separators
- Checklist row setup and manual column width setup are repeated in scripts

Proposed direction:
- Add typed list item signal hooks such as clicked item and space-pressed item callbacks
- Add helper APIs for selected row data, for example `getSelectedDataItems<T>(listView)`
- Extend `PopupMenuBuilder` with submenu, separator, and enabled-state support
- Add list builder options for manual column widths and resize/sort indicator settings
- Consider checklist row builder sugar only after another script repeats the Morphs Loader pattern

Compatibility notes:
- Keep these as thin wrappers over DAZ APIs
- Do not remove the existing `build((listView) => ...)` escape hatch
- Avoid baking Morphs Loader-specific policy into the framework

Priority:
Medium

### Add opt-in rebuild mode for list views

Problem:
Some Daz list and tree views appear unstable when item updates are applied through incremental in-place refreshes. This was reproduced in Morphs Loader when switching large tree/checklist lists that also carried product pixmaps.

Current behavior:
- `ListViewBuilder` listens to item observable changes
- Item changes trigger in-place list updates by default
- Callers can opt into full rebuilds on item changes with `rebuildOnItemsChanged()`

Proposed direction:
- Keep `rebuildOnItemsChanged()` opt-in and use it only for lists that are known to be unsafe with incremental updates
- Avoid changing the default list behavior globally because existing scripts depend on it

Compatibility notes:
- Do not change the default behavior globally
- Existing lists should continue working unless rebuild mode is explicitly enabled

Priority:
Medium

### Harden framework list refresh behavior

Problem:
The framework list refresh path is currently optimized for live updates, but some Daz widgets may not tolerate all mutation patterns safely.

Current behavior:
- Refresh behavior is framework-driven and assumes incremental updates are safe

Proposed direction:
- Review incremental update paths in `ListViewBuilder`
- Add clearer separation between data replacement and UI rebuild
- Preserve selection, expansion state, and filtering when full rebuilds are used

Compatibility notes:
- Needs careful rollout because many existing lists depend on current behavior

Priority:
Low

## CLI and Project Setup

### Reduce generated project surface further

Problem:
The new CLI removes most consumer-owned toolchain setup, but generated projects still carry compatibility-oriented files and assumptions.

Current behavior:
- `dazscript init` writes a minimal config and TypeScript setup
- The framework still exposes compatibility layers from earlier setup models

Proposed direction:
- Continue reducing the consumer project footprint
- Prefer CLI-driven configuration over duplicated local setup

Compatibility notes:
- Keep migration cost low for existing consumer projects

Priority:
Low

## Dependency Cleanup

### Remove deprecated Babel packages where possible

Problem:
The framework currently depends on some deprecated Babel packages because the DazScript transpilation stack still relies on older transform behavior.

Current behavior:
- Build works, but installation emits deprecation warnings for some Babel packages

Proposed direction:
- Audit which Babel transforms are still actually required
- Replace deprecated packages where possible without changing output semantics

Compatibility notes:
- Output compatibility matters more than dependency neatness
- Changes here need build verification against real Daz scripts

Priority:
Low
