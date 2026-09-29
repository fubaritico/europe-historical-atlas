/**
 * The undo line: one snapshot per gesture, a cursor into it, and markers kept beside it.
 *
 * **A line and a cursor, not two stacks.** Undoing moves the cursor and destroys nothing, which is what makes
 * redo possible at all; the old future dies at the next gesture recorded, not at the undo. So: three gestures,
 * undo twice, record a fourth — and gestures two and three are dropped at that fourth recording, the new one
 * taking the place the second held.
 *
 * **Linear: no branch.** The gestures dropped that way are gone, rather than surviving on a side limb the
 * reader could jump back to. The dev's call, 2026-09-29 — *"cela supprimera les actions se produisant
 * après"*. The other behaviour — keeping them on a side limb, with a way to jump between limbs — is refused
 * here for one reason: a limb nobody can see is a limb nobody uses. A **marker** answers the same need
 * instead, and answers it better, because it is visible and it is named.
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
 *
 * **The arithmetic lives outside the factory**, in the functions below, because the readability budget counts
 * a factory together with its methods — and the reason it does is ARCH-012: pure logic trapped in a closure
 * is a module that was not written. Each of them is exercisable with a literal line.
 */

/** How many undoable steps a line keeps before the oldest is dropped. At ~265 kB a step, 50 ≈ 13 MB. */
export const DEFAULT_HISTORY_LIMIT = 50

/**
 * One gesture, as the panel lists it.
 *
 * **Two fields and not one, for a reason this project has already paid once.** The panel shows an icon per
 * row, and indexing that icon on the *label* would make a display string a key — which is what gave the old
 * payload nine colour regexes and an ordering that had to test the United Kingdom before Ireland. `kind` is
 * what the chrome's icon table is indexed on; `label` is only ever read by a human.
 */
export interface HistoryStep {
  /** Stable identifier of the operation: `move-anchor`, `close-ring`. Never shown, never translated. */
  kind: string
  /** What the row and the `[↶ Undo]` button read. Display text, and the thing translation touches. */
  label: string
}

/** What the line is called when nothing has been done to it yet. The chrome passes a translated one. */
export const DEFAULT_ORIGIN: HistoryStep = { kind: 'open', label: 'open' }

/** One row of the history panel. */
export interface HistoryRow extends HistoryStep {
  /** Where it sits in the line — what {@link History.goTo} takes. */
  index: number
  /** Whether the cursor stands here. Exactly one row carries `true`. */
  current: boolean
}

/** A marked point, kept out of the line so nothing in the line can take it away. */
export interface HistoryMarker extends HistoryStep {
  /** What {@link History.restoreMarker} and {@link History.dropMarker} take. */
  id: number
  /** How many steps it holds, the origin not counted. */
  depth: number
}

/** One entry of the line: a state, already copied, and the gesture that produced it. */
interface HistoryEntry<T> {
  /** The state as it stood once the gesture was recorded. */
  state: T
  /** What that gesture was. */
  step: HistoryStep
}

/** A marker's payload: its identity, its name, and the run of entries it froze. */
interface MarkerEntry<T> {
  /** Its id, never reused. */
  id: number
  /** What it is called in the panel. */
  step: HistoryStep
  /** The line from its origin up to the marked step, held **by reference** — entries are never mutated. */
  held: HistoryEntry<T>[]
}

/**
 * The line as data, deliberately outside the closure so its arithmetic can be exercised with literals.
 */
interface HistoryLine<T> {
  /** Every recorded state, oldest first. Entry zero is the origin. */
  entries: HistoryEntry<T>[]
  /** Which entry the reader stands on. */
  cursor: number
  /** The marked points, in the order they were made. */
  markers: MarkerEntry<T>[]
  /** The next id to hand out. Never reused, so a dropped marker's id cannot come back meaning something else. */
  nextMarkerId: number
}

/** The one mutable cell, so the reading half and the acting half see the same line. */
interface LineHolder<T> {
  /** The line as it stands. */
  current: HistoryLine<T>
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
   *
   * **It does not bound memory once markers exist.** A marker holds its own run of entries, so what the
   * limit drops from the line stays alive under every marker that froze it — which is the point of a marker.
   */
  limit?: number
  /** What the untouched state is called in the panel. Defaults to {@link DEFAULT_ORIGIN}. */
  origin?: HistoryStep
}

