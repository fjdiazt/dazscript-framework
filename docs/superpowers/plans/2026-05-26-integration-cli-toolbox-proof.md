# Integration CLI and Toolbox Proof Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Promote the current framework-only DAZ headless integration runner into a supported `dazscript` CLI command, then add a small Toolbox integration test that proves consuming projects can use the same harness without copying framework internals.

**Architecture:** The framework owns the DAZ launch/build harness as a published CLI surface. Consumer projects provide only fixture scripts, npm scripts, and local machine configuration. Figure/content loading is opt-in so projects can run no-scene smoke tests without depending on Genesis 9 or any specific installed figure.

**Tech Stack:** Node.js CommonJS CLI under `dist/scripts`, existing `dazscript` package binary, DAZ Studio headless launch through the generated launcher, Vitest for framework-side Node tests, Toolbox npm script as the consumer proof.

---

## Current State

- Framework integration tests currently run through `test/integration/run-integration-tests.js`.
- That runner is hardcoded to the framework repo root, framework fixture path, framework output path, and a required `DAZ_TEST_CONTENT_DUF`.
- The framework package publishes `dist/**/*`, not `test/**/*`, so consumer projects should not import or copy `test/integration/run-integration-tests.js`.
- Toolbox currently depends on `dazscript-framework` and uses the framework webpack and installer wrappers, but it has no DAZ headless integration test.

## Target Contract

Framework users should be able to add:

```json
{
  "scripts": {
    "test:integration": "dazscript integration --fixture ./test/integration/fixtures/toolbox-smoke.dsa.ts"
  }
}
```

Then configure their machine with an ignored `.env.integration.local`:

```text
WINEPREFIX=/path/to/wine/prefix
DAZ_STUDIO_EXE=/path/to/DAZStudio.exe
DAZ_TEST_TIMEOUT_MS=300000
```

Figure/content-dependent tests opt in explicitly:

```json
{
  "scripts": {
    "test:integration": "dazscript integration --fixture ./test/integration/fixtures/framework-integration.dsa.ts --require-content"
  }
}
```

That mode additionally requires:

```text
DAZ_TEST_CONTENT_DUF=/path/to/content.duf
```

New projects should not have to discover this layout manually. The framework `init` command should offer an integration-test bootstrap option that creates the fixture folder, ignored output folder rule, env examples, and npm script.

## Implementation Tasks

### 1. Promote the Framework Runner to a CLI Module

- [ ] Create a temporary framework worktree to avoid editing the active checkout directly:

```bash
git -C /home/fred/workspace/daz/scripts-framework worktree add /home/fred/workspace/daz/scripts-framework-integration-cli -b feature/integration-cli
```

- [ ] Add `dist/scripts/integration.js` with exported functions used by both CLI and tests:

```js
function loadEnvFile(envPath, targetEnv) {}
function resolveIntegrationOptions(cwd, rawOptions, env) {}
function buildFixtureProject(options) {}
function runDazFixture(options) {}
async function runIntegration(rawOptions, injectedEnv) {}

module.exports = {
  loadEnvFile,
  resolveIntegrationOptions,
  buildFixtureProject,
  runDazFixture,
  runIntegration
};
```

- [ ] Move the reusable behavior from `test/integration/run-integration-tests.js` into the new module:
  - Load `.env.integration.local` from the consumer project root.
  - Treat `process.cwd()` as the consumer project root.
  - Resolve `--fixture` relative to the consumer project root.
  - Write generated files under `--out-dir`, defaulting to `./test/integration/out`.
  - Generate a temporary fixture project under the output directory.
  - Depend on the framework package path that owns the CLI module.
  - Compile the fixture with the existing framework build tooling.
  - Launch DAZ headless through the generated launcher.
  - Read and validate `result.json` from the fixture output.

- [ ] Make content loading optional:
  - Always require `DAZ_STUDIO_EXE`.
  - Require `DAZ_TEST_CONTENT_DUF` only when `--require-content` is passed.
  - Always pass a stable result path as script argument 0.
  - Pass the content DUF path as script argument 1 only when present.

- [ ] Keep the generated fixture project self-contained:
  - `package.json` uses `dazscript-framework: file:<frameworkPackageRoot>`.
  - `dazscript-types` remains a package dependency.
  - `tsconfig.json` and fixture build structure mirror the current working framework runner.

### 2. Add the `dazscript integration` Command

