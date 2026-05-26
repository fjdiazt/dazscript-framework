# DAZ Headless Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an opt-in `npm run test:integration` command that builds a consumer-style fixture project and runs it inside DAZ Studio headless.

**Architecture:** A plain Node runner validates env, generates an ignored fixture project under `test/integration/out/fixture`, builds it through the local framework CLI, launches DAZ through the generated launcher, and asserts structured JSON written by a DAZ-side TypeScript fixture. The DAZ fixture covers one scene-helper area and one node-helper area while remaining figure-agnostic.

**Tech Stack:** Node CommonJS, npm scripts, framework TypeScript build pipeline, DAZ Script, DAZ Studio `-headless -noPrompt`, Vitest unit tests unchanged.

---

## File Structure

- Modify `.gitignore`: ignore `/test/integration/out/`.
- Modify `package.json`: add `test:integration`.
- Create `test/integration/fixtures/framework-integration.dsa.ts`: DAZ-side fixture action.
- Create `test/integration/run-integration-tests.js`: Node integration runner.
- Create `docs/superpowers/plans/2026-05-26-daz-headless-integration.md`: this plan.

## Task 1: Wire Command And Ignored Output

**Files:**
- Modify: `.gitignore`
- Modify: `package.json`

- [x] **Step 1: Add ignored integration output**

Add this line to `.gitignore`:

```gitignore
/test/integration/out/
```

- [x] **Step 2: Add package script**

Add this script to `package.json`:

```json
"test:integration": "node ./test/integration/run-integration-tests.js"
```

- [x] **Step 3: Verify JSON parses**

Run:

```bash
node -e "JSON.parse(require('fs').readFileSync('package.json','utf8')); console.log('package ok')"
```

Expected: `package ok`

## Task 2: Add DAZ-Side Fixture

**Files:**
- Create: `test/integration/fixtures/framework-integration.dsa.ts`

- [x] **Step 1: Create fixture action**

Create `test/integration/fixtures/framework-integration.dsa.ts` with an `action({ text: 'Framework Integration Test', menuPath: false }, ...)` entrypoint.

The fixture must:

- read result path and content DUF path from `getStringScriptArguments()`
- run scene-helper frame/time assertions
- open the supplied DUF with `App.getContentMgr().openFile(contentPath, true)`
- resolve a selected/root figure
- discover a real body bone by walking `getChildren(figure, true, false, false)`
- assert `isFigure`, `isBone`, `getFigure`, `getRoot`, and `isBodyPartOf`
- write structured JSON with `saveToFile(resultPath, JSON.stringify(result, null, 2))`
- catch unexpected errors and write failure JSON where possible

- [x] **Step 2: Build the framework**

Run:

```bash
npm run build
```

Expected: build completes successfully.

## Task 3: Add Node Integration Runner

**Files:**
- Create: `test/integration/run-integration-tests.js`

- [x] **Step 1: Create runner**

Create a CommonJS runner that:

- validates `DAZ_STUDIO_EXE` and `DAZ_TEST_CONTENT_DUF`
- normalizes Windows and Wine content paths for DAZ
- removes and recreates `test/integration/out/fixture`
- writes generated `package.json`, `tsconfig.json`, and `dazscript.config.ts`
- copies the fixture source into generated `src/framework-integration.dsa.ts`
- runs `npm install --ignore-scripts` inside the generated fixture
- runs `npm run build` inside the generated fixture
- launches DAZ headless through generated `out/framework-integration.dsa`
- passes `-scriptArg <result-path>` and `-scriptArg <content-path>`
- reads `result.json`
- fails when `ok !== true`, when DAZ exits nonzero, or when result JSON is missing

- [x] **Step 2: Verify missing-env failure**

Run:

```bash
npm run test:integration
```

Expected: command fails clearly and mentions both required variables when they are missing.

## Task 4: Run Full Local Integration

**Files:**
- Generated only under `test/integration/out/`

- [x] **Step 1: Run full integration on this Linux/Wine machine**

Run:

```bash
WINEPREFIX="$HOME/.local/share/daz-wine/prefix" \
DAZ_STUDIO_EXE="$HOME/.local/share/daz-wine/prefix/drive_c/Program Files/DAZ 3D/DAZStudio4/DAZStudio.exe" \
DAZ_TEST_CONTENT_DUF="$HOME/.local/share/daz-wine/prefix/drive_c/users/Public/Documents/My DAZ 3D Library/People/Genesis 9/Genesis 9.duf" \
npm run test:integration
```

Expected: integration passes and reports the generated result path.

## Task 5: Final Verification And Commit

**Files:**
- All changed files

- [x] **Step 1: Run unit tests**

Run:

```bash
npm test
```

Expected: all existing unit tests pass.

- [x] **Step 2: Check git status**

Run:

```bash
git status --short --branch
```

Expected: only intended tracked files are changed; `test/integration/out/` is ignored.

- [x] **Step 3: Commit implementation**

Run:

```bash
git add .gitignore package.json test/integration docs/superpowers/plans/2026-05-26-daz-headless-integration.md
git commit -m "feat: add DAZ integration test harness"
```

Expected: commit succeeds.
