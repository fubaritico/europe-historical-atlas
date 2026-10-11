import type { CartographerStore } from './store'
import type { StateCreator } from 'zustand'

/**
 * Which tool is in the author's hand, and which polity the Pen draws for.
 *
 * **Its own slice, because `{Tools}` owns it alone** — the split here is by who *writes* a piece of state,
 * and the strip is the only writer of the active tool. The drawing target sits beside it rather than in the
 * edition because it is the same kind of thing: a pointer held by the session, not a fact of the document.
 *
 * **Why neither may enter the undo line, and this is not a preference.** `s99` settles it in one line —
 * *"a history step holds the document, not the session… the active tool, the zoom, the pan, the layer
 * visibility and the open panel stay out. Undo must never put a tool back in someone's hand, and choosing
 * a tool must never become a step to undo."* Keeping both out of the edition slice is what makes that cost
 * nothing instead of requiring care at every action.
 *
 * **The target is an id, never the polity.** The document is mutated in place, so a held object would go
 * stale in silence — and an id has a second, better property: it stops resolving the moment the polity
 * leaves the document. Undo the creation and the target evaporates on its own, with nothing to clear. That
 * is what `describeDrawingTarget` is for, and it is why this slice carries no `releaseTarget`.
 */
export type EditorTool = 'navigate' | 'draw' | 'edit'

/**
 * How the Pen places its points — the variants of its group (`s02`'s ⟨free point⟩, ⟨snap to coast⟩,
 * ⟨snap to river⟩), and the Pencil, its freehand mode (the dev, 2026-10-11). In the group's order.
 */
export const PEN_MODES = ['free', 'coast', 'river', 'pencil'] as const

/** One of {@link PEN_MODES}. */
export type PenMode = (typeof PEN_MODES)[number]

/**
 * Each mode's name — the row of the Pen's group, the group head's name, and what ‹P› says in the status
 * bar when it changes the mode. Written once, here, so the three cannot disagree.
 */
export const PEN_MODE_LABELS: Record<PenMode, string> = {
  free: 'Pen',
  coast: 'Pen — follow the coast',
  river: 'Pen — follow a river',
  pencil: 'Pencil — freehand',
}

/**
 * Whether a variant id names a mode of the Pen — the one check, beside the one list (QUAL-115).
 * @param id - a row id from the Pen's group
 * @returns `true` for a {@link PenMode}
 */
export function isPenMode(id: string): id is PenMode {
  return PEN_MODES.some((mode) => mode === id)
}

/**
 * The mode after this one, in the group's order and round again — what ‹P› does with the Pen already in
 * hand (the dev, 2026-10-11: pressing ‹P› again must change the Pen).
 * @param mode - the mode in use
 * @returns the next one
 */
export function nextPenMode(mode: PenMode): PenMode {
  const next = PEN_MODES[(PEN_MODES.indexOf(mode) + 1) % PEN_MODES.length]
  if (next === undefined) {
    // Out of range only if PEN_MODES were empty: said, and the mode kept rather than replaced.
    console.error(`[Cartographer] no Pen mode follows "${mode}"; the mode is unchanged.`)
    return mode
  }
  return next
}

/** What the session holds about tools. */
export interface ToolState {
  /** The tool a click obeys. `s00`'s Background opens on ⟨navigate⟩. */
  tool: EditorTool
  /**
   * The id of the polity the Pen is drawing for; `null` when the author has aimed at nobody.
   *
   * It may name a polity the document no longer holds — see the header. Read it through
   * `describeDrawingTarget` rather than trusting it.
   */
  target: string | null
  /** How the Pen places its points. ⟨free point⟩ is the default (`s02`). */
  penMode: PenMode
}

/** What the chrome may do to the tools. */
export interface ToolActions {
  /**
   * Put a tool in the author's hand — the strip, and ‹P› / ‹A› / ‹space›.
   *
   * **It does not touch the target.** Pressing ‹P› with a polity already aimed at goes on drawing for it,
   * which is what `s02`'s *"[Draw territory] hands me the Pen again, with it as the target"* describes from
   * the other side. Whether ‹P› *alone* ought instead to forget a target chosen long ago is not specified
   * by `s02`; it is recorded in `next.md` rather than decided here.
   */
  selectTool: (tool: EditorTool) => void
  /**
   * Aim the Pen at a polity: it becomes the target **and** ⟨draw⟩ becomes the active tool.
   *
   * One action and not two, because `s02` states them as one consequence of one gesture — *"it becomes the
   * drawing target / And ⟨draw⟩ becomes the active tool, without my asking for it"*. Two actions would let
   * a caller do half of it, and the half that gets forgotten is the tool, which leaves a banner naming a
   * target the author cannot draw for.
   *
   * It does not check that the id exists: the document is the authority on that, and
   * `describeDrawingTarget` is where the question is asked. Validating here would put the same
   * lookup in two places.
   */
  aimAt: (polityId: string) => void
  /**
   * Aim at a polity **without touching the tool** — what clicking its fill with the white arrow does,
   * and what clicking it in `{Polities}` will. `aimAt` is this plus the Pen, for the form's OK.
   *
   * `null` aims at nobody — the arrow's click on unclaimed ground, as in Illustrator (the dev,
   * 2026-10-11).
   */
  chooseTarget: (polityId: string | null) => void
  /**
   * Choose a variant of the Pen, which also puts the Pen in hand — what choosing a row of its group
   * does in Illustrator.
   */
  choosePenMode: (mode: PenMode) => void
}

/** The slice: the tool, the target, and the two ways they change. */
export type ToolSlice = ToolState & ToolActions

/**
 * Open a tool slice.
 *
 * **No dependencies and no currying**, unlike the other two slices — and that is the honest shape rather
 * than an inconsistency. `s00`'s Background fixes the opening state (*"⟨navigate⟩ is the active tool"*,
 * nothing aimed at), so there is nothing for a composition root to choose; a `deps` argument with one
 * possible value would be structure for nothing.
 * @param set - the store's setter, supplied by the combined store
 * @returns the slice
 */
export const createToolSlice: StateCreator<
  CartographerStore,
  [['zustand/subscribeWithSelector', never]],
  [],
  ToolSlice
> = (set) => ({
  tool: 'navigate',
  target: null,
  penMode: 'free',
  selectTool: (tool: EditorTool): void => {
    set({ tool })
  },
  chooseTarget: (polityId: string | null): void => {
    set({ target: polityId })
  },
  aimAt: (polityId: string): void => {
    set({ tool: 'draw', target: polityId })
  },
  choosePenMode: (mode: PenMode): void => {
    set({ tool: 'draw', penMode: mode })
  },
})
