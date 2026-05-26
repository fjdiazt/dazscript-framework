# DAZ Headless Integration Test Design

Date: 2026-05-26

Repo: `dazscript-framework`

Worktree: `/home/fred/workspace/daz/scripts-framework-daz-integration`

Branch: `feature/daz-headless-integration`

## Goal

Add a first-pass framework integration test that runs a real framework-built script inside DAZ Studio headless and proves the test harness with one non-figure-dependent helper area and one figure-dependent helper area.

The command is for local developer validation. It is not part of normal package CI and does not run during `npm test`.

## Command Contract

Add:

```bash
npm run test:integration
```

This command requires:

```text
DAZ_STUDIO_EXE
DAZ_TEST_CONTENT_DUF
```

If either variable is missing, the command fails with setup instructions. It must not silently skip the meaningful figure-helper coverage.

Optional variables:

```text
WINEPREFIX
DAZ_TEST_TIMEOUT_MS
```

`npm test` remains the fast Node/Vitest unit test suite.

## Platform Contract

Primary target is Windows. macOS and Linux are supported through explicit user-provided paths. Linux/Wine gets convenience normalization, but no local-machine paths are hardcoded.

Windows example:

```powershell
$env:DAZ_STUDIO_EXE="C:\Program Files\DAZ 3D\DAZStudio4\DAZStudio.exe"
$env:DAZ_TEST_CONTENT_DUF="C:\Users\Public\Documents\My DAZ 3D Library\People\Genesis 9\Genesis 9.duf"
npm run test:integration
```

Linux/Wine example:

```bash
export WINEPREFIX="$HOME/.local/share/daz-wine/prefix"
export DAZ_STUDIO_EXE="$WINEPREFIX/drive_c/Program Files/DAZ 3D/DAZStudio4/DAZStudio.exe"
export DAZ_TEST_CONTENT_DUF="$WINEPREFIX/drive_c/users/Public/Documents/My DAZ 3D Library/People/Genesis 9/Genesis 9.duf"
npm run test:integration
```

The runner accepts normal OS paths and DAZ-style paths. Before passing paths to DAZ, it normalizes:

- Windows `C:\...` paths to `C:/...`
- Linux/Wine `.../drive_c/...` content paths to `C:/...`
- already DAZ-style paths unchanged

If `DAZ_STUDIO_EXE` does not exist locally, fail before building. If `DAZ_TEST_CONTENT_DUF` cannot be resolved locally and is not DAZ-style, fail before building.

## Files And Layout

Add versioned files:

```text
test/integration/fixtures/framework-integration.dsa.ts
test/integration/run-integration-tests.js
```

Add ignored generated output:

```text
test/integration/out/
```

The generated fixture project lives at:

```text
test/integration/out/fixture/
```

The generated project contains:

```text
test/integration/out/fixture/package.json
test/integration/out/fixture/tsconfig.json
test/integration/out/fixture/dazscript.config.ts
test/integration/out/fixture/src/framework-integration.dsa.ts
test/integration/out/fixture/out/
test/integration/out/fixture/result.json
```

The output directory remains after failures so the generated launcher, implementation bundle, logs, and result JSON can be inspected. It is ignored by git.

## Runtime Flow

`npm run test:integration`:

1. Validates required environment.
2. Normalizes DAZ and content paths.
3. Creates a clean `test/integration/out/fixture/`.
4. Generates a minimal consumer-style project that depends on this framework checkout by file path.
5. Copies `test/integration/fixtures/framework-integration.dsa.ts` into the generated project's `src/` directory.
6. Builds the generated project through the real framework build pipeline.
7. Launches DAZ Studio headless through the generated launcher script, not the implementation bundle directly.
8. Passes script arguments:
   - result JSON path
   - content DUF path
9. Reads `result.json`.
10. Fails if DAZ exited nonzero, timed out, did not write a result, or reported failed assertions.

The normal test path uses the generated launcher because launchers are part of the public framework contract and forward script arguments to the implementation bundle.

## DAZ Fixture Script

`test/integration/fixtures/framework-integration.dsa.ts` is a normal framework action:

```typescript
action({ text: 'Framework Integration Test', menuPath: false }, () => {
    // read script args
    // run scene-helper checks
    // load configured figure DUF
    // run node-helper checks
    // write result.json
})
```

The fixture writes structured JSON:

```json
{
  "ok": true,
  "failures": [],
  "scene": {},
  "node": {}
}
```

Where possible, the fixture catches errors and writes failure JSON before exiting so the Node runner can report useful diagnostics.

## Helper Coverage

First pass covers only two helper areas.

### Scene Helper

Use real DAZ `Scene` and `DzTime` without loading content-specific assumptions:

- `currentTime()`
- `getCurrentFrame()`
- `getEndFrame()`
- `getLastFrame()`
- `frameToTime()`
- `timeToFrame()`

Assertions:

- current frame is numeric
- end frame is numeric
- `getEndFrame()` and `getLastFrame()` agree
- `timeToFrame(frameToTime(getCurrentFrame()))` round-trips to the current frame

### Node Helper

Load the configured figure DUF and assert generic figure behavior:

- loaded/selected root is a figure through `isFigure()`
- discover at least one real body bone by walking loaded figure children
- discovered bone passes `isBone()`
- `getFigure(bone)` returns the same skeleton
- `getRoot(bone)` returns the same skeleton
- `isBodyPartOf(bone, figure)` is true
- `getChildren(figure, true)` returns at least one body bone and does not classify non-body follower skeletons as body bones

Assertions must be figure-agnostic. The DUF can be Genesis 9, Genesis 8 Female, Genesis 8 Male, older Genesis, or another figure. Do not assert exact Genesis 9 bone names in the first pass.

## Explicit Non-Goals

Do not include these in the first pass:

- custom action installer tests
- menu, toolbar, and shortcut mutation tests
- GUI/dialog tests
- multi-figure profile suites
- strict Genesis 9-specific bone assertions
- automatic installed-content discovery
- public reusable `dazscript` CLI subcommand
- CI integration requiring DAZ Studio

## Future Extensions

Possible later additions:

- `DAZ_TEST_DISCOVER=1` to try common installed figure paths.
- `DAZ_TEST_PROFILE=genesis9` for stricter known-figure assertions.
- `npm run test:integration:smoke` for DAZ runtime smoke without content.
- isolated installer/menu/toolbar/shortcut integration tests with explicit cleanup.
- reusable public CLI command after the harness proves stable.

## Acceptance Criteria

- `npm test` still runs only Node/Vitest unit tests.
- `npm run test:integration` fails clearly when required env is missing.
- With valid DAZ Studio and figure DUF paths, the command builds the generated fixture project and launches DAZ headless.
- The DAZ-side fixture runs through the generated launcher.
- Result JSON proves scene-helper and node-helper checks passed.
- Generated artifacts live under ignored `test/integration/out/`.
- The first implementation has no hardcoded user-local DAZ, Wine, or content paths.
