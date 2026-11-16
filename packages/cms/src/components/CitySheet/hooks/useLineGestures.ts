import { closeLine, emptyLine, withChoice, withSovereign } from '../utils/pendingLine'

import type { PendingLine } from '../utils/pendingLine'

/**
 * The gestures on the block's lines — none saves: « Enregistrer » does. **All held while the lines are being saved**
 * (review QUAL-001, 2026-11-16): a ✕ then would replace the lines the save is writing to.
 */
export interface LineGestures {
  /** Adds a line above the last. */
  readonly add: () => void
  /** Closes a line with ✕ — its link removed at « Enregistrer » — and the lines above it, no longer this chain's. */
  readonly remove: (key: string) => void
  /** Chooses a line's suzerain or source, or empties it. */
  readonly choose: (key: string, field: 'suzerain' | 'source', id: number | string | null) => void
  /** Ticks or unticks a line's suzerain « souverain » — on the line only while that title is still its suzerain. */
  readonly markSovereign: (key: string, title: number | string, sovereign: boolean) => void
}

/** What the gestures act on. */
export interface LineState {
  /** The lines, from the lowest up. */
  readonly lines: readonly PendingLine[]
  /** Sets the lines. */
  readonly setLines: (change: (current: readonly PendingLine[]) => readonly PendingLine[]) => void
  /** Sets the links to remove. */
  readonly setRemoved: (change: (current: readonly string[]) => readonly string[]) => void
  /** Whether the lines are being saved. */
  readonly busy: () => boolean
}

/**
 * The gestures on the block's lines (CMS-422): ⊕, ✕, a suzerain or a source chosen, a box ticked.
 * @param state - the lines and how to change them
 * @returns the gestures
 */
export function useLineGestures(state: LineState): LineGestures {
  const { lines, setLines, setRemoved } = state
  const busy = () => {
    if (!state.busy()) return false
    console.warn('[CMS] the chain is being saved: the gesture on its lines is ignored')
    return true
  }
  return {
    add: () => {
      if (busy()) return
      setLines((current) => [...current, emptyLine()])
    },
    remove: (key) => {
      if (busy()) return
      const closed = closeLine(lines, key)
      if (closed === null) return
      const { kept, link } = closed
      if (link !== undefined) setRemoved((current) => [...current, link])
      setLines(() => kept)
    },
    choose: (key, field, id) => {
      if (busy()) return
      setLines((current) => withChoice(current, { key, field, id }))
    },
    markSovereign: (key, title, sovereign) => {
      if (busy()) return
      setLines((current) => withSovereign(current, { key, title, sovereign }))
    },
  }
}
