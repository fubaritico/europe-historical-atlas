import {
  insertAnchorOnStretch,
  removeAnchors,
} from '@europe-historical-atlas/core/editor/anchorEdits'
import {
  isWeldRefusal,
  threadAnchor,
  weldAnchor,
} from '@europe-historical-atlas/core/editor/anchorWeld'
import {
  clearOverride,
  dressPair,
  dressSegments,
} from '@europe-historical-atlas/core/editor/borderOverrides'
import { addOutlineCarving } from '@europe-historical-atlas/core/editor/carve'
import {
  addPolity,
  moveAnchors,
  removePolity,
  updatePolity,
} from '@europe-historical-atlas/core/editor/documentEdits'
import { createHistory } from '@europe-historical-atlas/core/editor/history'
import { isRetraceRefusal, retraceStretch } from '@europe-historical-atlas/core/editor/retrace'
import { restack } from '@europe-historical-atlas/core/editor/stacking'

import type { CartographerStore } from './store'
import type { YearPolity } from '@europe-historical-atlas/core/data/yearFormat'
import type { AnchorRemoval } from '@europe-historical-atlas/core/editor/anchorEdits'
import type { WeldDone, WeldRefusal } from '@europe-historical-atlas/core/editor/anchorWeld'
import type { Segment } from '@europe-historical-atlas/core/editor/borderOverrides'
import type { Carving } from '@europe-historical-atlas/core/editor/carve'
import type {
  AnchorMove,
  OutlinePoint,
  Provenance,
  RemovalReport,
} from '@europe-historical-atlas/core/editor/documentEdits'
import type {
  History,
  HistoryMarker,
  HistoryRow,
  HistoryStep,
} from '@europe-historical-atlas/core/editor/history'
import type { RetraceDone, RetraceRefusal } from '@europe-historical-atlas/core/editor/retrace'
import type { StackingMove } from '@europe-historical-atlas/core/editor/stacking'
import type { YearDocument } from '@europe-historical-atlas/core/editor/yearDocument'
import type { StateCreator } from 'zustand'

/**
 * What is being edited, and how to go back: the document, the undo line read flat, and a counter.
 *
 * **Why this is a slice and not the store.** The split is by **who owns a piece of state**, which is the
 * dev's Redux reflex ("one slice per zone", 2026-10-05) corrected on one fact: the document is read by the
 * canvas *and* by `{Polities}`, `{Details}` and `{Overrides}`, so no panel owns it. The slices that do line
 * up with a panel are the ones where that panel is the sole owner — the active tool, the visible layers, a
 * panel's own expanded rows. Those arrive when their state does; writing them empty now would be a structure
 * for nothing.
 *
 * **Why the document and the line are one slice rather than two.** `s03` requires an undo to give back the
 * **selection** it acted on, so the line's `T` becomes `{ document, selection }` — the line *spans* them and
 * cannot sit beside them. And the invariant that matters here, *the caller must adopt what the line returns*,
 * is the one a sabotage showed is easiest to lose (three tests). One owner, one invariant, one place to break
 * it.
 *
 * **Its shape is forced by two facts about what it holds, not chosen.** Both were read off the code rather
 * than assumed, and each one breaks a different half of the obvious store:
 *
 *   1. **The document is mutated in place** (P4 step 2 — `moveAnchor` writes into the anchor array), while
 *      Zustand detects change by reference identity. So after an edit the document is the *same* object and a
 *      selector on it fires nothing: the screen would lie, in silence. Hence {@link EditionState.version}.
 *   2. **`History`'s reading side is getters over a mutable cell.** `line.rows` calls `.map()` on every read
 *      (`core/editor/history.ts`), so it hands back a **new array each time** — a selector on it makes
 *      React's `getSnapshot` return a fresh value per render, which React refuses outright. `useShallow` does
 *      not rescue it either, the rows themselves being new objects. Meanwhile the `History` object *itself* is
 *      a stable reference, so selecting *that* fires nothing. Both halves fail.
 *
 * **Snapshotting at the action is the only shape where both work**, which is why this state holds flat data
 * and the line lives in the slice's closure instead of in the state. It is the one documented exception to
 * "derived values go in the selector": the derivation is unstable *by reference*, so it has to be taken at the
 * moment it can change rather than at the moment it is read.
 */
