import { isPolityPasteRefusal, pastePolity } from '@europe-historical-atlas/core/editor/paste'
import { isPointsPasteRefusal, pastePoints } from '@europe-historical-atlas/core/editor/pastePoints'
import { pasteSheet } from '@europe-historical-atlas/core/editor/pasteSheet'
import { PASTE_WELD_KM } from '@europe-historical-atlas/core/editor/pasteWeld'

import type { YearDocument } from '@europe-historical-atlas/core/data/yearDocument'
import type { CopiedPoints, CopiedPolity } from '@europe-historical-atlas/core/editor/clipboard'
import type { HistoryStep } from '@europe-historical-atlas/core/editor/history'
import type { PolityPasteRefusal, PolityPasted } from '@europe-historical-atlas/core/editor/paste'
import type {
  PointsPasteRefusal,
  PointsPasted,
} from '@europe-historical-atlas/core/editor/pastePoints'
import type { SheetField, SheetPasteRefusal } from '@europe-historical-atlas/core/editor/pasteSheet'

/** Pasting from the clipboard — polities, points, a sheet — each one recorded step. */
export interface PasteActions {
  /**
   * Paste polities from the clipboard, sheet and outline, welded onto the map — **one undoable step for all of
   * them** (`s22`, CARTO-345): one ‹ctrl+Z› takes the paste back whole.
   * @param polities - the copied polities, in the order they were copied
   * @param step - how the gesture is named — *"paste Kingdom of Poland"*
   * @returns per polity, what was pasted or why it was not; nothing is recorded when none was pasted
   */
  pastePolities: (
    polities: readonly CopiedPolity[],
    step: HistoryStep
  ) => (PolityPasted | PolityPasteRefusal)[]
  /**
   * Paste points from the clipboard onto a polity, as one undoable step (`open-outlines.md`): each whole outline added,
   * each piece merged into its outline by the nearest points, or left open when nothing is drawn.
   * @param copied - the copied points
   * @param polityId - the polity selected
   * @param step - how the gesture is named — *"paste points onto Republic of Venice"*
   * @returns what was done, the pieces left out named, or why nothing was — nothing recorded when nothing was put down
   */
  pastePoints: (
    copied: CopiedPoints,
    polityId: string,
    step: HistoryStep
  ) => PointsPasted | PointsPasteRefusal
  /**
   * Paste the fields chosen of a copied sheet onto a polity of the map, as one undoable step (`s22` « # 3 »): its id
   * and its outline kept, the suzerain found by its name.
   * @param copied - the copied sheet — a sheet copied alone, or a copied polity's
   * @param polityId - the polity of the map
   * @param fields - the fields chosen in the dialogue
   * @param step - how the gesture is named — *"paste the sheet of Republic of Venice"*
   * @returns `true` when it was pasted, or why nothing was — and then nothing was recorded
   */
  pasteSheet: (
    copied: Pick<CopiedPolity, 'polity' | 'suzerainName'>,
    polityId: string,
    fields: readonly SheetField[],
    step: HistoryStep
  ) => true | SheetPasteRefusal
}

/**
 * Pasting from the clipboard, each paste one recorded step (`s22`): polities, all of them in one step; points; a sheet.
 *
 * **The actions that can throw after writing**: a paste refuses before it writes, but a defect met in its weld — or
 * the second polity's, after the first was written — leaves the map partly written. So a throw puts the map
 * back as the line holds it, the state before the paste, and **is thrown again**: the defect stays loud, and the map
 * on screen is never one no step records (reviews ARCH-001 and QUAL-001, 2026-11-05).
 * @param record - the runner every recorded action goes through
 * @param restore - put the map back as the line's current row holds it
 * @returns `pastePolities`, `pastePoints` and `pasteSheet`
 */
export function pasteActions(
  record: (edit: (document: YearDocument) => boolean, step: HistoryStep) => boolean,
  restore: () => void
): PasteActions {
  /**
   * Run a paste as one recorded step, putting the map back and throwing again when it fails after writing.
   * @param edit - the paste, on the working document
   * @param step - the step's name
   */
  const guarded = (edit: (document: YearDocument) => boolean, step: HistoryStep): void => {
    try {
      record(edit, step)
    } catch (error) {
      restore()
      throw error
    }
  }
  return {
    pastePolities: (polities, step): (PolityPasteRefusal | PolityPasted)[] => {
      const answers: (PolityPasteRefusal | PolityPasted)[] = []
      guarded((document) => {
        for (const copied of polities) answers.push(pastePolity(document, copied, PASTE_WELD_KM))
        return answers.some((answer) => !isPolityPasteRefusal(answer))
      }, step)
      return answers
    },
    pastePoints: (copied, polityId, step): PointsPasteRefusal | PointsPasted => {
      // Overwritten at once: `record` runs the edit synchronously, and the answer comes back out of it.
      let answer: PointsPasteRefusal | PointsPasted = { refused: 'no-polity' }
      guarded((document) => {
        answer = pastePoints(document, copied, polityId, PASTE_WELD_KM)
        // A step only when something was put down: every piece left out writes nothing.
        return !isPointsPasteRefusal(answer) && answer.outlines + answer.open + answer.merged > 0
      }, step)
      return answer
    },
    pasteSheet: (copied, polityId, fields, step): true | SheetPasteRefusal => {
      // Overwritten at once: `record` runs the edit synchronously, and the answer comes back out of it.
      let answer: true | SheetPasteRefusal = 'no-polity'
      guarded((document) => {
        answer = pasteSheet(document, copied, polityId, fields)
        return answer === true
      }, step)
      return answer
    },
  }
}
