import type { YearDocument } from '@europe-historical-atlas/core/editor/yearDocument'

/**
 * Who the Pen is drawing for, resolved against the document — the one place that question is asked.
 *
 * **It serves both halves of `s02`'s banner scenario from a single answer**, which is why there is no
 * second predicate beside it: a description means there is a target, so the banner can be drawn; `null`
 * means there is none, so the Pen must refuse. Writing `hasDrawingTarget` as well would be a second place
 * for the same decision to be taken, and the two could disagree.
 */

/** The target as the banner reads it — flat, and built from the document each time it is asked. */
export interface DrawingTarget {
  /** The polity's id, as the slice holds it. */
  id: string
  /** Its name, so the banner reads *"Dessin : Reaume de France"* and not an id. */
  name: string
  /** Its pinned colour, or `null` when the palette is to decide — see {@link describeDrawingTarget}. */
  colour: string | null
}

/**
 * Resolve the aimed-at id against the document.
 *
 * **`null` is returned for an id the document does not hold, and that is load-bearing rather than
 * defensive.** The target is session state while the polity is document state, and the undo line moves the
 * second without touching the first — so undoing the creation of a polity leaves the slice aiming at
 * something gone. Asking the document every time makes that self-correcting: the banner disappears and the
 * Pen refuses, with no listener, no cleanup and nothing to remember to clear. The alternative — clearing
 * the target from inside `undo` — would put a session concern inside the edition slice and have to be
 * repeated in `goTo` and `restoreMarker` too.
 *
 * **Do not call this inside a Zustand selector.** It builds a new object on every call, so a selector over
 * it would make React's `getSnapshot` return a fresh value per render, which React refuses outright — the
 * same trap `History.rows` cost us on 2026-10-05. The binding selects `target` (a string, stable) and
 * `version` (a number, stable) and calls this during the render, where a new object costs nothing.
 *
 * **A `null` colour is passed through, not substituted.** The palette-by-adjacency that would fill it is
 * `assignRegionColors`, which needs the raster — ~825 ms, and H-08 has not decided when the editor runs
 * it. So the banner is told *"no colour pinned"* and may say so; inventing a swatch here would be a value
 * nobody chose, standing in for one that has not arrived (`rules/error-handling.md`).
 * @param document - the year being edited
 * @param target - the id the tool slice is aiming at, or `null`
 * @returns the target to show, or `null` when there is nobody to draw for
 */
export function describeDrawingTarget(
  document: YearDocument,
  target: string | null
): DrawingTarget | null {
  if (target === null) return null
  const polity = document.polities.find((candidate) => candidate.id === target)
  if (polity === undefined) return null
  return { id: polity.id, name: polity.name, colour: polity.colour }
}
