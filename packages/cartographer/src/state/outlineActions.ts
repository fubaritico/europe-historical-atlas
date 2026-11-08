import { addOutlineCarving, carveOutOfSuzerain } from '@europe-historical-atlas/core/editor/carve'
import { addOutline, replaceOutline } from '@europe-historical-atlas/core/editor/documentEdits'

import type { YearDocument } from '@europe-historical-atlas/core/data/yearDocument'
import type { Carving, CarvingFault, CarvingHeld } from '@europe-historical-atlas/core/editor/carve'
import type { OutlinePoint } from '@europe-historical-atlas/core/editor/documentEdits'
import type { HistoryStep } from '@europe-historical-atlas/core/editor/history'

/** An outline the Pen took up to resume it (`open-outlines.md`): where it sits, and what it held then. */
export interface ResumedOutline {
  /** Its position in the polity's claim. */
  at: number
  /** The anchors it held when taken up — it is put back only if it still holds them. */
  anchors: readonly number[]
}

/** Closing, keeping and putting back an outline — the Pen's edits of the document, each one recorded step. */
export interface OutlineActions {
  /**
   * Give a polity a closed outline, as one undoable step — what the Pen does when the ring closes.
   *
   * The points are the session's until now; they enter the document here, all at once, each under its
   * own provenance — reported by eye, or snapped onto the coast. One step takes the whole outline back.
   * @param polityId - who the outline is drawn for
   * @param points - each anchor and its provenance, in order, closure implied
   *
   * **A vassal's outline carves its suzerain's own domain** in the same step (`s08`, the dev, 2026-10-15):
   * the ground under it is no longer the suzerain's own, the new limit shares its anchors.
   * @param step - how `{History}` and `[↶ Undo]` will name the gesture
   * @param onCarved - told what a carving did, for the status bar; a carving that failed is logged here
   * @returns `false` when the polity is unknown or the points enclose nothing — and nothing happened
   */
  drawOutline: (
    polityId: string,
    points: readonly OutlinePoint[],
    step: HistoryStep,
    onCarved?: (carving: Carving | CarvingHeld) => void
  ) => boolean
  /**
   * Keep the Pen's outline as it stands, open or closed, as one undoable step (`open-outlines.md`, the dev,
   * 2026-11-05): a new outline left open when the author changes polity; or an outline the Pen resumed, put back in
   * its place — open still, or now closed. A vassal's outline closed carves its suzerain, as {@link drawOutline}.
   * @param polityId - whose outline
   * @param resumed - the outline the Pen took up — its position and the anchors it held — or `null` for a new one
   * @param points - each anchor and its provenance, in order
   * @param open - whether it stays open
   * @param step - how the gesture is named
   * @param onCarved - told what a closing carved, or that the carving was held back
   * @returns `false` when the document refused it — and nothing happened
   */
  keepOutline: (
    polityId: string,
    resumed: ResumedOutline | null,
    points: readonly OutlinePoint[],
    open: boolean,
    step: HistoryStep,
    onCarved?: (carving: Carving | CarvingHeld) => void
  ) => boolean
}

/**
 * What a carving answered, said: a fault loudly in the console — the overlap left for the author to correct — a
 * carving done or held back to the caller, which says it to the author.
 * @param polityId - the vassal whose outline was closed
 * @param carving - what the carving answered
 * @param onCarved - told what was carved, or that it was held back
 */
function answerCarving(
  polityId: string,
  carving: Carving | CarvingFault | CarvingHeld | null,
  onCarved: ((carving: Carving | CarvingHeld) => void) | undefined
): void {
  if (carving === null) return
  if ('reason' in carving) {
    console.error(
      `[Cartographer] the outline of "${polityId}" was closed but not carved out of "${carving.suzerain}": ${carving.reason}; they overlap.`
    )
    return
  }
  onCarved?.(carving)
}

/**
 * Closing an outline, which carves a vassal's suzerain in the same step (`s08`, 2026-10-15) — or keeping it, open or
 * closed, and putting a resumed one back in its place (`open-outlines.md`).
 * @param record - the runner every recorded action goes through
 * @returns `drawOutline` and `keepOutline`
 */
export function outlineActions(
  record: (edit: (document: YearDocument) => boolean, step: HistoryStep) => boolean
): OutlineActions {
  return {
    keepOutline: (polityId, resumed, points, open, step, onCarved): boolean =>
      record((document) => {
        if (resumed === null) return addOutline(document, polityId, points, open)
        if (!replaceOutline(document, polityId, resumed.at, resumed.anchors, points, open))
          return false
        const ring = document.claims.find((claim) => claim.polity === polityId)?.rings[resumed.at]
        if (!open && ring !== undefined) {
          answerCarving(polityId, carveOutOfSuzerain(document, polityId, ring), onCarved)
        }
        return true
      }, step),
    drawOutline: (polityId, points, step, onCarved): boolean =>
      record((document) => {
        const drawn = addOutlineCarving(document, polityId, points)
        if (drawn.closed) answerCarving(polityId, drawn.carving, onCarved)
        return drawn.closed
      }, step),
  }
}