/** The undo line. */
export interface History<T> {
  /**
   * Every step, oldest first, for the panel to list — and the reason the panel exists: clicking a row
   * reaches a gesture directly instead of pressing undo ten times (the dev, 2026-09-29).
   */
  readonly rows: readonly HistoryRow[]
  /** The marked points, for the panel's own list. */
  readonly markers: readonly HistoryMarker[]
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
   * is one, and 412 anchors snapped to a coast are one, recorded when the gesture ends and never per pointer
   * move. Everything after the cursor is dropped, so the cursor always ends at the line's end.
   */
  commit: (step: HistoryStep, state: T) => void
  /**
   * Stand on any row of the line and take its state.
   *
   * Destroys nothing — like an undo, it only moves the cursor, and what lies ahead dies at the next
   * {@link History.commit}. `null` when the index is outside the line.
   *
   * **The caller must adopt what comes back as its working state**, not merely read it. The line never
   * touches the object handed to {@link History.commit} and never returns that object, so a caller that
   * keeps editing its old reference is editing something the jump did not reach — and the next commit would
   * resurrect, in silence, exactly what was left behind.
   */
  goTo: (index: number) => T | null
  /** Step back. Returns the state to restore, or `null` when there is nothing to take back. */
  undo: () => T | null
  /** Step forward again. Returns the state to restore, or `null` when there is nothing to redo. */
  redo: () => T | null
  /**
   * Freeze the line from its origin up to where the cursor stands, under a name.
   *
   * **It keeps the steps before it, not only the state** — the dev's requirement, 2026-09-29: what comes back
   * is a line one can step through, not a single frozen frame. It costs nothing because an entry, once
   * recorded, is never mutated: the marker holds references, not copies.
   *
   * What it buys is the only way back past a truncation. Without a branch, going back and drawing something
   * else loses what followed for good, and a marker set before is what returns it.
   * @returns the new marker's id
   */
  mark: (step: HistoryStep) => number
  /**
   * Replace the line with what a marker froze, cursor at its end.
   *
   * **This drops whatever the line held past the marked step, and what to do about that is not this module's
   * call.** The chrome can mark first, so nothing is lost, or ask. The mechanism is here, the policy is not.
   * @returns the state to restore, or `null` when there is no such marker
   */
  restoreMarker: (id: number) => T | null
  /**
   * Forget a marker. What it held goes with it, unless the live line holds it too.
   * @returns `false` when there was no such marker
   */
  dropMarker: (id: number) => boolean
  /**
   * Start a new line from a new state, with both arrows disabled and no markers.
   *
   * What opening a file does: the history that was there belonged to the file just closed (`s04`).
   */
  reset: (state: T, origin?: HistoryStep) => void
}

/**
 * A line holding one entry and nothing else — a file as opened.
 * @param state - the state, **already copied**
 * @param origin - what to call it in the panel
 * @returns the line
 */
function openedLine<T>(state: T, origin: HistoryStep): HistoryLine<T> {
  return { entries: [{ state, step: origin }], cursor: 0, markers: [], nextMarkerId: 1 }
}

/**
 * Record an entry, dropping the old future and then the oldest step if the line is over its limit.
 *
 * Works on a **copy** of the entry list rather than trimming in place, which is what lets a marker hold a run
 * of entries without having it shortened underneath it.
 * @param line - the line as it stands
 * @param entry - the entry to record, its state already copied
 * @param limit - how many undoable steps to keep
 * @returns the line, with the cursor at its end
 */
function recorded<T>(line: HistoryLine<T>, entry: HistoryEntry<T>, limit: number): HistoryLine<T> {
  const entries = line.entries.slice(0, line.cursor + 1)
  entries.push(entry)
  // `entries.length > 1` is what makes a nonsensical limit end as "no undo" instead of draining forever.
  while (entries.length > limit + 1 && entries.length > 1) entries.shift()
  return { ...line, entries, cursor: entries.length - 1 }
}

/**
 * The line as rows, for the panel.
 * @param line - the line to read
 * @returns one row per entry, oldest first, exactly one of them current
 */
function rowsOf<T>(line: HistoryLine<T>): HistoryRow[] {
  return line.entries.map((entry, index) => ({
    ...entry.step,
    index,
    current: index === line.cursor,
  }))
}

/**
 * The markers as the panel lists them, without the entries they hold.
 * @param line - the line to read
 * @returns one entry per marker, in the order they were made
 */
function markersOf<T>(line: HistoryLine<T>): HistoryMarker[] {
  return line.markers.map((marker) => ({
    ...marker.step,
    id: marker.id,
    depth: marker.held.length - 1,
  }))
}

