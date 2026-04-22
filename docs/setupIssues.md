# Setup Issues Handover

## Current issue

The setup dialog is failing to detect already installed custom actions when the installed script path comes from a symlinked or renamed framework output root.

Observed example:

- Expected by current workspace:
  - `C:/src/daz/scripts/common/out/scripts/camera/copy-from-camera.dsa`
- Already installed in DAZ:
  - `C:/src/DazScript.Framework/scripts/common/out/scripts/camera/copy-from-camera.dsa`

The setup dialog treats these as different scripts, so most actions appear unchecked or missing and reinstallation/removal behavior becomes inconsistent.

## Latest log state

From `C:\Users\Fred\AppData\Roaming\DAZ 3D\Studio4\log.txt` around `2026-04-21 18:10:35`:

- `Adjust Focal Length` was matched only because it had just been installed in the current workspace path:
  - `matched="C:/src/daz/scripts/common/out/scripts/camera/adjust-focal-length.dsa"`
- Most other actions still failed detection:
  - `suffix="scripts/camera/copy-from-camera.dsa" match=""`
  - `suffix="scripts/packages/multi-camera-render/cycle-render-camera.dsa" match=""`
  - `suffix="scripts/actions/missing-custom-actions.dsa" match=""`

Important detail:

- The debug `suffix=` value is currently too short.
- It has been reduced to `scripts/...`.
- The installed current-framework candidates live under `scripts/common/out/scripts/...`.
- Because `common/out` was dropped, the suffix matcher still misses the current-framework installed actions.

## What was tried

### 1. Exact normalized absolute path

Result:

- Fast.
- Fails whenever the install root differs due to symlink, renamed mount point, or different drive/root.

### 2. Canonical file resolution with `DzFileInfo`

Result:

- Did not unify `C:/src/daz/...` and `C:/src/DazScript.Framework/...` in practice.
- Made the setup dialog noticeably slower because it ran on the hot path for many actions and candidates.
- Reverted.

### 3. Match from `scripts/` or `scripts-deprecated/`

Result:

- Too broad and structurally wrong.
- Lost important path segments such as `common/out`.
- Unsafe for framework consumers with arbitrary install roots.

### 4. Relative path based on `action.filePath`

Result:

- Current implementation is still deriving `scripts/...` instead of the full shipped subtree.
- Better direction than absolute matching, but still incomplete.

### 5. Menu/toolbar fallback discussion

Conclusion:

- `menuPath + filename` and `toolbar + filename` are acceptable fallback heuristics only when they produce a unique candidate.
- They should not be the primary identity because UI placement is not the real file identity and may drift.

## Current code state

Main file:

- [custom-action-helper.ts](c:/src/daz/scripts-framework/src/helpers/custom-action-helper.ts)

Relevant areas:

- `findByPathHeuristics()`
- `getStablePathSuffixes()`
- `getInstalledCustomActionState()`

The current debug line shows:

- `suffix="${normalizePath(action.filePath)}"`

That is the immediate bug.

For these actions, `action.filePath` normalizes to values like:

- `scripts/camera/copy-from-camera.dsa`
- `scripts/actions/missing-custom-actions.dsa`

But the stable shipped subtree for the current framework artifacts is actually:

- `scripts/common/out/scripts/camera/copy-from-camera.dsa`
- `scripts/common/out/scripts/actions/missing-custom-actions.dsa`

## Likely root cause

The metadata in `action.filePath` is not the same as the built artifact location inside the shipped framework output tree.

The matcher is using source-level relative paths:

- `scripts/...`

but detection needs to compare built artifact relative paths:

- `scripts/common/out/scripts/...`

or whatever the actual shipped subtree is for that action set.

## Recommended next fix

Do not derive the stable suffix from the absolute expected path.

Do not derive it from the current `action.filePath` value either unless that value is first translated into the built artifact relative path.

Instead:

1. Resolve the expected built artifact relative path for each action.
2. Compare installed custom action paths using `endsWith()` against that full built relative suffix.
3. Keep exact normalized absolute-path match first.
4. Keep unique `menuPath + filename` fallback.
5. Keep unique `toolbar + filename` fallback.

Target comparison example:

- Expected suffix:
  - `scripts/common/out/scripts/camera/copy-from-camera.dsa`
- Installed path:
  - `C:/src/DazScript.Framework/scripts/common/out/scripts/camera/copy-from-camera.dsa`

This should match regardless of:

- drive letter
- symlink name
- library mount name
- workspace root

## Concrete next investigation

Find where the setup action definitions originate and determine how to map each action to its built output path under the shipped framework tree.

Questions to answer:

- Where is `action.filePath` authored for framework setup actions?
- Is there already a helper or config that knows the built output location?
- Can the installer use the generated install manifest or build metadata instead of inferring this from source paths?

## Practical stopping point

The current implementation should not be treated as complete.

The most recent log still shows widespread `match=""` failures for previously installed current-framework actions. Only newly installed actions under the current workspace root are detected correctly.
