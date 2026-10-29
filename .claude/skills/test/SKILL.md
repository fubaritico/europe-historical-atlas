---
name: test
description: Write tests for any unit in the packages — a core module, an atlas scene module, a Cartographer component or hook, a lint rule — following the 5-level test policy. Use when creating or updating tests.
allowed-tools: Read Write Glob Grep Bash(pnpm:*)
argument-hint: "[ModuleName or path]"
paths:
  - packages/*/src/**
metadata:
  version: "2.0"
---

# Test

Write tests following the mandatory 5-level test policy (see `.claude/rules/tests.md`).
Stack: **Vitest**, one config per package — `core`, `cms` and `eslint-plugin-eha` under `node`, `atlas` and
`cartographer` under `jsdom`. three.js runs in tests with a mocked renderer/context.

## Arguments

`$ARGUMENTS` = module/port/util name or file path (e.g. `reliefMesh`, `cameraState`, `heightmap`, `Panel`)

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

### Scene modules / three.js (`packages/atlas/src/{scene,picking}`)

- Construct with **injected mocks** (renderer, scene, camera). Check each variant.
- Verify `dispose()` frees geometries/materials/textures on teardown (L5).
- Picking: mocked `Raycaster` → returns the right intersection (L2), nothing off-target (L3/L5).

### Ports & utils (`packages/core/src/data`, `packages/atlas/src/{camera,controls}`)

- Check return shape, valid combinations, error handling, cleanup.
- `CameraStateStore`: save→restore round-trip identical (L1); empty/corrupt storage (L3–L4).
- `core` runs under `node` and never takes a jsdom pragma — a stray `document` must fail there. `atlas` and
  `cartographer` are jsdom by config; a React package needs its own `vitest.setup.ts` calling `cleanup()`.

## Rules

- **Inject mocks for collaborators** — a unit that can't be tested in isolation must be reworked
  (see `.claude/rules/modular-architecture.md`).
- **Never hardcode fallback values** in expectations — if the code shouldn't have fallbacks, neither should the test.
- **Mock only external boundaries** — never mock the unit under test.
- **One behavior per `it()`** — the name describes behavior, not implementation.

## File Naming

Beside the source, same camelCase name (`.tsx` for React):

| Layer                  | Example                                                 |
| ---------------------- | ------------------------------------------------------- |
| Scene module           | `atlas/src/scene/relief/reliefMesh.test.ts`             |
| Port / util            | `core/src/data/regionRaster.test.ts`                    |
| Camera / controls      | `atlas/src/camera/cameraState.test.ts`                  |
| Cartographer component | `cartographer/src/ui/components/<Name>/<Name>.test.tsx` |
| Shared hook            | `cartographer/src/ui/hooks/useTranslation.test.tsx`     |
