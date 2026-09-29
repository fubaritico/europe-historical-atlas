/**
 * The undo line: one snapshot per gesture, and a cursor into it.
 *
 * **A line and a cursor, not two stacks.** Undoing moves the cursor and destroys nothing, which is what makes
 * redo possible at all; the old future dies at the next `commit`, not at the undo. So: three gestures, undo
 * twice, commit a fourth — and gestures two and three are dropped at that fourth commit, the new one taking
 * the place the second held. Linear on purpose: a branching history would keep them on a dead limb, which no
 * drawing tool offers and nobody looks for.
 *
 * **Snapshots rather than commands**, decided 2026-09-22 and recorded in `files/plans/glossaire.md`: a
 * command that knows how to undo itself corrupts the history in silence the day it is wrong, while a whole
 * copy of the state cannot be wrong about anything. It costs ~265 kB a step, which is what `limit` is for.
 *
 * **Generic over the state, and not for abstraction's sake.** `s03` requires an undo to give back the
 * selection it acted on, and the selection lives in the editor's chrome rather than in the document — a line
 * that knew what a `YearDocument` was could never carry it, and the Cartographer will pass
 * `{ document, selection }` without a line of this file changing. Injecting `clone` also means the
 * arithmetic here is exercisable with `{ n: 1 }` instead of a whole year.
 *
 * **It copies on the way in *and* on the way out.** That is the defect the plausible version ships with:
 * store the caller's own object and the next gesture mutates an entry in place, so a later redo replays a
 * state that was quietly rewritten — undo, edit, redo, and the line is lying. Both sides, or neither works.
 *
 * What is deliberately *not* in a snapshot: the active tool, the zoom and the pan. That is what makes "undo
 * never changes the tool in your hand" and "the view does not move" (`s03`) cost nothing.
 */

/** How many undoable steps a line keeps before the oldest is dropped. At ~265 kB a step, 50 ≈ 13 MB. */
export const DEFAULT_HISTORY_LIMIT = 50

/** One entry: a state, and the name of the gesture that produced it. */
interface HistoryEntry<T> {
  /** The state as it stood once the gesture was committed. Already a copy. */
  state: T
  /** What the gesture was, as `[↶ Undo]` names it: "move anchor". Empty for a baseline. */
  label: string
}

/** What a history line needs from its caller. */
export interface HistoryOptions<T> {
  /**
   * Deep-copy the state. The line stores and returns copies, never the caller's own object.
   *
   * Injected rather than assumed so the line does not need to know what a state is — and so its own
   * behaviour can be tested without a document.
   */
  clone: (state: T) => T
  /**
   * How many undoable steps to keep; older ones are dropped. Defaults to {@link DEFAULT_HISTORY_LIMIT}.
   *
   * A dropped step is not a silent loss: the line's depth shrinks with it and `canUndo` goes false at the
   * end, which is the reading the two arrows already show. Zero means no undo at all, which is coherent;
   * a negative depth is a programming error and is treated as zero rather than left to hang.
   */
  limit?: number
}

/** The undo line. */
export interface History<T> {
  /** Whether a gesture can be taken back — what `[↶ Undo]` reads to enable itself. */
  readonly canUndo: boolean
  /** Whether an undone gesture can be applied again. */
  readonly canRedo: boolean
  /** The gesture {@link History.undo} would take back, for the button to name it; `null` when there is none. */
  readonly undoLabel: string | null
  /** The gesture {@link History.redo} would apply again; `null` when there is none. */
  readonly redoLabel: string | null
  /** How many undoable steps the line holds. */
  readonly depth: number
  /**
   * Record a finished gesture. **One gesture is one step** (`s03`, H-10): a vertex dragged across the screen
   * is one, and 412 anchors snapped to a coast are one, committed when the gesture ends and never per
   * pointer move. Everything after the cursor is dropped, so the cursor always ends at the line's end.
   */
  commit: (label: string, state: T) => void
  /**
   * Step back. Returns the state to restore, or `null` when there is nothing to take back.
   *
   * **The caller must adopt what comes back as its working state**, not merely read it. The line never
   * touches the object handed to {@link History.commit} and never returns that object, so a caller that
   * keeps editing its old reference is editing something the undo did not reach — and the next commit would
   * resurrect, in silence, exactly what was just taken back.
   */
  undo: () => T | null
  /**
   * Step forward again. Returns the state to restore, or `null` when there is nothing to redo.
   *
   * Same contract as {@link History.undo}: adopt the returned state, do not keep the old reference.
   */
  redo: () => T | null
  /**
   * Start a new line from a new baseline, with both arrows disabled.
   *
   * What opening a file does: the history that was there belonged to the file just closed (`s04`).
   */
  reset: (state: T) => void
}

/**
 * Open a history line on a baseline state.
 *
 * The baseline is copied in, so the caller's live state is never an entry: without that, editing after
 * opening would rewrite the very state an undo is supposed to return to.
 * @param baseline - the state as the file was opened, which undo can return to but never past
 * @param options - the copier, and how deep to keep
 * @returns the line
 */
export function createHistory<T>(baseline: T, options: HistoryOptions<T>): History<T> {
  const { clone } = options
  const limit = Math.max(0, Math.floor(options.limit ?? DEFAULT_HISTORY_LIMIT))
  let entries: HistoryEntry<T>[] = [{ state: clone(baseline), label: '' }]
  let cursor = 0

  /**
   * The state at an index, copied out.
   *
   * `null` is unreachable from here — every caller has already checked the cursor is in range. It is the
   * answer rather than a throw because it is the same answer the empty case gives, so no caller needs a
   * second path for it.
   */
  const at = (index: number): T | null => {
    const entry = entries[index]
    return entry === undefined ? null : clone(entry.state)
  }

  return {
    get canUndo(): boolean {
      return cursor > 0
    },
    get canRedo(): boolean {
      return cursor < entries.length - 1
    },
    get undoLabel(): string | null {
      return cursor > 0 ? (entries[cursor]?.label ?? null) : null
    },
    get redoLabel(): string | null {
      return cursor < entries.length - 1 ? (entries[cursor + 1]?.label ?? null) : null
    },
    get depth(): number {
      return entries.length - 1
    },
    commit(label: string, state: T): void {
      // Copied *before* the line is touched, so a copier that throws leaves the line exactly as it was.
      // The other order reads the same and is not: the argument is evaluated after the truncation, so a
      // failed commit would destroy the redo branch while recording nothing — an operation that looks
      // like it did not happen, having changed the state anyway.
      const entry = { state: clone(state), label }
      entries.length = cursor + 1
      entries.push(entry)
      // `entries.length > 1` is what makes a nonsensical limit end as "no undo" instead of draining the
      // array forever.
      while (entries.length > limit + 1 && entries.length > 1) entries.shift()
      cursor = entries.length - 1
    },
    undo(): T | null {
      if (cursor === 0) return null
      cursor -= 1
      return at(cursor)
    },
    redo(): T | null {
      if (cursor >= entries.length - 1) return null
      cursor += 1
      return at(cursor)
    },
    reset(state: T): void {
      entries = [{ state: clone(state), label: '' }]
      cursor = 0
    },
  }
}
