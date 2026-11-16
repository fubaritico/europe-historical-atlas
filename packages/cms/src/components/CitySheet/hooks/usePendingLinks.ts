import { useState } from 'react'

import {
  closeLine,
  emptyLine,
  linesOf,
  waitingOf,
  withChoice,
  withSovereign,
} from '../utils/pendingLine'
import { saveLines } from '../utils/saveLines'

import { useHolderSovereignty } from './useHolderSovereignty'
import { useOneSave } from './useOneSave'

import type {
  HolderSovereignty,
  PendingLine,
  PendingWiring,
  SovereigntyError,
} from '../utils/pendingLine'
import type { ChainReading } from '../utils/readVassalChain'

/** A chain read, as the block was loaded from it: its readings and the year they were read at. */
export interface LoadedChain {
  /** The readings. */
  readonly readings: ChainReading[]
  /** The year they were read at. */
  readonly year: number
}

/** The block's lines, and their gestures. */
export interface PendingLinks {
  /** The lines, from the lowest up. */
  readonly lines: readonly PendingLine[]
  /**
   * How many changes wait for « Enregistrer »: the holder ticked, its tick and its links to remove; otherwise the new
   * lines, the lines changed, the links closed by ✕, the boxes changed and the holder unticked (`waitingOf`).
   */
  readonly waiting: number
  /** The holder's own « Souverain »: ticked, the city is a sovereign state and the block is closed. */
  readonly sovereignty: HolderSovereignty
  /** Why the holder's « Souverain » was not saved, `null` when nothing went wrong. */
  readonly sovereigntyError: SovereigntyError | null
  /** Ticks or unticks the holder « Souverain » — saved at « Enregistrer ». */
  readonly markHolderSovereign: (sovereign: boolean) => void
  /** Adds a line above the last. */
  readonly add: () => void
  /** Closes a line with ✕ — its link removed at « Enregistrer » — and the lines above it, no longer this chain's. */
  readonly remove: (key: string) => void
  /** Chooses a line's suzerain or source, or empties it — ignored while the lines are being saved. */
  readonly choose: (key: string, field: 'suzerain' | 'source', id: number | string | null) => void
  /** Ticks or unticks a line's suzerain « souverain » — on the line only while that title is still its suzerain. */
  readonly markSovereign: (key: string, title: number | string, sovereign: boolean) => void
  /** The chain the block was last loaded from, kept while it is read again; `null` once no title is chosen. */
  readonly loaded: LoadedChain | null
  /**
   * Loads the chain read into the block — the first reading's links as lines, the holder's sovereignty from every
   * reading — forgetting what was not saved; `null` once no title is chosen.
   */
  readonly load: (chain: LoadedChain | null) => void
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
  const holderSovereignty = useHolderSovereignty()
  const [loaded, setLoaded] = useState<LoadedChain | null>(null)
  const saving = useOneSave()

  return {
    lines,
    waiting: waitingOf(lines, removed, holderSovereignty.sovereignty),
    sovereignty: holderSovereignty.sovereignty,
    sovereigntyError: holderSovereignty.error,
    markHolderSovereign: holderSovereignty.mark,
    add: () => {
      setLines((current) => [...current, emptyLine()])
    },
    remove: (key) => {
      const closed = closeLine(lines, key)
      if (closed === null) return
      const { kept, link } = closed
      if (link !== undefined) setRemoved((current) => [...current, link])
      setLines(kept)
    },
    choose: (key, field, id) => {
      if (saving.busy()) return
      setLines((current) => withChoice(current, { key, field, id }))
    },
    markSovereign: (key, title, sovereign) => {
      setLines((current) => withSovereign(current, { key, title, sovereign }))
    },
    loaded,
    load: (chain) => {
      setLoaded(chain)
      setLines(linesOf(chain?.readings[0]))
      setRemoved([])
      holderSovereignty.load(chain?.readings ?? [])
    },
    saveAll: () =>
      saving.run(() =>
        saveLines(
          { lines, removed, holder, sovereignty: holderSovereignty.sovereignty, year },
          { wiring, setLines, setRemoved, setSovereigntyError: holderSovereignty.setError }
        )
      ),
  }
}
