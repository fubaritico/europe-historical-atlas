import { useRef, useState } from 'react'

import { changed, emptyLine, linesOf, withChoice, withSovereign } from '../utils/pendingLine'
import { saveLines } from '../utils/saveLines'

import type { PendingLine, PendingWiring } from '../utils/pendingLine'
import type { ChainReading } from '../utils/readVassalChain'

/** The block's lines, and their gestures. */
export interface PendingLinks {
  /** The lines, from the lowest up. */
  readonly lines: readonly PendingLine[]
  /** How many changes wait for « Enregistrer »: new lines, lines changed, links removed. */
  readonly waiting: number
  /** Adds a line above the last. */
  readonly add: () => void
  /** Closes a line with ✕ — its link removed at « Enregistrer » — and the lines above it, no longer this chain's. */
  readonly remove: (key: string) => void
  /** Chooses a line's suzerain or source, or empties it — ignored while the lines are being saved. */
  readonly choose: (key: string, field: 'suzerain' | 'source', id: number | string | null) => void
  /** Says a title was ticked or unticked « souverain » — on the line only while that title is still its suzerain. */
  readonly markSovereign: (key: string, title: number | string, sovereign: boolean) => void
  /** Loads the chain read into the block — its links as lines — forgetting what was not saved. */
  readonly load: (reading: ChainReading | null) => void
  /** Saves every change, at the sheet's « Enregistrer »; `true` when none is left behind. */
  readonly saveAll: () => Promise<boolean>
}

/**
 * The repeating block of the chain (the dev's mock-up, and his words of 2026-11-16): **the same blocks to enter a chain
 * and to change it** — the links already in the base loaded as lines, each with its suzerain, its source and its ✕; ⊕
 * adds a line. **Nothing saves on a choice**: the sheet's « Enregistrer » removes the links closed by ✕, changes the
 * lines changed, adds the new ones, then the chain is read again. The suzerain is required — a line without it is said
 * under its field —, the source facultative.
 * @param holder - the holder's title, the vassal of the first line
 * @param year - the sheet's year, `null` while it is not one
 * @param wiring - the saves, and what follows them
 * @returns the lines and their gestures
 */
export function usePendingLinks(
  holder: number | string | null,
  year: number | null,
  wiring: PendingWiring
): PendingLinks {
  const [lines, setLines] = useState<readonly PendingLine[]>([])
  const [removed, setRemoved] = useState<readonly string[]>([])
  const saving = useRef(false)
  const update = (key: string, change: Partial<PendingLine>) => {
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...change } : line)))
  }

  return {
    lines,
    waiting: lines.filter(changed).length + removed.length,
    add: () => {
      setLines((current) => [...current, emptyLine()])
    },
    remove: (key) => {
      const at = lines.findIndex((line) => line.key === key)
      const link = lines[at]?.link
      if (at === -1) return
      if (link !== undefined) setRemoved((current) => [...current, link])
      setLines((current) => current.slice(0, at))
    },
    choose: (key, field, id) => {
      if (saving.current) return
      setLines((current) => withChoice(current, { key, field, id }))
    },
    markSovereign: (key, title, sovereign) => {
      setLines((current) => withSovereign(current, { key, title, sovereign }))
    },
    load: (reading) => {
      setLines(reading === null ? [] : linesOf(reading))
      setRemoved([])
    },
    saveAll: async () => {
      if (saving.current) return true
      saving.current = true
      try {
        return await saveLines(
          { lines, removed, holder, year },
          { wiring, setLines, setRemoved, update }
        )
      } finally {
        saving.current = false
      }
    },
  }
}
