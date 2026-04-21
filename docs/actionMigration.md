# Action Migration Plan

## Goal

Replace the current script authoring model:

- `@action(...)` on a class
- `extends BaseScript`
- explicit `new Script().exec()` or `new Script().run()`

with a function-based action entrypoint:

```ts
import { action } from '@dsf/core/action'

action({ text: 'Hello World' }, () => {
    debug('Hello World!')
    info('Hello World!')
})
```

This migration is a full cutover. Backward compatibility is not required.

## Target Authoring Model

Each runnable `.dsa.ts` file should define exactly one action by calling `action(...)` at module scope.

Example:

```ts
import { action } from '@dsf/core/action'
import { debug } from '@dsf/common/log'
import { info } from '@dsf/helpers/message-box-helper'

action({ text: 'Hello World' }, () => {
    debug('Hello World!')
    info('Hello World!')
})
```

Expected properties of the new model:

- no script class required
- no `BaseScript` inheritance required
- no `run()` or `exec()` call required
- action metadata and runtime body live in one place
- one obvious entry pattern for every runnable file

## Why Migrate

The current model has extra ceremony for simple scripts:

- class declaration
- base class inheritance
- abstract method override
- explicit instance creation

Those pieces add structure, but most scripts only need:

- action metadata
- a safe execution wrapper
- the body of the script

The new model keeps those three concerns while removing the rest.

## Non-Goals

- preserve the class decorator API
- support both old and new models in parallel
- keep `BaseScript` as part of the primary authoring path
- support multiple runnable actions in a single `.dsa.ts` file

## Proposed API

### Primary API

```ts
type ActionDefinition = {
    text?: string
    description?: string
    icon?: string
    menuPath?: string | boolean
    toolbar?: string
    sort?: number
    group?: string
    shortcut?: string
    bundle?: string | boolean
}

export function action(definition: ActionDefinition, body: () => void): void
```

### Runtime Behavior

`action(...)` should:

- derive a display name from `definition.text` or file name
- announce execution in the log
- execute the callback
- catch errors
- log the script failure
- rethrow via the existing framework error path

### Future Optional Extensions

Not part of the first migration:

- overload with options object for undo wrapping
- async support if the framework ever needs it
- manifest generation from the build pipeline

## Files Likely To Change

### Framework runtime

- `src/core/action.ts`
- `src/core/action-decorator.ts`
- `src/core/base-script.ts`

### Installer generation

- `dist/scripts/install-generator.js`
- generated `src/Install.dsa.ts`
- generated `src/Uninstall.dsa.ts`

Likely follow-up:

- move source version of installer generation into `src/scripts/` so it is easier to maintain than editing only built output

### Documentation

- `README.md`
- `docs/OVERVIEW.md`
- install and uninstall workflow docs that describe how actions are discovered
- samples under `src/samples/`

### Consumer scripts

- all runnable `*.dsa.ts` files in:
  - `scripts/common`
  - `scripts/paramate`
  - `scripts/power-menu`

## Migration Strategy

### Phase 1: Finalize the API

Decide the exact runtime shape of `action(...)`.

Required decisions:

- whether `action(...)` lives in `@dsf/core/action`
- whether the old `action-decorator.ts` file is deleted or replaced with a compatibility stub during the migration branch
- whether script name is derived from `definition.text`, the file name, or both
- whether undo support is part of the first API or deferred

Recommended decisions:

- export `action` from `@dsf/core/action`
- remove decorator semantics entirely
- use `definition.text` for user-facing messages
- defer undo options until after the cutover

### Phase 2: Implement the runtime helper

Create the new `action(...)` function.

Responsibilities:

- normalize the action definition
- wrap execution with existing log/error behavior
- keep implementation small and obvious

This should replace the behavior currently provided by `BaseScript.exec()`.

### Phase 3: Replace installer discovery

Current installer generation parses source files for `@action(...)` class decorators.

It must be changed to parse:

```ts
action({ ... }, () => { ... })
```

Required behavior:

- scan `.dsa.ts` files
- find top-level `action(...)` calls
- extract the first argument as action metadata
- preserve existing defaulting rules for menu path, icon discovery, bundle handling, and shortcut metadata

Recommended rule:

- exactly one top-level `action(...)` call per `.dsa.ts` file

The installer generator should fail clearly if:

- no `action(...)` call is found
- more than one `action(...)` call is found
- the first argument is not statically readable

### Phase 4: Verify generated install and uninstall outputs

After installer discovery is updated, verify that install artifacts still behave the same from the user point of view.

Required tasks:

