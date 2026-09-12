---
name: test
description: Write tests for a scene module, port, hook, or utility following the 5-level test policy. Use when creating or updating tests for any code unit.
allowed-tools: Read Write Glob Grep Bash(pnpm:*)
argument-hint: "[ModuleName or path]"
paths:
  - src/**
metadata:
  version: "2.0"
---

# Test

Write tests following the mandatory 5-level test policy (see `.claude/rules/tests.md`).
Stack: **Vitest** (to install in Phase 0.1). three.js runs in tests with a mocked renderer/context;
DOM-dependent files opt into `jsdom`.

## Arguments

`$ARGUMENTS` = module/port/util name or file path (e.g. `ReliefMesh`, `CameraStateStore`, `heightmap`)

## Steps

1. **Read the source** — read all files of the unit to understand its ports, branches, async behavior.
2. **Determine the layer** — scene module / three.js, port (data/camera/controls), or util/hook.
3. **Write the test file** following the 5-level structure below, injecting **mocks** for collaborators.
4. **Run tests** — `pnpm test` to verify all pass.

## 5-Level Structure (MANDATORY — no level skipped)

```ts
import { describe, expect, it, vi } from "vitest";

import { ModuleName } from "./ModuleName";

describe("ModuleName", () => {
  describe("happy path", () => {
    // L1 — nominal: constructs with injected mocks, port returns expected shape, interaction works
  });

  describe("variants", () => {
    // L2 — each valid parameter/branch (displacement scales, control keys, picking zones)
  });

  describe("managed errors", () => {
    // L3 — handled errors: missing heightmap fallback, corrupt camera state → clean reset
  });

  describe("unmanaged errors", () => {
    // L4 — unexpected: malformed asset, unexpected null. If N/A: `// L4: N/A — no async operations`
  });

  describe("edge cases", () => {
    // L5 — boundaries: 1×1 heightmap, extreme fov/zoom, rapid mount/unmount (no GPU leak), off-target click
  });
});
```

## Layer-Specific Guidance

### Scene modules / three.js (`src/scene`, `src/picking`)

- Construct with **injected mocks** (renderer, scene, camera). Check each variant.
- Verify `dispose()` frees geometries/materials/textures on teardown (L5).
- Picking: mocked `Raycaster` → returns the right intersection (L2), nothing off-target (L3/L5).

### Ports & utils (`src/data`, `src/camera`, `src/controls`)

- Check return shape, valid combinations, error handling, cleanup.
- `CameraStateStore`: save→restore round-trip identical (L1); empty/corrupt storage (L3–L4).
- DOM-dependent files opt into jsdom via `// @vitest-environment jsdom`.

## Rules

- **Inject mocks for collaborators** — a unit that can't be tested in isolation must be reworked
  (see `.claude/rules/modular-architecture.md`).
- **Never hardcode fallback values** in expectations — if the code shouldn't have fallbacks, neither should the test.
- **Mock only external boundaries** — never mock the unit under test.
- **One behavior per `it()`** — the name describes behavior, not implementation.

## File Naming

| Layer             | Test file location                |
| ----------------- | --------------------------------- |
| Scene module      | `scene/ModuleName.test.ts`        |
| Port / util       | `data/portName.test.ts`           |
| Camera / controls | `camera/CameraStateStore.test.ts` |
| Hook              | `hooks/useHook.test.ts`           |