- [ ] Update `dist/scripts/cli.js` to register a new `integration` command.

- [ ] Parse these command options:

```text
--fixture <path>          Required path to a .dsa.ts fixture.
--out-dir <path>         Optional output directory, default ./test/integration/out.
--require-content        Require DAZ_TEST_CONTENT_DUF and pass it to the fixture.
--timeout-ms <number>    Optional override for DAZ_TEST_TIMEOUT_MS.
--env-file <path>        Optional override for .env.integration.local.
```

- [ ] Print clear failure messages for:
  - Missing `--fixture`.
  - Missing `DAZ_STUDIO_EXE`.
  - Missing `DAZ_TEST_CONTENT_DUF` when `--require-content` is set.
  - Missing fixture file.
  - DAZ timeout.
  - Fixture result JSON not written.
  - Fixture result JSON with `ok: false`.

### 3. Update Framework Integration Test Entry Point

- [ ] Replace the framework package script with the supported CLI surface:

```json
{
  "scripts": {
    "test:integration": "node ./dist/scripts/cli.js integration --fixture ./test/integration/fixtures/framework-integration.dsa.ts --require-content"
  }
}
```

- [ ] Remove the old hardcoded runner or reduce it to a thin compatibility wrapper that delegates to the CLI module.

- [ ] Preserve the existing framework fixture behavior:
  - Load the configured content DUF.
  - Validate scene and figure-related helpers.
  - Write `result.json`.

### 4. Add Framework Tests for the Reusable Runner

- [ ] Add a focused Vitest file for the Node-side integration module, for example `src/scripts/integration.test.ts`.

- [ ] Test local env loading:
  - Parses simple `KEY=value` lines.
  - Ignores blank lines and comments.
  - Does not overwrite already-defined environment variables unless the CLI explicitly passes an override.

- [ ] Test option resolution:
  - Defaults `outDir` to `test/integration/out`.
  - Resolves fixture paths relative to the consumer project root.
  - Requires `DAZ_STUDIO_EXE`.
  - Requires `DAZ_TEST_CONTENT_DUF` only with `requireContent: true`.

- [ ] Test result handling:
  - Accepts `{ "ok": true }`.
  - Throws with useful failure details for `{ "ok": false, "failures": [...] }`.

### 5. Update Framework Documentation

- [ ] Update `test/integration/README.md` to document both framework-maintainer and consumer-project usage.

- [ ] Add a concise section to the framework `README.md` that points users to the integration README and shows the minimal consumer setup.

- [ ] Update `.env.integration.linux.example` and `.env.integration.windows.example` comments so they explain:
  - `DAZ_STUDIO_EXE` is always required.
  - `DAZ_TEST_CONTENT_DUF` is required only for fixtures or scripts using `--require-content`.
  - `.env.integration.local` is intentionally ignored.

### 6. Update Project Initialization for Integration Tests

- [ ] Inspect the existing `dazscript init` command and its template conventions before changing behavior.

- [ ] Add an init option that bootstraps integration-test files for a consuming project. Prefer an explicit flag so existing init behavior does not become noisier:

```bash
dazscript init --integration-tests
```

- [ ] If the existing init command already has an interactive/options pattern, follow that pattern instead of adding a parallel style.

- [ ] Generate the minimal project files:
  - `test/integration/fixtures/<project-name>-smoke.dsa.ts`
  - `test/integration/README.md`
  - `.env.integration.linux.example`
  - `.env.integration.windows.example`

- [ ] Update `package.json` by adding a script without overwriting existing user scripts:

```json
{
  "scripts": {
    "test:integration": "dazscript integration --fixture ./test/integration/fixtures/<project-name>-smoke.dsa.ts"
  }
}
```

- [ ] Update the correct ignore file with:

```text
test/integration/out/
.env.integration.local
```

- [ ] Make generated files idempotent:
  - Do not overwrite an existing fixture unless an existing init overwrite option already covers that behavior.
  - Do not duplicate ignore entries.
  - Do not replace an existing `test:integration` script without warning.

- [ ] Add Node-side tests for the init bootstrap behavior where the current init command is already tested.

### 7. Add a Toolbox Consumer Proof in an Isolated Worktree

- [ ] Create a Toolbox worktree from the current figure-snapshot branch so this proof does not interrupt other work:

```bash
git -C /home/fred/workspace/daz/daz-scripts worktree add /home/fred/workspace/daz/daz-scripts-toolbox-integration -b feature/toolbox-integration-harness feature/genesis9-figure-snapshot
```