export interface EditionState {
  /** The document being edited. Mutated in place, so never compare it — read {@link EditionState.version}. */
  document: YearDocument
  /** Bumped by every action. The only thing a selector can usefully watch. */
  version: number
  /** Every step of the line, oldest first, for `{History}` to list. Stable between two actions. */
  rows: readonly HistoryRow[]
  /** The marked points, for the panel's own list. Stable between two actions. */
  markers: readonly HistoryMarker[]
  /** Whether `[↶ Undo]` should enable itself. */
  canUndo: boolean
  /** Whether `[↷ Redo]` should enable itself. */
  canRedo: boolean
  /** The gesture an undo would take back, for the button to name it; `null` when there is none. */
  undoLabel: string | null
  /** The gesture a redo would apply again; `null` when there is none. */
  redoLabel: string | null
}

/**
 * What the chrome may do to the edition.
 *
 * **No action takes a state.** The slice *is* the working document, so `commit` reads it rather than being
 * handed it — which is also what makes it impossible for a caller to record a document the slice is not on.
 *
 * Every action that changes the document **mutates and records together** — {@link EditionActions.createPolity},
 * {@link EditionActions.drawOutline}, {@link EditionActions.moveAnchors} — so no caller can do the first half
 * and forget the commit.
 */
export interface EditionActions {
  /** Record a finished gesture. One gesture is one step — never one per pointer move. */
  commit: (step: HistoryStep) => void
  /**
   * Create an identity with no territory, as one undoable step.
   *
   * **Territory-less is the normal starting state of this map, not a transient one** — at 1100 OHM gives
   * the Kingdom of France its name, its rank and its Wikidata id and **no geometry at all**, and `s07`'s
   * bulk import creates dozens of such entries at once. `s02` settles the consequence: changing tool
   * without having drawn keeps the polity.
   *
   * **It mutates and records together**, rather than leaving the caller to do both. The two-call shape —
   * mutate the document, then `commit` — is available and is the one a caller forgets half of, and the
   * half that gets forgotten is the commit, which leaves an edit no undo can take back.
   *
   * **A duplicate id is returned, not thrown**, and that is the decision rather than an oversight
   * (`rules/error-handling.md`). Unlike {@link EditionActions.goTo}, whose only caller renders from
   * {@link EditionState.rows} and so can only miss through a programming fault, a taken id is something
   * the **author** typed: the form has to be able to point at the id field and say so. Nothing is recorded
   * when it returns `false` — the document is untouched and the line has not moved.
   * @param polity - the identity to add, its id already chosen (see `core/editor/polityId`)
   * @param step - how `{History}` and `[↶ Undo]` will name the gesture
   * @param inFrontOf - the polity to create it just in front of — the one selected (CARTO-242) — or `null`
   *   for the front of the stacking order
   * @returns `false` when the id is already taken, and nothing happened
   */
  createPolity: (polity: YearPolity, step: HistoryStep, inFrontOf?: string | null) => boolean
  /**
   * Change a polity's properties, as one undoable step — `s07`'s *"reopen a polity's form and change
   * it"*. Its id stays; a suzerain closing a loop of homage is refused by the document.
   * @param polity - the new properties, under the id of the polity to change
   * @param step - how the gesture is named — *"edit Reaume de France"*
   * @returns `false` when no polity has that id or the suzerain would loop — and nothing happened
   */
  editPolity: (polity: YearPolity, step: HistoryStep) => boolean
  /**
   * Delete a polity, as one undoable step — the trash of `{Polities}`'s action bar (`s07`, *Removing*).
   *
   * **Its outline goes, never a point** (`removePolity`): the anchors it shared with a neighbour stay, or
   * that neighbour's border would move with no one having touched it — `s00`'s first real constraint. Its
   * vassals become sovereign; the ground is left unclaimed. ‹ctrl+z› gives everything back, sharing
   * included, because the step is a snapshot of the document and a snapshot keeps indices, not copies.
   * @param polityId - who to delete
   * @param step - how the gesture is named — *"delete Duchy of Normandy"*
   * @returns what went, or `null` when no polity has that id — and nothing happened
   */
  deletePolity: (polityId: string, step: HistoryStep) => RemovalReport | null
  /**
   * Dress some segments of the borders with a hand — or give them back to the rule with `null` — as one
   * undoable step (`s13`: *give a line a pattern*). The unit is the segment, so half a border may be
   * dotted and the other half not (`core/editor/borderOverrides`).
   * @param segments - the segments chosen with the white arrow's marquee
   * @param hand - the pattern, or `null`
   * @param step - how the gesture is named — *"dotted France – Burgundy"*
   * @returns `false` when there was nothing to dress — and nothing happened
   */
  dressSegments: (segments: readonly Segment[], hand: string | null, step: HistoryStep) => boolean
  /**
   * Dress the whole limit between two polities — or clear its hand — as one undoable step.
   * @param between - the two polities
   * @param hand - the pattern, or `null`
   * @param step - how the gesture is named
   * @returns `false` when the two are one — and nothing happened
   */
  dressPair: (between: readonly [string, string], hand: string | null, step: HistoryStep) => boolean
  /**
   * Clear one override — `{Overrides}`' `[Clear]` — as one undoable step.
   * @param kind - a run override or a pair override
   * @param index - its place in the document's list
   * @param step - how the gesture is named
   * @returns `false` when there is no such override — and nothing happened
   */
  clearOverride: (kind: 'run' | 'pair', index: number, step: HistoryStep) => boolean
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
    onCarved?: (carving: Carving) => void
  ) => boolean
  /**
   * Move anchors, as one undoable step — the white arrow's drag, committed on release: one anchor, or
   * the whole selection, keeping their relative positions (`s03`). Every ring holding any follows.
   * @param moves - each anchor and where it goes, as `[longitude, latitude]`
   * @param step - how the gesture is named
   * @returns `false` when a move names no anchor — and nothing happened
   */
  moveAnchors: (moves: readonly AnchorMove[], step: HistoryStep) => boolean
  /**
   * Insert an anchor on a stretch, as one undoable step — the idle Pen's click on a stretch (`s03`).
   *
   * Every ring running over the stretch gains it, so two polities sharing that border keep sharing it.
   * The point is reported by eye.
   * @param a - one end of the stretch
   * @param b - the other end
   * @param point - where the new anchor goes, as `[longitude, latitude]`
   * @param step - how the gesture is named
   * @returns the new anchor's index, or `null` when no ring runs from `a` to `b` — and nothing happened
   */
  insertAnchor: (a: number, b: number, point: [number, number], step: HistoryStep) => number | null
  /**
   * Remove several anchors at once, as one undoable step — ‹delete› on a marquee's selection (`s03`).
   * Never refused (the dev, 2026-10-14): a ring of `owner` left under three anchors goes whole, any
   * other keeps its points and is named (`removeAnchors`).
   * @param indices - the anchors to remove
   * @param step - how the gesture is named
   * @param owner - the polity whose rings may go whole — the target
   * @returns the polities that held any of them, how many rings went whole and who kept the points, or
   *   `null` when nothing was removed — and nothing was recorded
   */
  deleteAnchors: (
    indices: readonly number[],
    step: HistoryStep,
    owner?: string
  ) => AnchorRemoval | null
  /**
   * Weld an anchor onto another, as one undoable step — the white arrow dropping a point on a
   * neighbour's (`H-37`): every ring holding `from` holds `into` instead, so the two share it.
   * @param from - the anchor dragged
   * @param into - the anchor it is dropped on
   * @param step - how the gesture is named
   * @returns the polities now holding `into`, a refusal, or `null` — and then nothing was recorded
   */
  weldAnchor: (from: number, into: number, step: HistoryStep) => WeldDone | WeldRefusal | null
  /**
   * Put an anchor on a neighbour's stretch and thread it into every ring over it, as one undoable step —
   * the white arrow dropping a point on a neighbour's border (`H-37`).
   * @param index - the anchor dragged
   * @param a - one end of the stretch
   * @param b - the other end
   * @param point - where on the stretch, as `[longitude, latitude]`
   * @param step - how the gesture is named
   * @returns the polities whose rings gained the anchor, a refusal, or `null` — and then nothing was
   *   recorded
   */
  threadAnchor: (
    index: number,
    a: number,
    b: number,
    point: [number, number],
    step: HistoryStep
  ) => WeldDone | WeldRefusal | null
  /**
   * Replace a stretch of a polity's ring by a new run, as one undoable step — ⟨retrace⟩'s last click
   * (`H-46`). Every ring running over the stretch takes the run, so a neighbour on it follows.
   * @param polityId - whose ring is retraced
   * @param from - the anchor the retrace starts on
   * @param to - the anchor it ends on
   * @param replaced - the anchors strictly between them that go, from `from`
   * @param points - the new run, strictly between `from` and `to`, each with its provenance
   * @param step - how the gesture is named
   * @returns what it did, or why it was refused — and then nothing happened
   */
  retraceStretch: (
    polityId: string,
    from: number,
    to: number,
    replaced: readonly number[],
    points: readonly OutlinePoint[],
    step: HistoryStep
  ) => RetraceDone | RetraceRefusal
  /**
   * Move a polity among its siblings, its vassals with it, as one undoable step — `s16`'s four
   * commands, from the menu of a row of `{Polities}`.
   * @param polityId - which polity
   * @param move - the command
   * @param step - how the gesture is named — *"bring to front — Duchy of Normandy"*
   * @returns `false` when the polity is unknown or the move would change nothing — and nothing happened
   */
  restackPolity: (polityId: string, move: StackingMove, step: HistoryStep) => boolean
  /** Take back the last gesture. Does nothing at the origin: `ctrl+z` at the end of the line is ordinary. */
  undo: () => void
  /** Apply an undone gesture again. Does nothing at the end of the line. */
  redo: () => void
  /**
   * Stand on a row of the line and adopt its state — what clicking a row in `{History}` does.
   * @throws when the index is not in the line, which means the panel and the line disagree
   */
  goTo: (index: number) => void
  /**
   * Freeze the line up to the cursor under a name.
   * @returns the new marker's id
   */
  mark: (step: HistoryStep) => number
  /**
   * Put back what a marker froze. **Drops whatever the line held past the marked step** — the policy for
   * that belongs to the chrome, not here (see `s14-history-panel.md`).
   * @throws when there is no such marker, which means the panel and the line disagree
   */
  restoreMarker: (id: number) => void
  /**
   * Forget a marker.
   * @throws when there is no such marker, which means the panel and the line disagree
   */
  dropMarker: (id: number) => void
  /** Open a document, starting a fresh line on it: the history that was there belonged to the file closed. */
  open: (document: YearDocument, origin?: HistoryStep) => void
}

