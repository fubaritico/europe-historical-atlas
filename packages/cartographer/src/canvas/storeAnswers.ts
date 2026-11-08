import { shallow } from 'zustand/shallow'

import { editHandlesIn, gestureOf, refreshTools } from './liveCanvas'
import { keepOutlineInHand } from './tools/resumeOutline'

import type { LiveCanvas } from './liveCanvas'
import type { CartographerStoreHook } from '../state/store'
import type { EditorTool } from '../state/toolSlice'

/**
 * The answers of the canvas to the store that `open-outlines.md` added (the dev, 2026-11-05): ‹cmd+A›, and the outline
 * in hand kept when it is left. Apart from `controller.ts`, which subscribes them, so it stays a list of
 * subscriptions.
 */

/**
 * ‹cmd+A›: every point of the polity selected, as the white arrow shows them — the canvas owns the selection.
 * @param it - the attachment
 * @param paint - the coalesced repaint
 */
export function answerSelectAll(it: LiveCanvas, paint: () => void): void {
  it.session.selected = editHandlesIn(it)
  if (it.session.selected.length === 0) {
    console.warn('[Cartographer] select all: the polity selected has no point to select.')
  }
  paint()
  refreshTools(it)
}

/**
 * Leaving the outline in hand — another polity, another tool — keeps it, open, for the polity it was drawn for (the
 * dev, 2026-11-05: *"as soon as you leave the outline, for whatever reason, it is saved, and you can resume it"*).
 * @param it - the attachment
 * @param polity - the polity the outline was drawn for, or `null`
 * @param tool - the tool it was drawn with — only the Pen's outline is one; ⟨retrace⟩'s run is not
 */
export function keepOnLeaving(it: LiveCanvas, polity: string | null, tool: EditorTool): void {
  if (polity !== null && tool === 'draw') keepOutlineInHand(gestureOf(it), polity)
}

/**
 * Subscribe the answers: leaving the outline in hand by a change of polity or of tool keeps it, then starts the session
 * over — in place of the plain restarts `controller.ts` had for both; ‹cmd+A› selects, subscribed after the tool's, so
 * the selection is made on the session the white arrow starts with.
 * @param it - the attachment
 * @param paint - the coalesced repaint
 * @param restart - start the session over, as a new tool or polity does
 * @returns the unsubscribers
 */
export function answerOutlinesAndSelection(
  it: LiveCanvas,
  paint: () => void,
  restart: () => void
): (() => void)[] {
  return [
    // One subscription for both, so the outline is kept for the polity and the tool it was drawn with, even when one
    // gesture changes both (aiming at a polity takes the Pen).
    it.deps.store.subscribe(
      (state) => [state.target, state.tool] as const,
      ([target, tool], [previousTarget, previousTool]) => {
        if (target === previousTarget && tool === previousTool) return
        keepOnLeaving(it, previousTarget, previousTool)
        restart()
      },
      { equalityFn: shallow }
    ),
    it.deps.store.subscribe(
      (state) => state.selectAllAsked,
      () => {
        answerSelectAll(it, paint)
      }
    ),
  ]
}

/**
 * Repaint on what guides the drawing without changing the map: `{Layers}`' eyes and opacities, and `{Cities}` — an eye
 * shows a guide, the cities arriving or the year changing changes which, and their points drawn or not (2026-11-05).
 * @param it - the attachment, of which only the store is read
 * @param it.deps - its collaborators
 * @param it.deps.store - the store whose guides are watched
 * @param paint - the coalesced repaint
 * @returns the unsubscribers
 */
export function paintOnGuides(
  it: { deps: { store: CartographerStoreHook } },
  paint: () => void
): (() => void)[] {
  return [
    it.deps.store.subscribe((state) => state.layers, paint),
    it.deps.store.subscribe((state) => state.shownCities, paint),
    // The list's filters narrow the map too (CARTO-390).
    it.deps.store.subscribe((state) => state.listedCities, paint),
    it.deps.store.subscribe((state) => state.cities, paint),
    it.deps.store.subscribe((state) => state.citiesAsPoints, paint),
  ]
}
