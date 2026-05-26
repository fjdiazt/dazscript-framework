# DAZ Integration Tests

Run the fast unit suite with:

```bash
npm test
```

Run the DAZ Studio integration suite with:

```bash
npm run test:integration
```

`test:integration` is opt-in and requires a local DAZ Studio install plus one figure DUF. It builds a generated consumer-style fixture project under `test/integration/out/fixture/`, launches DAZ Studio headless through the generated launcher, and validates framework helpers against real DAZ runtime objects.

Required environment:

```text
DAZ_STUDIO_EXE
DAZ_TEST_CONTENT_DUF
```

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

The figure does not have to be Genesis 9. The first-pass assertions are figure-agnostic and cover:

- `scene-helper` frame/time helpers
- `node-helper` figure, bone, root, and body-part helpers

Generated files are ignored by git and left in `test/integration/out/` after failures for inspection.
