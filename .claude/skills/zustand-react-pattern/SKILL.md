---
name: zustand-react-pattern
description: Zustand v5 traps and this project's store decisions. Use when writing or reviewing a Zustand store, a slice, a selector, or a subscription — in the Cartographer chrome or any React code here. For API signatures, read the official docs first (pmndrs MCP / context7), not this file.
---

# Zustand v5 — traps, and what this project decided

**This file is not the API reference.** The official docs are served by the `pmndrs`
MCP server (`docs.pmnd.rs`) and by context7 `/pmndrs/zustand`; the source is vendored
at `opensrc/repos/github.com/pmndrs/zustand` (**v5.0.15** — newer than context7, which
stops at v5.0.12). Look a signature up there. What follows is only what bites, plus the
decisions taken in this repository.

Everything below was checked against v5.0.15 source, the official docs, or this repo's
own gate — not recalled.

---

## This repository's shape, decided 2026-10-05

```
packages/cartographer/src/state/
├── store.ts          # combines the slices, and carries the middleware
└── editionSlice.ts   # one slice: the document, its undo line, later the selection
```

**One bound store, built from slices, one slice per *owner of a piece of state*.** The
dev's call — *"si j'avais fait ça avec Redux il y aurait une slice par zone"* — with one
correction that came out of the code: a slice goes with **who writes a piece of state**,
not with the panel that displays it. The document is read by the canvas *and* by
`{Polities}`, `{Details}` and `{Overrides}`, so no panel owns it. The active tool belongs
to `{Tools}` alone, so that one will be its own slice.

**A factory, never a module-level store.** `createCartographerStore(deps)` is built at the
composition root (`main.tsx`), which `rules/modular-architecture.md` requires — and which
the edition slice needs anyway, since it has a collaborator to inject.

---

## `create<T>()(...)` — the extra parentheses are mandatory

```typescript
// CORRECT — the curried form
export function createCartographerStore(deps: CartographerStoreDeps) {
  return create<CartographerStore>()(subscribeWithSelector((...a) => ({ ... })))
}

// WRONG — TypeScript infers `unknown`
create((set, get) => ({ ... }))
```

The empty `()` is a workaround for `microsoft/TypeScript#10571`: `T` sits in both a
covariant and a contravariant position in `create`'s signature, so inference gives up.
The v5 docs are explicit — *"instead of writing `create(...)`, you must explicitly
provide the state type using `create<T>()(...)`"*.

**v5 did not relax this.** Any note claiming v5 "improved type inference" so the plain
form works is wrong; it was in the community skill this file replaces.

**The exception, from the same docs page**: with `combine`, `redux`, or any middleware
that *creates* the state, the curried form is **not** recommended — the state can be
inferred. We use neither.

---

## A slice is typed against the **combined** store

```typescript
import type { StateCreator } from 'zustand'

export const createEditionSlice =
  (deps: EditionDeps): StateCreator<
    CartographerStore,                              // the combined store, not this slice
    [['zustand/subscribeWithSelector', never]],     // the mutators the store carries
    [],
    EditionSlice                                    // what this slice contributes
  > =>
  (set, get) => ({ ... })
```

Typing it against the combined store is what will let a later slice read this one through
`get()`. The resulting import cycle between `store.ts` and the slice is **type-only** and
erases at compile time (`verbatimModuleSyntax` is on) — no runtime cycle, and the bundler
confirms it.

**Curried, because a slice creator's signature is fixed at `(set, get, store)`** and leaves
nowhere to pass a dependency. Deps first, slice creator back.

