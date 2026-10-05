import { createHistory } from '@europe-historical-atlas/core/editor/history'

import type { CartographerStore } from './store'
import type {
  History,
  HistoryMarker,
  HistoryRow,
  HistoryStep,
} from '@europe-historical-atlas/core/editor/history'
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
 * Editing operations (`addAnchor`, `closeRing`, …) are deliberately absent: they arrive with the tools at
 * step 4d, mutate the document in place, and end in a {@link EditionActions.commit}.
 */
export interface EditionActions {
  /** Record a finished gesture. One gesture is one step — never one per pointer move. */
  commit: (step: HistoryStep) => void
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
 * The eight actions, over a line and a way to publish.
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
  return {
    commit: (step: HistoryStep): void => {
      line.commit(step, current())
      publish(current())
    },
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
