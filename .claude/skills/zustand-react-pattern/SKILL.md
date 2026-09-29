---
name: zustand-react-pattern
description: Zustand v5 traps and this project's store decisions. Use when writing or reviewing a Zustand store, a selector, or a subscription — in the Cartographer chrome or any React code here. For API signatures, read the official docs first (pmndrs MCP / context7), not this file.
---

# Zustand v5 — traps, and what this project decided

**This file is not the API reference.** The official docs are served by the `pmndrs`
MCP server (`docs.pmnd.rs`) and by context7 `/pmndrs/zustand`; the source is vendored
at `opensrc/repos/github.com/pmndrs/zustand` (**v5.0.15** — newer than context7, which
stops at v5.0.12). Look a signature up there. What follows is only what bites, plus the
decisions taken in this repository.

Everything below was checked against v5.0.15 source or the v5 docs, not recalled.

---

## `create<T>()(...)` — the extra parentheses are mandatory

```typescript
// CORRECT — the curried form
export const useYearStore = create<YearStore>()((set, get) => ({ ... }))

// WRONG — TypeScript infers `unknown`
export const useYearStore = create((set, get) => ({ ... }))
```

The empty `()` is a workaround for `microsoft/TypeScript#10571`: `T` sits in both a
covariant and a contravariant position in `create`'s signature, so inference gives up.
The v5 docs are explicit — *"instead of writing `create(...)`, you must explicitly
provide the state type using `create<T>()(...)`"*.

**v5 did not relax this.** Any note claiming v5 "improved type inference" so the plain
form works is wrong; it was in the community skill this file replaces.

---

## Split `State` from `Actions`

```typescript
export interface YearState {
  document: YearDocument
  version: number
}

export interface YearActions {
  moveAnchor: (index: number, at: Point) => void
}

export type YearStore = YearState & YearActions
```

Two interfaces, not one: the initial state is then a literal of `YearState` alone,
which is what a test reset and a `partialize` both need.

---

## Our document is mutated in place — hence a version counter

The Cartographer's `YearDocument` is **mutable on purpose** (P4 step 2: `moveAnchor`
writes into the anchor array). Zustand detects change by reference identity — verified
in source, `setState` does `Object.assign({}, state, partial)`, so the *state object* is
new but the document inside it is the same reference.

```typescript
// A selector on the document alone never fires after an edit.
const document = useYearStore((s) => s.document)   // ✗ silent staleness

// Bump a counter wherever history.commit is called, and select that.
const version = useYearStore((s) => s.version)     // ✓
```

Making the document immutable is not the alternative: it would undo step 2 and make
every anchor move O(N).

---

## One selector per value

```typescript
// WRONG — a fresh object every render, so it re-renders on any state change
const { name, count } = useStore((s) => ({ name: s.name, count: s.count }))

// CORRECT — two selectors
const name = useStore((s) => s.name)
const count = useStore((s) => s.count)

// CORRECT — one selector, shallow-compared (v5 path, verified in v5.0.15 source)
import { useShallow } from 'zustand/react/shallow'
const { name, count } = useStore(useShallow((s) => ({ name: s.name, count: s.count })))
```

`zustand/shallow` + a second argument is the **v4** form and is gone in v5.

---

## `set()` is synchronous, the re-render is not

`set()` updates the store immediately, so `get()` right after it reads the new value.
React re-renders on its own schedule, so a component still shows the old one until then.
Read through `get()` / `getState()` when the answer is needed now; never assert on a
component's rendered output in the same tick as the action.

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

## Subscribing outside React — how the canvas reads the store

The Cartographer paints imperatively: the overlay canvas redraws on `pointermove` and
the status bar is written by hand, never by a React render. That is a subscription with
a selector, which needs the `subscribeWithSelector` middleware — plain `subscribe` only
takes a listener.

```typescript
import { subscribeWithSelector } from 'zustand/middleware'

export const useYearStore = create<YearStore>()(
  subscribeWithSelector((set, get) => ({ ... })),
)

const unsubscribe = useYearStore.subscribe(
  (s) => s.version,
  (version) => repaintStaticCanvas(version),
  { fireImmediately: true },   // paint on wiring, not on the first change
)
```

Options are `{ equalityFn?, fireImmediately? }` — both read off the v5.0.15 type.
`unsubscribe` is the teardown handle; it belongs with the other `dispose()` calls, same
rule as a three.js resource.

**Do not adopt "always use `subscribeWithSelector`" as a blanket rule** — it earns its
place here because we genuinely subscribe outside React. A store nobody subscribes to
from outside does not need it.

---

## Derived values go in the selector, not in the state

```typescript
const anchorCount = useYearStore((s) => s.document.anchors.length)
```

Storing a derived count means a second thing to keep in step by hand, which is the
failure this codebase has already paid for twice. For an expensive derivation, memoise
in the component with `useMemo`, outside the store.

---

## Testing

```typescript
const initialState: YearState = { document: createYearDocument(...), version: 0 }

beforeEach(() => {
  useYearStore.setState(initialState)   // merges: state reset, actions kept
})
```

The store is a module singleton, so state leaks between tests unless it is reset.

**Do not reach for `setState(initialState, true)` here.** Read in v5.0.15 source: with
`replace` truthy the state *becomes* the object passed, so a `YearState` literal wipes
every action off the store and the next call throws. `replace: true` is only correct
when the object passed carries the actions too. The merging form is what a reset wants.

Follow `rules/tests.md` (5 levels) as for any other module.

---

## House rules that override any snippet found online

- **No `console.log`** — `console.warn` / `console.error` only. The community skills this
  file replaces used `console.log` in their logging and debugging examples.
- **No explicit `any`** — the tsconfig is strict, and `exactOptionalPropertyTypes` plus
  `noUncheckedIndexedAccess` are on.
- **JSDoc on every exported store, action type and notable constant.**
- **Inject, never reach** — a store imported directly by a pure module is the global
  singleton `rules/modular-architecture.md` forbids. Pure logic takes data and returns
  data; the store is wired at the composition root.

---

## Common traps, in one table

| Trap | What it costs | Way out |
| --- | --- | --- |
| `create<T>(...)` without the empty `()` | `T` infers as `unknown` | `create<T>()(...)` |
| Selecting a mutated document | The screen silently lies | Select a version counter |
| Selector builds an object | Re-renders on every change | One selector per value, or `useShallow` |
| Closure read after an `await` | Stale write over a newer one | `get()` after every `await` |
| `subscribe` with a selector, no middleware | Type error, or the listener never fires | `subscribeWithSelector` |
| Store not reset between tests | Tests pass or fail by order | `setState(initialState, true)` |
