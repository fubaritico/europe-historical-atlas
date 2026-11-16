import { useOnChange } from './useOnChange'

import type { ChainSaver } from './useChainSaver'
import type { PendingLinks } from './usePendingLinks'
import type { VassalChainState } from './useVassalChain'

/**
 * The block wired to the chain read and to the sheet's « Enregistrer » (the dev, 2026-11-16): each chain read is
 * loaded into the block — its links as lines to change —, none once no holder is chosen; « Enregistrer » is handed how
 * to save the block, and told how many changes wait.
 * @param state - where the chain's reading stands
 * @param pending - the block
 * @param saver - the sheet's « Enregistrer »
 */
export function useBlockWiring(
  state: VassalChainState,
  pending: PendingLinks,
  saver: ChainSaver
): void {
  useOnChange(state, () => {
    if (state.kind === 'read') pending.load({ readings: state.readings, year: state.year })
    if (state.kind === 'none') pending.load(null)
  })
  saver.register(pending.saveAll)
  useOnChange(pending.waiting, () => {
    saver.setWaiting(pending.waiting)
  })
}
