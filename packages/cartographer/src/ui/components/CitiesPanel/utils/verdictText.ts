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
 * The sentence of a city whose chain reaches a sovereign, checked at the level below it (2026-11-16): it names the title
 * checked — not drawn, or not the one the city lies in.
 * @param verdict - the verdict
 * @returns the sentence, or `null` when the verdict is not one of those
 */
function levelText(verdict: CityVerdict): VerdictText | null {
  if (verdict.expected === null) return null
  if (verdict.kind === 'toDeclare') return { key: 'toDeclare', polity: verdict.expected }
  if (verdict.kind === 'misplaced') return { key: 'misplacedLevel', polity: verdict.expected }
  return null
}

/**
 * The sentence a city's verdict is said by in its box. Judged by its chain (CARTO-435), the sentence names the polity
 * the map has under it — the one looked for in the chain; judged by its holder alone, the holder the sources give.
 * @param verdict - the city's verdict
 * @returns the sentence, or `null` while nobody has entered its holder
 */
export function verdictText(verdict: CityVerdict): VerdictText | null {
  if (verdict.kind === 'notEntered') return null
  if (verdict.chain === null) return { key: verdict.kind, polity: verdict.bySources?.name ?? '' }
  return levelText(verdict) ?? chainText(verdict)
}

/**
 * The sentence of a city judged by its chain, naming the polity under it.
 * @param verdict - the verdict
 * @returns the sentence
 */
function chainText(verdict: CityVerdict): VerdictText {
  const { kind, onMap } = verdict
  const polity = onMap?.name ?? ''
  if (kind === 'misplaced') return { key: onMap === null ? 'unclaimed' : 'misplacedChain', polity }
  if (kind === 'cannotCompare') return { key: 'cannotCompareMap', polity }
  return { key: kind, polity }
}