/**
 * The provenance a point placed by hand is recorded under — `s02`'s *"reported by eye"*.
 *
 * **Generic on purpose, and that is a declared gap**: `s02` names the reference too (*"— Duby
 * (reference)"*), which is the author's to say and has nowhere to be said yet. The licence is `fact`, the
 * terms a reported fact travels under.
 */
export const FREE_POINT_PROVENANCE: Provenance = { name: 'reported by eye', licence: 'fact' }

/** The slice: what it holds, and what may be done to it. */
export type EditionSlice = EditionState & EditionActions

/** What the slice needs from whoever combines it. */
export interface EditionDeps {
  /** The document to open on. There is no sensible default — a year needs its number and its zone. */
  document: YearDocument
  /**
   * Deep-copy a document.
   *
   * Injected rather than imported, for two reasons that are not ceremony: it is what lets a test hand in a
   * copier that **throws** and assert the slice did not move, and it keeps the choice of copier at the
   * composition root instead of welded into this module.
   */
  clone: (document: YearDocument) => YearDocument
  /** How many undoable steps to keep. Defaults to the line's own limit. */
  limit?: number
}

/**
 * Read everything the line exposes, once, into plain data.
 *
 * **The only place in the Cartographer that touches `line.rows`.** Every getter is read here and nowhere
 * else, so the new array each one builds is built once per action instead of once per render.
 * @param line - the undo line to read
 * @param document - the working document to publish beside it
 * @param version - the counter's new value
 * @returns the state as a selector may safely watch it
 */