**Mutator identifiers** (from the official docs' own reference table): `devtools` →
`["zustand/devtools", never]` · `persist` → `["zustand/persist", YourPersistedState]` ·
`immer` → `["zustand/immer", never]` · `subscribeWithSelector` →
`["zustand/subscribeWithSelector", never]` · `combine` → no mutator.

---

## Middleware goes on the combined store, and nowhere else

```typescript
// store.ts — CORRECT
return create<CartographerStore>()(
  subscribeWithSelector((...a) => ({
    ...createEditionSlice(deps.edition)(...a),
  }))
)
```

Applied inside a slice it would wrap **that slice's** `set` instead of the store's, so the
subscription it exists for would miss every other slice. **Verified by breaking it**: move
`subscribeWithSelector` off the combined store and both halves of the gate fail — one test
goes red *and* `tsc` refuses the three-argument `subscribe` call.

**Why `subscribeWithSelector` is here at all** — the canvas paints imperatively: the overlay
redraws on `pointermove` and the status bar is written by hand, never by a React render.
That is a subscription with a selector, which plain `subscribe` cannot take.

```typescript
const unsubscribe = store.subscribe(
  (s) => s.version,
  (version) => repaintStaticCanvas(version),
  { fireImmediately: true },   // paint on wiring, not on the first change
)
```

Options are `{ equalityFn?, fireImmediately? }` — both read off the v5.0.15 type.
`unsubscribe` is the teardown handle; it belongs with the other `dispose()` calls, same
rule as a three.js resource.

**Do not adopt "always use `subscribeWithSelector`" as a blanket rule** — it earns its
place here because we genuinely subscribe outside React.

---

## Split `State` from `Actions`

```typescript
export interface EditionState {
  document: YearDocument
  version: number
}

export interface EditionActions {
  commit: (step: HistoryStep) => void
}

export type EditionSlice = EditionState & EditionActions
```

Two interfaces, not one: the state is then expressible as a literal on its own, which is
what a snapshot and a `partialize` both need.

---

## Two reasons a selector lies here, and they break opposite ways

**1. The document is mutated in place.** `YearDocument` is mutable by decision (P4 step 2:
`moveAnchor` writes into the anchor array). Zustand detects change by reference identity —
verified in source, `setState` does `Object.assign({}, state, partial)`, so the *state
object* is new but the document inside it is the same reference.

**2. `History`'s reading side is getters over a mutable cell.** `line.rows` and
`line.markers` call `.map()` on **every read** (`core/editor/history.ts`), so each read
returns a new array. A selector on them makes React's `getSnapshot` return a fresh value per
render, which React refuses outright — and `useShallow` does **not** rescue it, the rows
themselves being new objects. Meanwhile the `History` object *itself* is a stable reference,
so selecting *that* fires nothing.

```typescript
const document = store((s) => s.document)   // ✗ silent staleness
const rows = store((s) => s.rows)           // ✓ a flat snapshot, stable between actions
const version = store((s) => s.version)     // ✓
```

**The only shape where both work**: keep the line in the slice's closure, and publish a
**flat snapshot** of it plus a **version counter** at every action — including the actions
that leave the document alone, since they change what the line *reads as*.

**The trap inside the trap, which cost a sabotage.** `Object.assign` and the object spread
**evaluate getters and copy their values**. So putting getters in the state object works *by
accident*, and a sabotage that does it fails **no test** — the flattening happens downstream
of the snapshot function. What does fail, and what the guard is really worth, is a publisher
that only bumps the counter without re-reading the line: **nine tests**.

Making the document immutable is not the alternative: it would undo step 2 and make every
anchor move O(N).

---

## One selector per value

```typescript
// WRONG — a fresh object every render, so it re-renders on any state change
const { name, count } = store((s) => ({ name: s.name, count: s.count }))

// CORRECT — two selectors
const name = store((s) => s.name)
const count = store((s) => s.count)

// CORRECT — one selector, shallow-compared (v5 path, verified in v5.0.15 source)
import { useShallow } from 'zustand/react/shallow'
const { name, count } = store(useShallow((s) => ({ name: s.name, count: s.count })))
```

`zustand/shallow` + a second argument is the **v4** form and is gone in v5.

---

## `set()` is synchronous, the re-render is not

`set()` updates the store immediately, so `get()` right after it reads the new value.
React re-renders on its own schedule, so a component still shows the old one until then.
Read through `get()` / `getState()` when the answer is needed now; never assert on a
component's rendered output in the same tick as the action.

**And never call `get()` while building the initial state** — the docs show this compiles
and throws at runtime: `get()` returns `undefined` before the state exists.

---

## After every `await`, read through `get()`

A closure captured the state at creation time. This is the same rule the atlas already
lives by — `utils/latestOnly` exists because two overlapping async rebuilds resolved out
of order — so the check is per side effect, not once at the end.

```typescript
save: async () => {
  await writeYear(get().document)
  const current = get().document   // ✓ not the value captured before the await
  set({ savedVersion: current.version })
}
```

---

## Derived values go in the selector, not in the state

```typescript
const anchorCount = store((s) => s.document.anchors.length)
```

Storing a derived count means a second thing to keep in step by hand, which is the
failure this codebase has already paid for twice. For an expensive derivation, memoise
in the component with `useMemo`, outside the store.

**The documented exception is the snapshot above**: a derivation whose *reference* is
unstable has to be taken at the action, because taking it at read time is what React
refuses.

---

## Testing

**The factory removes the reset ritual.** Each test builds its own store, so nothing leaks
between tests and there is nothing to reset:

```typescript
function openStore(limit?: number) {
  const document = sharedBorderDocument()
  return {
    document,
    store: createCartographerStore({
      edition: { document, clone: cloneYearDocument, ...(limit === undefined ? {} : { limit }) },
    }),
  }
}
```

**If you ever do face a module-level store, reset it with `setState(initialState)` — without
`replace`.** Read in v5.0.15 source: with `replace` truthy the state *becomes* the object
passed, so a state literal wipes every action off the store and the next call throws.
`replace: true` is only correct when the object passed carries the actions too.

**Two test shapes worth copying** from `editionSlice.test.ts`:

- the actions are exported separately and exercised against a **stub line** and a recording
  publisher — literals only, no store and no React;
- the hook is read with `renderHook`, and the binding is **not** `use`-prefixed, or the
  rules-of-hooks lint reads the arrow as a component it is not.

Follow `rules/tests.md` (5 levels) as for any other module.

---

## House rules that override any snippet found online

- **No `console.log`** — `console.warn` / `console.error` only. The community skills this
  file replaces used `console.log` in their logging and debugging examples.
- **No explicit `any`** — the tsconfig is strict, and `exactOptionalPropertyTypes` plus
  `noUncheckedIndexedAccess` are on. The first of those is why an optional dep is passed
  with a conditional spread, never as `{ limit: undefined }`.
- **JSDoc on every exported slice, action type and notable constant.**
- **Inject, never reach** — a store imported directly by a pure module is the global
  singleton `rules/modular-architecture.md` forbids. Pure logic takes data and returns
  data; the store is wired at the composition root. Steps 4b and 4c add *pure* `view/` and
  `geometry/` layers to this package, and they must not import `state/`.
- **Name a slice after what it owns, never after the whole application.** `yearStore` was
  rejected on 2026-10-05 for exactly that: the Cartographer edits one year, so "year"
  claims everything and distinguishes nothing.

---

## Common traps, in one table

| Trap | What it costs | Way out |
| --- | --- | --- |
| `create<T>(...)` without the empty `()` | `T` infers as `unknown` | `create<T>()(...)` |
| Middleware inside a slice | It wraps that slice's `set`, so subscriptions miss the rest | Middleware on the combined store only |
| Slice typed against itself | A later slice cannot be reached through `get()` | `StateCreator<Combined, Mutators, [], ThisSlice>` |
| Selecting a mutated document | The screen silently lies | Select a version counter |
| Selecting `line.rows` | A new array per read; React refuses the snapshot | Publish a flat snapshot at the action |
| Selecting the `History` object | Stable reference, so the listener never fires | Same — publish a snapshot |
| Getters left in the state | Works by accident, and no test fails | Read every getter once, in one function |
| Selector builds an object | Re-renders on every change | One selector per value, or `useShallow` |
| Closure read after an `await` | Stale write over a newer one | `get()` after every `await` |
| `get()` during initial state | Compiles, throws at runtime | Never call it there |
| Module-level store reset with `replace` | Wipes every action off the store | A factory per test, or `setState` without `replace` |
