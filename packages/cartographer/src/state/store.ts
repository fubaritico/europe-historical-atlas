import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

import { createEditionSlice } from './editionSlice'
import { createToolSlice } from './toolSlice'
import { createViewportSlice } from './viewportSlice'

import type { EditionDeps, EditionSlice } from './editionSlice'
import type { ToolSlice } from './toolSlice'
import type { ViewportDeps, ViewportSlice } from './viewportSlice'

/**
 * Everything the Cartographer keeps, as one bound store built from slices.
 *
 * **One store, several slices**, which is the pattern's own rule rather than a taste: a slice is a
 * `(set, get) => ({...})` function, all of them spread into a single store, and a slice reads another
 * through `get()`. Three today: the **edition** — the document and its undo line — the **viewport**,
 * separate because an undo must never move the view, and the **tools** — which tool is in hand and which
 * polity the Pen draws for, separate for the same reason stated the other way round by `s99`: choosing a
 * tool must never become a step to undo.
 * The rest join as they are built: the visible layers and each panel's own expanded rows at step 5.
 *
 * **The middleware lives here and can live nowhere else.** Applied inside a slice it would wrap that slice's
 * `set` instead of the store's, so the subscription it exists for would miss every other slice. That single
 * constraint is why this file was written now, with one slice in it, rather than at the second slice: the
 * previous shape put `subscribeWithSelector` inside the factory, which is precisely what a slice cannot do.
 *
 * **Why `subscribeWithSelector` at all** — the canvas (step 4d) subscribes from *outside* React: it repaints
 * imperatively and the status bar is written by hand, which is a subscription with a selector and
 * `fireImmediately`, and plain `subscribe` takes only a listener. It is not a blanket rule; it earns its
 * place because we genuinely do subscribe from outside.
 *
 * **This file is wiring and has no suite of its own.** It is exercised by `editionSlice.test.ts`, where
 * every store-level test drives it — including the two that are about this file rather than the slice: that
 * a selector subscription fires at wiring time, and that the store reads as a React hook.
 */
export type CartographerStore = EditionSlice & ViewportSlice & ToolSlice

/**
 * What the store needs from the composition root, **one entry per slice that has dependencies**.
 *
 * The tool slice has none and therefore has no key here: `s00`'s Background fixes what it opens on
 * (⟨navigate⟩, nothing aimed at), so a key with one possible value would be ceremony.
 */
export interface CartographerStoreDeps {
  /** The document to open on, the copier, and how deep an undo line to keep. */
  edition: EditionDeps
  /** The view to open on. */
  viewport: ViewportDeps
}

/**
 * Build the store.
 *
 * A factory rather than a module-level singleton, which `rules/modular-architecture.md` requires and which
 * the edition slice needs anyway — it has a collaborator to inject, the copier its undo line runs on.
 * @param deps - the dependencies of each slice that has any
 * @returns the bound hook, carrying `getState` / `setState` / `subscribe`
 */
export function createCartographerStore(deps: CartographerStoreDeps) {
  return create<CartographerStore>()(
    subscribeWithSelector((...a) => ({
      ...createEditionSlice(deps.edition)(...a),
      ...createViewportSlice(deps.viewport)(...a),
      ...createToolSlice(...a),
    }))
  )
}

/** The bound hook a {@link createCartographerStore} call returns, for whoever has to name it. */
export type CartographerStoreHook = ReturnType<typeof createCartographerStore>