export function snapshot(
  line: History<YearDocument>,
  document: YearDocument,
  version: number
): EditionState {
  return {
    document,
    version,
    rows: line.rows,
    markers: line.markers,
    canUndo: line.canUndo,
    canRedo: line.canRedo,
    undoLabel: line.undoLabel,
    redoLabel: line.redoLabel,
  }
}

/**
 * The failure a panel-driven jump raises when it names something the line does not hold.
 *
 * **A decision, not a detail** (`rules/error-handling.md`, the dev's call): the only caller of `goTo`,
 * `restoreMarker` and `dropMarker` is a list rendered from {@link EditionState.rows} or
 * {@link EditionState.markers}, so a miss means the panel and the line disagree — a programming fault, not a
 * runtime condition. Returning quietly instead would leave a click on a row with **no effect and no
 * message**, which is the worst of the three outcomes: the reader is told nothing and learns nothing.
 * @param what - what was asked for, named so the message says which row or marker
 * @returns the error to throw
 */
function disagreement(what: string): Error {
  return new Error(
    `Cartographer history: ${what} is not in the line — the panel and the history disagree.`
  )
}

/**
 * The state a jump must have produced.
 * @param restored - what the line returned
 * @param what - what was asked for, for the message
 * @returns the state, never `null`
 * @throws when the line had no such row or marker
 */
