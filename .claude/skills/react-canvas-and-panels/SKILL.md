---
name: react-canvas-and-panels
description: How React is written in this repository — a generic panel that is handed its slice, and a component that owns an imperative 2D canvas. Use before writing or reviewing any component in the Cartographer, any ref that holds a canvas, and any effect that subscribes to the store. For Zustand itself, read zustand-react-pattern.
---

# React here — panels that are handed their slice, canvases owned by a ref

This repository has exactly one React application, the **Cartographer**: a 2D canvas with a React
chrome. The atlas stays vanilla three.js and must never see one of these rules.

Everything below is either measured in this repository's own `node_modules` on 2026-10-05, or a
decision already recorded in `rules/` — nothing is recalled. **React 19.3.0** is what is installed.

---

## The spine: inject, never reach

One rule produces most of what follows. `rules/modular-architecture.md`: a unit declares what it needs
and the caller provides it.

**Our store makes this unavoidable rather than optional.** `createCartographerStore(deps)` is a
**factory** — there is no module-level `useStore` to import, so a component *cannot* reach the store.
It has to be handed one. That was a deliberate consequence (see `zustand-react-pattern`), and it is
what makes a panel testable with a stub.

---

## A panel is handed its slice, and passes it to the view it contains

The dev's shape, 2026-10-05: *"un composant panel générique, il appellerait une certaine slice, il
l'injecterait dans la vue qu'il contient."*

```tsx
/** The shell: a title, a body, and no knowledge of what is in it. */
export function Panel({ title, children }: { title: string; children: ReactNode }) { … }

/** What a panel's view needs: the values it shows and the actions it offers. Never the store. */
export interface HistoryView {
  rows: readonly HistoryRow[]
  goTo: (index: number) => void
}

/** The view: pure, exercisable with a literal. */
export function HistoryList({ rows, goTo }: HistoryView) { … }

/** The binding: the one place that knows there is a store at all. */
export function HistoryPanel({ store }: { store: CartographerStoreHook }) {
  const rows = store((s) => s.rows)
  const goTo = store((s) => s.goTo)
  return (
    <Panel title="History">
      <HistoryList rows={rows} goTo={goTo} />
    </Panel>
  )
}
```

**Three layers and the middle one is the point**: the shell knows nothing, the view takes data, and a
thin binding reads the slice. A test renders `HistoryList` with four literal rows and no store exists.

**The anti-pattern, and it is the one to watch for**: a view that selects from the store itself. It
reads shorter and it costs the test — the component can then only be rendered with a whole store
behind it, and the panel stops being generic.

**One selector per value**, as `zustand-react-pattern` says: a selector returning an object builds a
new one every render.

---

## How the store reaches a deep component

**One React context, created at the composition root, holding the store handle.** Not prop-drilling:
`{Polities}` is a tree and `{Details}` sits several levels down, so the handle would be threaded
through components that have no use for it — which is the prop drilling `solid-react-principles`
names. Zustand's own answer for a per-instance store is a context too.

The context holds **the handle, never a value**: a context carrying state re-renders every consumer,
which is exactly what the store exists to avoid.

```tsx
const StoreContext = createContext<CartographerStoreHook | null>(null)

/** Throws rather than returning a default: a component outside the provider is a wiring fault. */
export function useCartographerStore(): CartographerStoreHook {
  const store = use(StoreContext)
  if (store === null) throw new Error('Cartographer: no store in context — mount the provider.')
  return store
}
```

The throw is a decision, not a detail (`rules/error-handling.md`): a silent default would render a
panel showing someone else's empty document, and nothing would say so. Same argument as `#root` in
`main.tsx`.

---

## A canvas is owned by a ref callback, not by an effect

**Measured, not assumed**: in React 19 a `ref` callback may **return a cleanup function** —
`@types/react`'s `RefCallback<T>` is `(instance: T | null) => void | (() => …)`. That is the right
tool, and it is better than `useEffect` here for two reasons: the painter's life becomes exactly the
node's life, and there is **no dependency array to get wrong**.

```tsx
export function MapCanvas({ store }: { store: CartographerStoreHook }) {
  return (
    <canvas
      ref={(node) => {
        if (node === null) return
        const painter = createPainter(node)              // imperative, no React inside
        const stop = store.subscribe(
          (s) => s.version,
          (version) => { painter.repaint(version) },
          { fireImmediately: true },                      // paint on wiring, not on the first change
        )
        return () => {
          stop()
          painter.dispose()
        }
      }}
    />
  )
}
```

