# Architecture — Review Rules

> Authoritative rules live in the subagent prompt `.claude/agents/review/architecture.md` (ARCH-0xx),
> backed by `.claude/rules/architecture.md` and `.claude/rules/modular-architecture.md`.

Single-app project: `src/{main,scene,camera,controls,picking,data,assets}`. Stack TS + three.js + Vite.

Summary of what `review-architecture` checks (see the agent for full detail):

- **ARCH-001** hard coupling / global-singleton dependency — collaborators (renderer/scene/camera,
  data/heightmap/storage ports) are **injected**, not imported-and-instantiated. No import cycles.
- **ARCH-002** hardcoded magic config values — centralize displacement scale, `fov`, speeds, thresholds.
- **ARCH-003** editing generated artefacts (`dist/**`, `build/**`).
- **ARCH-004** seam without an explicit contract (named port type/interface).
- **ARCH-005** module not testable in isolation with mocks.
- **ARCH-006** GPU resource leak (missing `dispose()` on teardown).
- **ARCH-007** SRP / over-broad module; **ARCH-008** barrel anti-patterns;
  **ARCH-009** undeclared/unused deps; **ARCH-010** naming; **ARCH-011** unused exports.

Finding schema: `schema.json`.
