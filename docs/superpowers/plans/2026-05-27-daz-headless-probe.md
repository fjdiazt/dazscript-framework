# DAZ Headless Probe Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a non-asserting `dazscript probe` command for AI-agent DAZ runtime exploration and bootstrap probe folders in the plugin and Toolbox repos.

**Architecture:** `scripts-framework` owns the reusable headless DAZ build/launch/result infrastructure. `probe` reuses the integration fixture project pipeline but reads any valid JSON result as observations instead of requiring `ok: true`. Consumer repos own their checked-in reusable probes and ignored scratch output.

**Tech Stack:** Node CommonJS CLI under `dist/scripts`, DAZ Studio `-headless -noPrompt`, TypeScript DAZ fixtures, existing framework build pipeline, Vitest for framework-side command tests.

---

## Tasks

- [ ] Add probe option resolution to `dist/scripts/integration.js` with default output `./probes/out`, env file `.env.probe.local`, app data path `DazScriptFramework/probes`, and bundle name `Probe Fixture`.
- [ ] Add `runProbe` and `readProbeResult` that treat readable JSON as success and fail only on infrastructure errors.
- [ ] Register `dazscript probe` in `dist/scripts/cli.js` and document it in help.
- [ ] Add `--probes` init support in `dist/scripts/init.js`, including a reusable scene probe fixture, `probes/README.md`, env examples, `probe` npm script, and ignored `probes/out/` plus `.env.probe.local`.
- [ ] Cover the probe command and init scaffold in `src/scripts/integration.test.ts` and `src/scripts/init.test.ts`.
- [ ] Update framework README/integration docs to explain integration vs probe.
- [ ] Bootstrap `C:\src\daz\plugins` with `scripts/probe.ps1`, `probes/fixtures/plugin-scene.dsa.ts`, `probes/README.md`, and ignore entries.
- [ ] Bootstrap `C:\src\daz\scripting\scripts\toolbox` with `probes/fixtures/toolbox-scene.dsa.ts`, `probes/README.md`, npm script, and ignore entries without touching existing dirty work.
- [ ] Verify framework unit tests and run one probe through the Publishing Build DAZ executable.