- confirm generated `Install.dsa.ts` still installs actions with the expected metadata
- confirm generated `Uninstall.dsa.ts` still removes the same actions correctly
- confirm menu, toolbar, shortcut, icon, and bundle metadata still round-trip through generation unchanged
- confirm default menu path handling still matches the old behavior
- confirm projects that run `prebuild -> installer -> build` do not need any script-level changes beyond the authoring migration

Recommended additional task:

- compare generated installer output before and after the migration for a representative sample project

## Parser Approach

The current installer generator uses `ts-file-parser` against class decorators.

Options:

1. Keep `ts-file-parser` if it can reliably inspect call expressions in the needed shape.
2. Replace it with a TypeScript AST walk for top-level `action(...)` calls.

Recommendation:

Use a TypeScript AST walk. It is more explicit and better aligned with the new syntax than forcing decorator-oriented parsing tools into a non-decorator shape.

## BaseScript Decision

`BaseScript` should stop being part of the public script-authoring path.

Options:

1. Delete it immediately.
2. Keep it as an internal legacy utility for a short cleanup period.

Recommendation:

Keep the file briefly during migration if that reduces churn, but remove it from docs, samples, and imports immediately. Delete it once all consumer scripts and framework references are gone.

## Source Migration Rules

Each runnable script should be rewritten from:

```ts
@action({ text: 'Example' })
class ExampleScript extends BaseScript {
    protected run(): void {
        body()
    }
}

new ExampleScript().exec()
```

to:

```ts
action({ text: 'Example' }, () => {
    body()
})
```

Additional rules:

- remove `BaseScript` imports
- replace `@dsf/core/action-decorator` imports with `@dsf/core/action`
- inline the script body into the callback
- keep helper/service classes unchanged unless they only existed to satisfy the old script class structure

## Documentation Changes

Update all framework docs and samples to show only the new API.

Required updates:

- README quick start
- README action section
- sample scripts
- overview docs that currently mention decorators and `BaseScript`
- installer documentation that says action metadata is discovered from `@action(...)` decorators
- installation documentation that references the old class-based script pattern

Documentation should explicitly state:

- `.dsa.ts` files are executable entry modules
- each entry module declares one `action(...)`
- the callback passed to `action(...)` is the script body

## Validation Checklist

Before considering the migration complete:

- framework build succeeds
- installer generation succeeds
- generated `Install.dsa.ts` and `Uninstall.dsa.ts` still contain correct metadata
- generated install and uninstall scripts still execute successfully in Daz Studio
- sample scripts build successfully
- `scripts/common` builds successfully
- `scripts/paramate` builds successfully
- `scripts/power-menu` builds successfully
- at least one menu action, one toolbar action, and one bundled action still install correctly

## Risks

### Installer parser fragility

The biggest migration risk is action discovery. The runtime helper is simple. The build-time metadata extraction is the part that must stay deterministic.

Mitigation:

- require one simple top-level call shape
- fail loudly on unsupported patterns
- avoid “smart” inference

### Hidden BaseScript coupling

Some scripts may rely on inherited helpers such as `acceptUndo(...)` or implicit script naming behavior.

Mitigation:

- search for all `extends BaseScript`
- identify which inherited behaviors are actually used
- replace those behaviors with explicit helpers where needed

### Naming consistency

If script names are currently based on class names, switching to metadata-based names could slightly change logging or undo labels.

Mitigation:

- define one naming rule up front
- use it consistently across runtime and installer generation

## Suggested Execution Order

1. Add `docs/actionMigration.md`.
2. Implement `src/core/action.ts`.
3. Update installer generation to discover `action(...)` calls.
4. Verify generated install and uninstall outputs still match the expected install behavior.
5. Convert framework samples.
6. Update framework README and docs, including install workflow documentation.
7. Migrate consumer scripts in `scripts/common`.
8. Migrate consumer scripts in `scripts/paramate`.
9. Migrate consumer scripts in `scripts/power-menu`.
10. Remove `BaseScript` from public usage and delete it if no longer referenced.

## Open Decisions

These should be resolved before implementation starts:

- final module path for the new helper
- whether the helper should support undo in v1 of the migration
- whether script logging name should come from `text`, file name, or an optional explicit name
- whether installer generation should produce an intermediate manifest as part of this migration or remain direct for now

## Recommendation

Proceed with a strict, minimal model:

- one top-level `action(definition, body)` call per `.dsa.ts` file
- no decorator support
- no base script inheritance
- no transition layer
- explicit installer parsing for that single supported shape

That gives the framework the simplest authoring story and the smallest long-term surface area.
