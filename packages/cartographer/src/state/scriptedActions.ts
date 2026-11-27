import {
  placeScriptedRing,
  replaceScriptedRun,
} from '@europe-historical-atlas/core/editor/scriptedOutlines'

import type { Provenance } from '@europe-historical-atlas/core/data/provenance'
import type { YearDocument } from '@europe-historical-atlas/core/data/yearDocument'
import type { HistoryStep } from '@europe-historical-atlas/core/editor/history'
import type {
  Position,
  ScriptedAnswer,
  ScriptedOptions,
} from '@europe-historical-atlas/core/editor/scriptedOutlines'

/**
 * The gestures of a script (CARTO-584) — the historian's drawing plans laid whole from the page's console through the
 * pilot (`window.pilot.reach().store.getState()`), with no interface: each one undoable step, as `insertAnchor` is.
 * The rules are `core/editor/scriptedOutlines.ts`'s; here they are recorded and said.
 *
 * **No refusal is silent** (`rules/error-handling.md`): a refusal is in the answer and in a `console.warn`; a ring
 * closed but not carved — the overlap left to correct, as after the Pen — in a `console.error`, the Pen's own. **No
 * dialogue opens**, against the rule that a `console.error` reaches the screen: a script lays hundreds of rings in a
 * batch and reads each answer, and a dialogue per call would stack modals over the page it drives (my decision, review
 * ARCH-003 of 2026-11-27) — the answer and the console are the script's channel.
 */
export interface ScriptedActions {
  /**
   * Close a ring for a polity from its positions, as the Pen closes one — a live anchor within a metre reused, never a
   * snap to a river or the coast, a vassal carved out of its suzerain's own domain.
   * @param polityId - whose ring
   * @param positions - `[longitude, latitude]`, three at least, the first not repeated at the end
   * @param step - how `{History}` and ‹⌘Z› name the gesture
   * @param options - how near an anchor a position is that anchor (1 m by default)
   * @returns what was done, or why nothing was
   */
  placeRing: (
    polityId: string,
    positions: readonly Position[],
    step: HistoryStep,
    options?: ScriptedOptions
  ) => ScriptedAnswer
  /**
   * Replace the stretch between two anchors by a run of positions, in every ring that runs over it — a shared border
   * moved as one.
   * @param from - the anchor the run starts on
   * @param to - the anchor it ends on
   * @param positions - the run, strictly between them, in that order
   * @param step - how the gesture is named
   * @param options - how near an anchor a position is that anchor; whose ring decides the stretch
   * @returns what was done, or why nothing was
   */
  replaceRun: (
    from: number,
    to: number,
    positions: readonly Position[],
    step: HistoryStep,
    options?: ScriptedOptions
  ) => ScriptedAnswer
}

/**
 * Say an answer: a refusal as a warning, a ring closed but not carved as an error.
 * @param gesture - which gesture, for the console
 * @param answer - what it answered
 * @returns the answer
 */
function said(gesture: string, answer: ScriptedAnswer): ScriptedAnswer {
  if (answer.refusal === undefined) return answer
  if (answer.ok) console.error(`[Cartographer] ${gesture}: the ring is closed, ${answer.refusal}`)
  else console.warn(`[Cartographer] ${gesture} refused: ${answer.refusal}`)
  return answer
}

/**
 * The script's gestures, each one recorded step.
 * @param record - the runner every recorded action goes through
 * @param provenance - a new point's provenance — the Pen's
 * @returns `placeRing` and `replaceRun`
 */
export function scriptedActions(
  record: (edit: (document: YearDocument) => boolean, step: HistoryStep) => boolean,
  provenance: Provenance
): ScriptedActions {
  return {
    placeRing: (polityId, positions, step, options): ScriptedAnswer => {
      let answer: ScriptedAnswer | null = null
      record((document) => {
        answer = placeScriptedRing(document, polityId, positions, provenance, options)
        return answer.ok
      }, step)
      return said('placeRing', answerOf(answer))
    },
    replaceRun: (from, to, positions, step, options): ScriptedAnswer => {
      let answer: ScriptedAnswer | null = null
      record((document) => {
        answer = replaceScriptedRun(document, from, to, positions, provenance, options)
        return answer.ok
      }, step)
      return said('replaceRun', answerOf(answer))
    },
  }
}

/**
 * The answer the edit wrote — always one, the runner calling the edit at once.
 * @param answer - what the edit set
 * @returns it
 * @throws {Error} when the runner never called the edit — a defect of the wiring
 */
function answerOf(answer: ScriptedAnswer | null): ScriptedAnswer {
  if (answer === null) throw new Error('[Cartographer] the scripted edit was never run')
  return answer
}