- [ ] Update `toolbox/package.json`:
  - Add `"test:integration": "dazscript integration --fixture ./test/integration/fixtures/toolbox-smoke.dsa.ts"`.
  - Point `dazscript-framework` to the local framework checkout for this cross-repo proof, matching the existing local-development pattern used elsewhere in the DAZ workspace:

```json
{
  "dependencies": {
    "dazscript-framework": "file:../../scripts-framework"
  }
}
```

- [ ] Add `toolbox/test/integration/fixtures/toolbox-smoke.dsa.ts`.

- [ ] Keep the Toolbox fixture figure-independent:
  - Import framework helpers through the public framework aliases.
  - Read script arguments with the framework script helper.
  - Use a simple non-figure helper such as scene frame/time behavior.
  - Write a result object to the provided result path.

Example fixture shape:

```ts
import { action } from '@dsf/core/action';
import { saveToFile } from '@dsf/helpers/file-helper';
import { getScriptArguments } from '@dsf/helpers/script-helper';
import { getCurrentFrame, frameToTime, timeToFrame } from '@dsf/helpers/scene-helper';

action({ text: 'Toolbox Integration Smoke', menuPath: false }, () => {
  const args = getScriptArguments();
  const resultPath = String(args[0] || '');
  const failures: string[] = [];

  if (!resultPath) {
    failures.push('missing result path argument');
  }

  const frame = getCurrentFrame();
  const time = frameToTime(frame);
  const roundTripFrame = timeToFrame(time);

  if (roundTripFrame !== frame) {
    failures.push(`frame/time round trip failed: ${frame} -> ${time} -> ${roundTripFrame}`);
  }

  saveToFile(resultPath, JSON.stringify({
    ok: failures.length === 0,
    project: 'toolbox',
    checks: { frame, time, roundTripFrame },
    failures
  }, null, 2));
});
```

- [ ] Ignore Toolbox integration output and local env files in the correct repo-level or package-level ignore file:

```text
toolbox/test/integration/out/
toolbox/.env.integration.local
```

- [ ] Add a small Toolbox integration README or Toolbox README section that says:
  - This is a consuming-project smoke test for the framework harness.
  - It intentionally does not require a figure.
  - Configure `toolbox/.env.integration.local`.
  - Run from `toolbox/` with `npm run test:integration`.

### 8. Local Machine Setup for the Toolbox Proof

- [ ] Create ignored `toolbox/.env.integration.local` on this machine with the same DAZ Studio/Wine settings already proven for the framework:

```text
WINEPREFIX=/home/fred/.local/share/daz-wine/prefix
DAZ_STUDIO_EXE=/home/fred/.local/share/daz-wine/prefix/drive_c/Program Files/DAZ 3D/DAZStudio4/DAZStudio.exe
DAZ_TEST_TIMEOUT_MS=300000
```

- [ ] Do not require or set `DAZ_TEST_CONTENT_DUF` for the Toolbox smoke fixture.

### 9. Verification

- [ ] In the framework worktree, run:

```bash
npm test
npm run test:integration
```

- [ ] In the Toolbox worktree, run:

```bash
npm install
npm test
npm run test:integration
```

- [ ] Confirm generated output is ignored:

```bash
git status --short
```

- [ ] Inspect the DAZ integration result JSON if a failure occurs before making code changes.

### 10. Commit and Merge

- [ ] Commit the framework CLI/docs/test changes on `feature/integration-cli`.

- [ ] Merge `feature/integration-cli` back into framework `main` after verification.

- [ ] Remove the framework implementation worktree.

- [ ] Commit the Toolbox proof on `feature/toolbox-integration-harness`.

- [ ] Merge the Toolbox proof back into `feature/genesis9-figure-snapshot` after verification.

- [ ] Remove the Toolbox implementation worktree.

## Review Notes

- The reusable API is the CLI command, not a test-file import. That matches package publishing boundaries and keeps consumers away from framework internals.
- `--require-content` avoids silently making every consuming project depend on Genesis 9 or another installed figure.
- Toolbox proves the harness works from another package while keeping the first pass intentionally small and figure-independent.
- The framework still keeps a content-dependent fixture, so the original selected-figure/scene helper value is preserved.
- `dazscript init --integration-tests` makes the workflow discoverable for new framework users while keeping existing initialization behavior stable.