function required(restored: YearDocument | null, what: string): YearDocument {
  if (restored === null) throw disagreement(what)
  return restored
}

/**
 * Run an edit on the working document and, only if it took, record and publish it as one step.
 *
 * **The one shape every document-changing action has**, written once: the edit refuses before it writes
 * (each `core` operation checks first), so a `false` leaves the document and the line as they were.
 * @param line - the undo line to record on
 * @param publish - hand the document to the store
 * @param current - read the working document
 * @returns a runner taking the edit and the step's name
 */
function recorder(
  line: History<YearDocument>,
  publish: (document: YearDocument) => void,
  current: () => YearDocument
): (edit: (document: YearDocument) => boolean, step: HistoryStep) => boolean {
  return (edit, step) => {
    const document = current()
    if (!edit(document)) return false
    line.commit(step, document)
    publish(document)
    return true
  }
}

/**
 * The author's hand on the borders (`s13`), each one undoable step: dress segments, dress a pair, clear one.
 * @param record - the runner every recorded action goes through
 * @returns `dressSegments`, `dressPair` and `clearOverride`
 */
function overrideActions(
  record: (edit: (document: YearDocument) => boolean, step: HistoryStep) => boolean
): Pick<EditionActions, 'dressSegments' | 'dressPair' | 'clearOverride'> {
  return {
    dressSegments: (segments, hand, step): boolean =>
      record((document) => dressSegments(document, segments, hand), step),
    dressPair: (between, hand, step): boolean =>
      record((document) => dressPair(document, between, hand), step),
    clearOverride: (kind, index, step): boolean =>
      record((document) => clearOverride(document, kind, index), step),
  }
}

/**
 * The edits of a polity's identity — create one, change one, delete one — each one recorded step.
 *
 * `addPolity` and `updatePolity` copy what they keep, so the caller's object cannot be mutated from here
 * later.
 * @param record - the runner every recorded action goes through
 * @returns `createPolity`, `editPolity` and `deletePolity`
 */
