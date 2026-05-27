# DAZ Integration Tests

Run the fast unit suite with:

```bash
npm test
```

Run this repository's DAZ Studio integration suite with:

```bash
npm run test:integration
```

The framework fixture uses:

```bash
node ./dist/scripts/cli.js integration --fixture ./test/integration/fixtures/framework-integration.dsa.ts --require-content
```

It builds a generated consumer-style fixture project under `test/integration/out/fixture/`, launches DAZ Studio headless through the generated launcher, loads the configured content DUF, and validates framework helpers against real DAZ runtime objects.

## Environment

`DAZ_STUDIO_EXE` is required for every integration test.

`DAZ_TEST_CONTENT_DUF` is required only when the fixture or npm script uses `--require-content`.

You can set these in your shell, or copy one of the example files to `.env.integration.local`:

```bash
cp .env.integration.linux.example .env.integration.local
```

```powershell
Copy-Item .env.integration.windows.example .env.integration.local
```

`.env.integration.local` is ignored by git. Shell environment variables override values from the local env file.

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

The framework fixture does not have to use Genesis 9. The assertions are figure-agnostic and cover:

- `scene-helper` frame/time helpers
- `node-helper` figure, bone, root, and body-part helpers

Generated files are ignored by git and left in `test/integration/out/` after failures for inspection.

## Consumer Projects

New projects can bootstrap a no-figure smoke fixture with:

```bash
npx dazscript init --integration-tests
```

For an existing project, add a fixture and script manually:

```json
{
  "scripts": {
    "test:integration": "dazscript integration --fixture ./test/integration/fixtures/project-smoke.dsa.ts"
  }
}
```

The no-figure form requires only `DAZ_STUDIO_EXE`. Add `--require-content` to the npm script only when a fixture needs a content DUF:

```json
{
  "scripts": {
    "test:integration": "dazscript integration --fixture ./test/integration/fixtures/project-figure.dsa.ts --require-content"
  }
}
```

## Headless Probes

Use probes when the goal is exploratory runtime observation rather than pass/fail assertions:

```bash
dazscript probe --fixture ./probes/fixtures/scene-globals.dsa.ts
```

Probe fixtures use the same generated project and headless DAZ launch path as integration fixtures. The difference is the result contract: `integration` requires result JSON with `ok: true`; `probe` succeeds when DAZ completes and writes readable JSON. The JSON can contain `status: "observed"`, `status: "inconclusive"`, findings, timings, object shapes, loaded plugin state, or artifact paths.

New projects can bootstrap a probe folder with:

```bash
npx dazscript init --probes
```

The default probe env file is `.env.probe.local`, and generated output is written to `probes/out/`.
