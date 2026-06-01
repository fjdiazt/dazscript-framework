# Framework NPM Cleanup Design

Date: 2026-06-01

Repo: `dazscript-framework`

Issue: `https://github.com/fjdiazt/dazscript-framework/issues/6`

## Goal

Clean up the framework npm audit findings and deprecated dependency warnings while protecting the DAZ script compatibility layer from regressions.

The risky part is not only whether Node builds still pass. The framework build pipeline must continue to emit `.dsa` JavaScript that DAZ Studio's QtScript runtime can parse and execute.

## Scope

Address the dependency problems captured in issue #6:

- `glob@7.2.3` and transitive `inflight@1.0.6`
- deprecated `@babel/plugin-proposal-class-properties`
- legacy Babel 6 chain: `babel-core`, `babel-plugin-transform-class-properties`, `babel-register`, `babel-template`, `babel-traverse`, `json5`, and `core-js@2`
- audit findings in `vitest`, `@babel/plugin-transform-modules-systemjs`, `fast-uri`, and `axios` paths

The work may touch `dazscript-types` if that is required to remove the stale `@types/axios` and vulnerable `axios` path, but the primary feature area remains `scripts-framework`.

## Approach

Build the DAZ runtime smoke guard first, then update dependencies under that guard.

This keeps dependency cleanup from becoming a blind build-only update. If a Babel or Webpack change emits syntax DAZ cannot handle, the smoke test should fail before the cleanup is considered safe.

## Regression Guard

Add or formalize a no-content DAZ headless smoke command for the framework.

The command should:

1. Build a tiny generated consumer-style project using the current framework checkout.
2. Compile a `.dsa.ts` fixture through the real Babel/Webpack pipeline.
3. Run the generated launcher script in DAZ Studio headless.
4. Read result JSON written by the DAZ-side fixture.
5. Fail if DAZ exits nonzero, times out, cannot parse the emitted script, does not write a result, or reports failed assertions.

The smoke command should not require `DAZ_TEST_CONTENT_DUF`. It should require only `DAZ_STUDIO_EXE`.

## Smoke Fixture Coverage

The fixture should focus on brittle DAZ compatibility surfaces:

- generated `.dsa` syntax parses in DAZ
- framework imports bundle correctly
- class fields transform to DAZ-safe output
- decorators and metadata still work if still present in the pipeline
- arrow functions and block scoping still transform as expected
- imports/exports are removed or bundled into DAZ-safe script output
- basic DAZ globals are reachable: `App`, `Scene`, and `DzFile`
- result JSON can be written through DAZ file APIs

This is a smoke test, not a broad helper integration test. The existing figure-backed integration test remains the deeper runtime coverage.

## Dependency Cleanup Order

Use small batches:

1. Add or confirm the smoke fixture and command.
2. Replace `glob@7` usage in the framework build path with a maintained glob API, removing `inflight` from the framework-owned path.
3. Remove unused legacy Babel 6 direct dependencies.
4. Remove the deprecated class-properties proposal plugin if the transform plugin fully covers the emitted output.
5. Update framework test/build dependencies that account for audit findings.
6. If required, refresh `dazscript-types` dependencies enough to remove stale `@types/axios` and vulnerable `axios` paths.
7. Refresh the root lockfile.

Each batch should be verified before continuing when the change can affect emitted script syntax.

## Verification

Minimum verification before closing the issue:

```powershell
npm test --workspace scripts-framework
npm run build --workspace scripts-framework
npm run test:integration:smoke --workspace scripts-framework
npm audit --workspace scripts-framework
npm ls inflight glob --workspace scripts-framework
```

Also build at least one downstream script package that consumes the framework, preferably `scripts/toolbox` because it uses the same DAZ script build pipeline heavily.

The existing figure-backed integration command can be run when content paths are available, but the no-content smoke command is the required compatibility guard for this issue.

## Acceptance Criteria

- A repeatable no-content DAZ headless smoke command exists for framework pipeline compatibility.
- The smoke fixture builds through the updated framework pipeline and passes in headless DAZ.
- `npm ls inflight glob --workspace scripts-framework` no longer shows `inflight`, and `glob@7` is gone from the framework-owned dependency path.
- `npm audit --workspace scripts-framework` no longer reports the current critical/high findings, or any remaining findings are documented with a concrete reason.
- Framework unit tests pass.
- Framework build passes.
- At least one downstream framework consumer build passes.

## Non-Goals

- Do not add DAZ Studio to CI.
- Do not require Genesis or other content for the smoke guard.
- Do not expand this cleanup into unrelated framework API refactors.
- Do not remove the existing figure-backed integration test.