function polityActions(
  record: (edit: (document: YearDocument) => boolean, step: HistoryStep) => boolean
): Pick<EditionActions, 'createPolity' | 'editPolity' | 'deletePolity'> {
  return {
    createPolity: (polity, step, inFrontOf = null): boolean =>
      record((document) => addPolity(document, polity, inFrontOf), step),
    editPolity: (polity, step): boolean =>
      record((document) => updatePolity(document, polity), step),
    deletePolity: (polityId, step): RemovalReport | null => {
      let report: RemovalReport | null = null
      record((document) => {
        report = removePolity(document, polityId)
        return report !== null
      }, step)
      return report
    },
  }
}

/**
 * Closing an outline, which carves a vassal's suzerain in the same step (`s08`, 2026-10-15).
 * @param record - the runner every recorded action goes through
 * @returns `drawOutline`
 */
function outlineActions(
  record: (edit: (document: YearDocument) => boolean, step: HistoryStep) => boolean
): Pick<EditionActions, 'drawOutline'> {
  return {
    drawOutline: (polityId, points, step, onCarved): boolean =>
      record((document) => {
        const drawn = addOutlineCarving(document, polityId, points)
        if (!drawn.closed || drawn.carving === null) return drawn.closed
        // A carving that could not be done leaves the overlap, for the author to correct — said loudly.
        if ('reason' in drawn.carving) {
          console.error(
            `[Cartographer] the outline of "${polityId}" was closed but not carved out of "${drawn.carving.suzerain}": ${drawn.carving.reason}; they overlap.`
          )
        } else onCarved?.(drawn.carving)
        return true
      }, step),
  }
}

/**
 * The edits of the anchors — insert one on a stretch, remove some — each answering with what it
 * did, which `recorder`'s boolean cannot carry.
 * @param record - the runner every recorded action goes through
 * @returns `insertAnchor`, `deleteAnchors` and `retraceStretch`
 */
function anchorActions(
  record: (edit: (document: YearDocument) => boolean, step: HistoryStep) => boolean
): Pick<EditionActions, 'insertAnchor' | 'deleteAnchors' | 'retraceStretch'> {
  return {
    retraceStretch: (polityId, from, to, replaced, points, step): RetraceDone | RetraceRefusal => {
      // Overwritten at once: `record` runs the edit synchronously, and the answer comes back out of it.
      let answer: RetraceDone | RetraceRefusal = { kind: 'no-ring' }
      record((document) => {
        answer = retraceStretch(document, polityId, from, to, replaced, points)
        return !isRetraceRefusal(answer)
      }, step)
      return answer
    },
    insertAnchor: (a, b, point, step): number | null => {
      let index: number | null = null
      record((document) => {
        index = insertAnchorOnStretch(document, a, b, point, FREE_POINT_PROVENANCE)
        return index !== null
      }, step)
      return index
    },
    deleteAnchors: (indices, step, owner): AnchorRemoval | null => {
      let removal: AnchorRemoval | null = null
      record((document) => {
        removal = removeAnchors(document, indices, owner)
        return removal !== null
      }, step)
      return removal
    },
  }
}

/**
 * The welds of an anchor onto a neighbour's outline (`H-37`), each one step answering with what it did.
 * @param record - the runner every recorded action goes through
 * @returns `weldAnchor` and `threadAnchor`
 */
function weldActions(
  record: (edit: (document: YearDocument) => boolean, step: HistoryStep) => boolean
): Pick<EditionActions, 'weldAnchor' | 'threadAnchor'> {
  return {
    weldAnchor: (from, into, step): WeldDone | WeldRefusal | null => {
      let answer: WeldDone | WeldRefusal | null = null
      record((document) => {
        answer = weldAnchor(document, from, into)
        return answer !== null && !isWeldRefusal(answer)
      }, step)
      return answer
    },
    threadAnchor: (index, a, b, point, step): WeldDone | WeldRefusal | null => {
      let answer: WeldDone | WeldRefusal | null = null
      record((document) => {
        answer = threadAnchor(document, index, a, b, point)
        return answer !== null && !isWeldRefusal(answer)
      }, step)
      return answer
    },
  }
}

