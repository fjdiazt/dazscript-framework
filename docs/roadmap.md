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

## List Refresh Stability

### Add opt-in rebuild mode for list views

Problem:
Some Daz list and tree views appear unstable when item updates are applied through incremental in-place refreshes.

Current behavior:
- `ListViewBuilder` listens to item observable changes
- Item changes may trigger in-place list updates

Proposed direction:
- Add an opt-in rebuild mode for `ListViewBuilder`
- Use that mode only for lists that are known to be unsafe with incremental updates

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
