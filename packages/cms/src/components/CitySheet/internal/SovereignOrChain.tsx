import { ChainReadings } from './ChainReadings'
import { SovereignBox } from './SovereignBox'

import type { PendingLinks } from '../hooks/usePendingLinks'
import type { ChainReading } from '../utils/readVassalChain'
import type { Say } from '../utils/say'

/**
 * The holder's own « Souverain », then its chain (the dev, 2026-11-16): ticked, the city is a sovereign state — a
 * sovereignty of one link — and no chain is entered; the holder's links that « Enregistrer » will remove are said in
 * red. Unticked, the chain and its blocks.
 * @param props - the readings, their year, the block, the translator
 * @param props.readings - the chain's readings
 * @param props.year - the year they were read at
 * @param props.pending - the block, the holder's sovereignty with it
 * @param props.say - the translator
 * @returns the box, then the chain or what ticking it removes
 */
export function SovereignOrChain({
  readings,
  year,
  pending,
  say,
}: {
  readings: ChainReading[]
  year: number
  pending: PendingLinks
  say: Say
}) {
  const { sovereignty } = pending
  // Render
  return (
    <>
      <SovereignBox
        name="holder-sovereign"
        checked={sovereignty.sovereign}
        onChange={pending.markHolderSovereign}
        help={say('holderSovereignHelp')}
        error={pending.sovereigntyError}
        say={say}
      />
      {!sovereignty.sovereign && (
        <ChainReadings readings={readings} year={year} pending={pending} say={say} />
      )}
      {sovereignty.sovereign && sovereignty.links.length > 0 && (
        <p className="city-sheet__help city-sheet__help--error">
          {say('holderSovereignDrops', { count: sovereignty.links.length })}
        </p>
      )}
    </>
  )
}
