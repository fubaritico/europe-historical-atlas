import { useState } from 'react'

import { withLinkNames } from '../utils/linkNames'
import { linesOf, waitingOf } from '../utils/pendingLine'
import { saveLines } from '../utils/saveLines'

import { useHolderSovereignty } from './useHolderSovereignty'
import { useLineGestures } from './useLineGestures'
import { useLoadedBlock } from './useLoadedBlock'
import { useOneSave } from './useOneSave'

import type { LineGestures } from './useLineGestures'
import type { LoadedChain } from './useLoadedBlock'
import type { BlockWiring } from '../utils/linkNames'
import type { HolderSovereignty, PendingLine, SovereigntyError } from '../utils/pendingLine'
import type { ChainAnswer } from '../utils/saveLines'

/** The block's lines, and their gestures. */
export interface PendingLinks extends LineGestures {
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
  /** The chain the block was last loaded from, kept while it is read again; `null` once no title is chosen. */
  readonly loaded: LoadedChain | null
  /**
   * Loads the chain read into the block — the first reading's links as lines, the holder's sovereignty from every
   * reading — forgetting what was not saved; `null` once no title is chosen.
   */
  readonly load: (chain: LoadedChain | null) => void
  /** Saves every change, at the sheet's « Enregistrer »; `'saved'` when none is left behind, otherwise where it stopped. */
  readonly saveAll: () => Promise<ChainAnswer>
}

/**
 * The repeating block of the chain (the dev's mock-up, and his words of 2026-11-16): **the same blocks to enter a chain
 * and to change it** — the links already in the base loaded as lines, each with its suzerain, its source and its ✕; ⊕
 * adds a line. **Nothing saves on a choice**: the sheet's « Enregistrer » removes the links closed by ✕, changes the
 * lines changed, adds the new ones, then the chain is read again. The suzerain is required — a line without it is said
 * under its field —, the source facultative. **Another holder or another year empties the block at once** (review
 * QUAL-001): its lines were the old title's, and « Enregistrer » would have saved them under the new one.
 * @param holder - the holder's title, the vassal of the first line
 * @param year - the sheet's year, `null` while it is not one
 * @param wiring - the saves, and what follows them
 * @returns the lines and their gestures
 */
export function usePendingLinks(
  holder: number | string | null,
  year: number | null,
  wiring: BlockWiring
): PendingLinks {
  const [lines, setLines] = useState<readonly PendingLine[]>([])
  const [removed, setRemoved] = useState<readonly string[]>([])
  const holderSovereignty = useHolderSovereignty()
  const saving = useOneSave()
  const { loaded, load } = useLoadedBlock(holder, year, (chain) => {
    setLines(linesOf(chain?.readings[0]))
    setRemoved([])
    holderSovereignty.load(chain?.readings ?? [])
  })

  const gestures = useLineGestures({ lines, setLines, setRemoved, busy: saving.busy })

  return {
    lines,
    waiting: waitingOf(lines, removed, holderSovereignty.sovereignty),
    sovereignty: holderSovereignty.sovereignty,
    sovereigntyError: holderSovereignty.error,
    markHolderSovereign: holderSovereignty.mark,
    ...gestures,
    loaded,
    load,
    saveAll: () =>
      saving.run(() =>
        saveLines(
          { lines, removed, holder, sovereignty: holderSovereignty.sovereignty, year },
          {
            wiring: withLinkNames(wiring, loaded?.readings ?? []),
            setLines,
            setRemoved,
            setSovereigntyError: holderSovereignty.setError,
          }
        )
      ),
  }
}