/**
 * The actions, over a line and a way to publish.
 *
 * **Outside the slice creator on purpose** (ARCH-012): pure logic trapped in a closure is a module that was
 * not written, and `max-lines-per-function` measures a factory together with its methods precisely so that it
 * cannot hide there. Taking `publish` and `current` as arguments is what makes the whole set exercisable
 * against a stub line and a recording publisher, with no store and no React.
 *
 * **Every action publishes**, including the ones that leave the document alone (`commit`, `mark`,
 * `dropMarker`): they change what the line *reads as*, and nothing else would tell a selector so.
 * @param line - the undo line to drive
 * @param publish - hand a working document to the store, bumping the version
 * @param current - read the working document back
 * @returns the actions, bound to that line
 */
export function editionActions(
  line: History<YearDocument>,
  publish: (document: YearDocument) => void,
  current: () => YearDocument
): EditionActions {
  const record = recorder(line, publish, current)
  return {
    commit: (step: HistoryStep): void => {
      line.commit(step, current())
      publish(current())
    },
    // `addPolity` copies what it keeps, so the caller's object cannot be mutated from here later.
    ...polityActions(record),
    ...overrideActions(record),
    ...outlineActions(record),
    moveAnchors: (moves, step): boolean => record((document) => moveAnchors(document, moves), step),
    restackPolity: (polityId, move, step): boolean =>
      record((document) => restack(document, polityId, move), step),
    ...anchorActions(record),
    ...weldActions(record),
    undo: (): void => {
      const back = line.undo()
      if (back !== null) publish(back)
    },
    redo: (): void => {
      const forward = line.redo()
      if (forward !== null) publish(forward)
    },
    goTo: (index: number): void => {
      publish(required(line.goTo(index), `row ${String(index)}`))
    },
    mark: (step: HistoryStep): number => {
      const id = line.mark(step)
      publish(current())
      return id
    },
    restoreMarker: (id: number): void => {
      publish(required(line.restoreMarker(id), `marker ${String(id)}`))
    },
    dropMarker: (id: number): void => {
      if (!line.dropMarker(id)) throw disagreement(`marker ${String(id)}`)
      publish(current())
    },
    open: (document: YearDocument, origin?: HistoryStep): void => {
      line.reset(document, origin)
      publish(document)
    },
  }
}

/**
 * Open an edition on a document.
 *
 * **It is a slice, so it does not call `create` and carries no middleware** — that belongs to the combined
 * store (`store.ts`), and it is the one rule about this pattern that cannot be worked around: a middleware
 * applied inside a slice would wrap that slice's `set` and not the store's.
 *
 * **Curried so it can still take its dependencies.** A slice creator's own signature is fixed at
 * `(set, get, store)`, which leaves nowhere to pass a copier, so the deps come first and the slice creator
 * comes back. That is what keeps `rules/modular-architecture.md` satisfied — the collaborator is injected,
 * never imported here — and what lets every test build a fresh store, so the `setState(initialState)` reset
 * ritual and the `replace: true` trap beside it never arise.
 *
 * It is typed against {@link CartographerStore} rather than against itself, per the official slices pattern:
 * that is what will let a later slice read this one through `get()`. The resulting import cycle is
 * **type-only** and erases at runtime, `verbatimModuleSyntax` being on.
 *
 * The version counter starts at 0 and only ever grows, {@link EditionActions.open} included: resetting it
 * would let a subscriber sitting at 0 miss the very change that opened a file.
 * @param deps - the document to open, the copier, and how deep a line to keep
 * @returns the slice creator, for the combined store to spread
 */
export const createEditionSlice =
  (
    deps: EditionDeps
  ): StateCreator<
    CartographerStore,
    [['zustand/subscribeWithSelector', never]],
    [],
    EditionSlice
  > =>
  (set, get) => {
    const line = createHistory(deps.document, {
      clone: deps.clone,
      ...(deps.limit === undefined ? {} : { limit: deps.limit }),
    })

    return {
      ...snapshot(line, deps.document, 0),
      ...editionActions(
        line,
        (document: YearDocument): void => {
          set(snapshot(line, document, get().version + 1))
        },
        (): YearDocument => get().document
      ),
    }
  }
