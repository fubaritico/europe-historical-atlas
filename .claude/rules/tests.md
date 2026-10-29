---
paths:
  - "**/*.test.{ts,tsx}"
  - "**/vitest.config.ts"
  - "**/vitest.setup.ts"
---
# Rules — Test Policy — europe-map

> Every scene module, util, hook, port, or bug fix ships with tests.

Stack: **Vitest**, one config per package — `core`, `cms` and `eslint-plugin-eha` under `node`, `atlas` and
`cartographer` under `jsdom`. For real WebGL, mock the context (three.js can run in tests with a
mocked renderer/context — verify via `opensrc/three`).

## Mandatory sequence after every change

1. **Write tests** — 5-level policy below.
2. **`pnpm type-check && pnpm lint && pnpm test`** — all pass.
3. **`/review`** — multi-agent review.
4. **`/commit`** — once the dev has tested it.

## 5-Level Test Policy (mandatory)

Every suite covers these 5 levels. None can be skipped (document if N/A).

### Level 1 — Happy path

The nominal case with valid inputs (module constructs, port returns the expected shape, interaction
produces the expected result).

### Level 2 — Variants

All valid variations — each parameter, each branch (e.g. displacement at several scales, controls with
different keys, picking over different zones).

### Level 3 — Managed errors

Errors the code handles explicitly (missing heightmap → documented and surfaced fallback, corrupt camera
state in storage → clean reset, invalid input → message).

### Level 4 — Unmanaged errors

Unexpected failures (malformed asset, unexpected null/undefined values, async errors surfaced not
swallowed). Verify the `??` fallbacks hold.

### Level 5 — Edge cases

Boundaries and unusual-but-possible scenarios (1×1 heightmap, plane with 0 segments, extreme `fov`/zoom
values, rapid mount/unmount → no GPU leak, click outside any polygon).

## Scope by layer

### Scene modules / three.js

- Constructs with its dependencies **injected (mocks)** (L1); each variant (L2).
- `dispose()` frees resources on teardown (L5).
- Picking: mocked raycaster → returns the right intersection (L2), nothing when off-target (L3/L5).

### Ports & utils (data, camera store, controls)

- Returns the expected shape on success (L1); valid combinations (L2).
- Error handling (L3–L4); cleanup on teardown (L5).
- `CameraStateStore`: save→restore round-trip is identical (L1); empty/corrupt storage (L3–L4).

## Test utilities & mocks

- Inject **mocks** for every collaborator (renderer, heightmap, storage) — see `modular-architecture.md`.
  A module that cannot be tested in isolation must be reworked.
- Mock modules at the top level with `vi.mock(...)`.

## Naming convention

```ts
describe('ModuleName', () => {
  describe('happy path', () => { ... })
  describe('variants', () => { ... })
  describe('managed errors', () => { ... })
  describe('unmanaged errors', () => { ... })
  describe('edge cases', () => { ... })
})
```

## Pragmatic application

Levels are not equal in size. If a level does not apply, document it (`// L4: N/A — no async operation`).
Quality over quantity: each test asserts one meaningful behavior.