/**
 * The label of an entry.
 * @param line - the line to read
 * @param index - which entry
 * @returns its label, or `null` when there is no entry there
 */
function labelAt<T>(line: HistoryLine<T>, index: number): string | null {
  return line.entries[index]?.step.label ?? null
}

/**
 * Move the cursor and take a copy of what is there.
 * @param holder - the cell holding the line
 * @param index - the row to stand on
 * @param clone - the copier
 * @returns the state to restore, or `null` when the index is outside the line
 */
function jumped<T>(holder: LineHolder<T>, index: number, clone: (state: T) => T): T | null {
  const entry = holder.current.entries[index]
  if (entry === undefined) return null
  holder.current = { ...holder.current, cursor: index }
  return clone(entry.state)
}

/**
 * Freeze the run from the origin to the cursor under a new marker.
 * @param holder - the cell holding the line
 * @param step - what to call the marker
 * @returns the new marker's id
 */
function marked<T>(holder: LineHolder<T>, step: HistoryStep): number {
  const line = holder.current
  const entry: MarkerEntry<T> = {
    id: line.nextMarkerId,
    step,
    held: line.entries.slice(0, line.cursor + 1),
  }
  holder.current = {
    ...line,
    markers: [...line.markers, entry],
    nextMarkerId: line.nextMarkerId + 1,
  }
  return entry.id
}

/**
 * Put back what a marker froze, dropping whatever the line held past it.
 * @param holder - the cell holding the line
 * @param id - which marker
 * @param clone - the copier
 * @returns the state to restore, or `null` when there is no such marker
 */
function restored<T>(holder: LineHolder<T>, id: number, clone: (state: T) => T): T | null {
  const marker = holder.current.markers.find((held) => held.id === id)
  const last = marker?.held[marker.held.length - 1]
  if (marker === undefined || last === undefined) return null
  holder.current = {
    ...holder.current,
    entries: [...marker.held],
    cursor: marker.held.length - 1,
  }
  return clone(last.state)
}

/**
 * Forget a marker.
 * @param holder - the cell holding the line
 * @param id - which marker
 * @returns `false` when there was no such marker
 */
function dropped<T>(holder: LineHolder<T>, id: number): boolean {
  const markers = holder.current.markers.filter((marker) => marker.id !== id)
  if (markers.length === holder.current.markers.length) return false
  holder.current = { ...holder.current, markers }
  return true
}

/**
 * Open a history line on a baseline state.
 *
 * The baseline is copied in, so the caller's live state is never an entry: without that, editing after
 * opening would rewrite the very state an undo is supposed to return to.
 * @param baseline - the state as the file was opened, which undo can return to but never past
 * @param options - the copier, how deep to keep, and what to call the untouched state
 * @returns the line
 */
export function createHistory<T>(baseline: T, options: HistoryOptions<T>): History<T> {
  const { clone } = options
  const limit = Math.max(0, Math.floor(options.limit ?? DEFAULT_HISTORY_LIMIT))
  const held: LineHolder<T> = {
    current: openedLine(clone(baseline), options.origin ?? DEFAULT_ORIGIN),
  }
  const goTo = (index: number): T | null => jumped(held, index, clone)

  return {
    get rows(): readonly HistoryRow[] {
      return rowsOf(held.current)
    },
    get markers(): readonly HistoryMarker[] {
      return markersOf(held.current)
    },
    get canUndo(): boolean {
      return held.current.cursor > 0
    },
    get canRedo(): boolean {
      return held.current.cursor < held.current.entries.length - 1
    },
    get undoLabel(): string | null {
      return held.current.cursor > 0 ? labelAt(held.current, held.current.cursor) : null
    },
    get redoLabel(): string | null {
      return labelAt(held.current, held.current.cursor + 1)
    },
    get depth(): number {
      return held.current.entries.length - 1
    },
    // Copied *before* the line is touched, so a copier that throws leaves the line exactly as it was.
    commit: (step: HistoryStep, state: T): void => {
      held.current = recorded(held.current, { state: clone(state), step }, limit)
    },
    goTo,
    undo: (): T | null => goTo(held.current.cursor - 1),
    redo: (): T | null => goTo(held.current.cursor + 1),
    mark: (step: HistoryStep): number => marked(held, step),
    restoreMarker: (id: number): T | null => restored(held, id, clone),
    dropMarker: (id: number): boolean => dropped(held, id),
    reset: (state: T, origin?: HistoryStep): void => {
      held.current = openedLine(clone(state), origin ?? DEFAULT_ORIGIN)
    },
  }
}