**`StrictMode` double-invokes this in development, and that is why it is kept** — `main.tsx` says so:
painting is a side effect and the temptation is to do it during a render. So the cleanup has to be
real: a `dispose` that leaves a listener or a subscription behind shows up as a doubled repaint, not
as an error. **Verify it by mounting twice**, never by reading the code.

**Do not put app-wide initialisation in a component's effect.** A component remounts and the effect
re-runs; what must happen once belongs in the entry module. (This is the `advanced-init-once` rule of
the archived Vercel skill, restated — see `rules/decision-tree.md` for why that skill is not
committed.)

---

## Two canvases, and the status bar is not React

Decided for step 4 and not to be reopened: **a static canvas redrawn on commit, an overlay redrawn on
`pointermove`**, and the status bar **written imperatively**.

What this means in practice, and it is the rule that keeps a canvas application fast: **per-frame
state never goes through a component.** The viewport during a drag, the rubber band, the marquee, the
hover — none of them is React state. Route any of them through `useState` and reconciliation runs at
60 Hz, which is what actually kills these applications (`rules/troubleshooting.md`).

The store holds the **settled** viewport, committed at the end of a gesture, which is what the static
canvas reads. That is why `state/` is allowed to read `view/` and not the reverse.

---

## Device pixels, and the resize nobody remembers

`view/`'s arithmetic is declared in **device pixels of the backing store**, not CSS pixels. So:

- set `canvas.width/height` to `clientWidth/Height × devicePixelRatio`, and the CSS size separately;
- convert a pointer event's CSS coordinates **once**, where the events arrive;
- watch the element with a `ResizeObserver` created in the same ref callback and disconnected in its
  cleanup — a `window` resize listener misses a splitter being dragged, and the dock has one.

`devicePixelRatio` can change (a window moved between screens), so it is read at resize, never cached
at mount.

---

## The wheel listener must not be passive

A generic performance rule says to add `{ passive: true }` to `wheel` and `touch` listeners so the
browser need not wait to see whether `preventDefault` is called. **It is wrong for our canvas**: the
wheel *is* the zoom, so the handler must call `preventDefault`, and a passive listener cannot — the
browser ignores it and the page scrolls instead.

So: `addEventListener('wheel', handler, { passive: false })`, explicitly, with the reason beside it.
The atlas has the matching precedent — it already lets `ctrl+wheel` through to the browser so page
zoom keeps working, which is the accessibility half of the same decision.

---

## Which outside rules apply, and which are traps

From the archived Vercel skill (`files/claude-archive/skills/react-best-practices/rules/`, read on
demand, **not committed** — see `rules/decision-tree.md`):

| rule | here |
| --- | --- |
| `advanced-init-once` | **applies** — it is the StrictMode and remount problem, restated above |
| `advanced-use-latest`, `advanced-effect-event-deps` | **apply**, and `useEffectEvent` is really available: exported by the installed runtime and typed in `@types/react` at 19.3.0 (verified). Never put it in a dependency array — its identity changes by design |
| `advanced-event-handler-refs` | **applies**, and is the fallback wherever `useEffectEvent` does not fit |
| `client-passive-event-listeners` | **trap** — see the wheel, above |
| `client-event-listeners` | **does not apply**: its remedy is `useSWRSubscription`, and there is no SWR here |
| the `async-*`, `server-*`, most `bundle-*` rules | **do not apply**: no server, no Next, no data waterfall. The Cartographer fetches static assets |

`bundle-barrel-imports` is worth one line because this repository already lives by it: `core` is
consumed through **subpath exports** and never a barrel, which is what keeps three.js out of the
worker chunk.

---

## House rules

- **No `console.log`** — `console.warn` / `console.error` only.
- **No explicit `any`**; `exactOptionalPropertyTypes` and `noUncheckedIndexedAccess` are on.
- **JSDoc on every exported component, prop interface and notable constant.**
- **A component is not done without tests.** `@testing-library/react` and `user-event` are declared;
  `jest-dom` is **not**, deliberately — it does not type under Vitest 5 (`known-issues.md`), so
  assertions go through the DOM (`getAttribute`, `textContent`).
- **Every new React package needs its own `vitest.setup.ts` calling `cleanup()`** — testing-library
  only registers its own `afterEach` when the runner's hooks are global, and ours are imported. This
  is the thing we will forget.
- **`view/` and `geometry/` are pure and may not import `state/`** — held by ESLint in
  `packages/cartographer/eslint.config.js`, proved by breaking it. A component is the only place
  allowed to know about both.
