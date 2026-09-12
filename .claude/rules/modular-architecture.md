# Rules — Modular / Pluggable Architecture (SOLID, standalone-testable)

> **Essential, non-negotiable design rule.** Every element we assemble MUST be able to run
> **standalone**, be **pluggable / unpluggable / replaceable**, and **depend on a mock** for any
> collaborator. No hard code-to-code coupling. If a unit can't be taken apart and tested on its own,
> it's wrong — rework it before going further.

## Why (the burn we refuse to repeat)

Tightly-coupled code that can't run in isolation is a trap: a whole subtree held hostage by one
dependency (e.g. an SDK-generated ambient type + build scripts + a global provider → the component is
un-runnable standalone, untestable, un-profilable). We build the opposite: **drop-in / drop-out parts,
no hostage chains.** This is the precondition for being able to take any element apart, mock its world,
and test it — at 10k / 100k rows, check/uncheck, immediate update — without booting the whole app.

## The rule (apply to every component / module / package)

1. **Dependency injection, always.** Collaborators (a state manager, a data source, a skin/resolver, a
   service, a router) are **passed in** (props / params / constructor / adapter), never
   `import`-and-instantiated in place. The unit declares _what it needs_, the caller _provides it_.
2. **Standalone-runnable.** Each unit runs and renders on its own (its own story / test / harness),
   with every dependency satisfied by a **mock or stub**. "Can I new it up with mocks only and exercise
   it?" must be **yes**.
3. **Pluggable / unpluggable / replaceable.** Any implementation behind a seam can be swapped for
   another (real ↔ mock ↔ alternative) without touching the consumer. Wire it in, wire it out.
4. **Explicit contracts at the seams.** Define interfaces / types for every seam (the injected port),
   so implementations are interchangeable and the consumer depends on the **contract, not the concrete**.
5. **No reach-through coupling.** A unit talks to its injected ports only — never reaches into a global
   singleton, an ambient build artefact, or a sibling's internals.

## SOLID mapping (the basis)

- **S — Single responsibility:** one unit, one job (renderer renders; state manager holds state; data
  adapter fetches). Split when two reasons to change appear.
- **O — Open/closed:** extend by composing / plugging a new implementation, not by editing the unit
  (precedent: IconButton extends Button; media/clickable Card composes the surface).
- **L — Liskov:** any implementation of a port is substitutable for another (mock ⇄ real) with no
  surprise to the consumer.
- **I — Interface segregation:** small, focused ports — a consumer depends only on the slice it uses,
  not a fat god-object.
- **D — Dependency inversion:** consumers depend on **abstractions (the injected port)**, and the
  concrete (real service / SDK client / store) is provided from outside. This is the whole rule's spine.

## How to verify a unit is compliant (checklist)

- [ ] Can I instantiate / render it in a test or story with **only mocks** for its collaborators?
- [ ] Can I **swap** a collaborator for another implementation without editing the unit?
- [ ] Does it import **zero** global singletons / ambient build artefacts / sibling internals?
- [ ] Is every seam a **named contract** (interface/type), not a concrete import?
- [ ] Can I **unplug** it from the app and it still runs in its harness?

If any answer is "no", the unit is not done.

## Pragmatic boundary (so it stays engineering, not dogma)

Pluggable **at the real seams** — state, data, skin/resolver, behaviour hooks, services — **not**
gratuitous indirection on every private internal. Over-abstraction has its own cost (indirection,
ceremony). When unsure, **challenge for the seam**: is this a genuine swap point, or abstraction for its
own sake? Add the port where a real second implementation (mock counts) will plug in.

## Reference application — the 3D scene (built this way from the start)

The 3D Europe map is the proving ground for this rule:

- **Renderer / scene / camera injected**, never reached through a global singleton. A scene module
  (relief, lights, picking) receives its collaborators and mounts/tears down cleanly.
- **Heightmap source injected behind a port** → fed by a **mock** (synthetic bitmap or gradient) to test
  the relief standalone, with no real asset.
- **`CameraStateStore` injected** (hot-reload persistence) — a `save/restore` port, swappable for an
  in-memory mock in tests, `sessionStorage` in prod.
- **Controls injected** (arrow-key navigation) — swappable implementation (keyboard, orbit, custom)
  without touching the rest of the scene.
- **Historical-regions layer injected** behind a date-versioned port (M2+) — a minimal GeoJSON mock to
  test the "click → region at time T" binding without the 20 real maps.
- **Assemble freely**: pick a heightmap port, a camera store, controls, a regions layer — and run the
  scene standalone (test/harness) with mocks, without a full app.

> Related rules: `architecture.md` (layers, dependency direction), `decision-tree.md` (skill triggers),
> `troubleshooting.md` (3D seams, decisions).
