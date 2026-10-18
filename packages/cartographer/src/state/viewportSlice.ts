import type { Viewport } from '../viewport/viewport'
import type { StateCreator } from 'zustand'

/**
 * What part of the backdrop is on screen — its own slice, because the canvas owns it alone.
 *
 * **Why it is not in the edition slice**: an undo must never move the view. `core/editor/history`'s own
 * header says what is deliberately kept out of a snapshot — *"the active tool, the zoom and the pan"* —
 * and keeping the viewport in a different slice is what makes that cost nothing rather than requiring
 * care. Standing on a row of `{History}` gives back a document, never a camera.
 *
 * **It is written on every pointer move during a pan, and that is not the thing the rules forbid.** What
 * `rules/troubleshooting.md` warns against is routing per-frame state through a **component**, because
 * then reconciliation runs at 60 Hz. A `set` here costs one `Object.assign` and one selector call per
 * listener; the canvas listens imperatively and no component selects the viewport, so React never
 * re-renders. The rule is about reconciliation, not about calling `set`.
 *
 * **Its own field, deliberately separate from the edition's version counter.** A pan must not look like
 * an edit: if the two shared a counter, `{History}` and every edition selector would be woken sixty
 * times a second by a gesture that changed nothing they show.
 */
export interface ViewportState {
  /** The current view, in device pixels of the backing store. */
  viewport: Viewport
}

/** What may be done to the view. */
export interface ViewportActions {
  /**
   * Adopt a view.
   *
   * The arithmetic lives in `viewport/` — `panBy`, `zoomAbout`, `openingView` — and the caller composes it. This
   * slice holds and publishes; it computes nothing, so there is no second place a pan could be defined.
   */
  setViewport: (viewport: Viewport) => void
}

/** The slice: the view, and the one way to change it. */
export type ViewportSlice = ViewportState & ViewportActions

/** What the slice needs from whoever combines it. */
export interface ViewportDeps {
  /** The view to open on — usually `openingView`, computed once the canvas has a size. */
  viewport: Viewport
}

/**
 * Open a viewport slice on a view.
 *
 * Curried like every slice here, a slice creator's own signature being fixed at `(set, get, store)`.
 * @param deps - the view to start from
 * @returns the slice creator, for the combined store to spread
 */
export const createViewportSlice =
  (
    deps: ViewportDeps
  ): StateCreator<ViewportSlice, [['zustand/subscribeWithSelector', never]], [], ViewportSlice> =>
  (set) => ({
    viewport: deps.viewport,
    setViewport: (viewport: Viewport): void => {
      set({ viewport })
    },
  })
