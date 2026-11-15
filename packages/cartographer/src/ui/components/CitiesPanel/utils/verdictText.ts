import type { CityVerdict } from '../../../../canvas/cityVerdict'
import type { CitiesPanelMessageKey } from '../i18n'
import type { ChainEnd } from '@europe-historical-atlas/core/data/vassalChain'

/** A sentence of the panel, and the polity it names. */
export interface VerdictText {
  /** The message. */
  readonly key: CitiesPanelMessageKey
  /** The polity it names. */
  readonly polity: string
}

/** How a reading of the chain ends, in words. */
export const CHAIN_END_TEXT: Readonly<Record<ChainEnd, CitiesPanelMessageKey>> = {
  sovereign: 'chainSovereign',
  unknown: 'chainUnknown',
  loop: 'chainLoop',
}

/**
 * The sentence a city's verdict is said by in its box. Judged by its chain (CARTO-435), the sentence names the polity
 * the map has under it — the one looked for in the chain; judged by its holder alone, the holder the sources give.
 * @param verdict - the city's verdict
 * @returns the sentence, or `null` while nobody has entered its holder
 */
export function verdictText(verdict: CityVerdict): VerdictText | null {
  const { kind, chain, onMap, bySources } = verdict
  if (kind === 'notEntered') return null
  if (chain === null) return { key: kind, polity: bySources?.name ?? '' }
  const polity = onMap?.name ?? ''
  if (kind === 'misplaced') return { key: onMap === null ? 'unclaimed' : 'misplacedChain', polity }
  if (kind === 'cannotCompare') return { key: 'cannotCompareMap', polity }
  return { key: kind, polity }
}
