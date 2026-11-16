import { formatLonLat } from '../../../../viewport/coordinateLabel'
import { useTranslation } from '../../../hooks/useTranslation'
import { CITIES_PANEL_MESSAGES } from '../i18n'
import { verdictText } from '../utils/verdictText'

import { CityChain } from './CityChain'
import { CityDetailSection } from './CityDetailSection'

import type { CityVerdict } from '../../../../canvas/cityVerdict'
import type { HolderSource } from '../../../../state/citiesSlice'
import type { LonLat } from '../../../../viewport/coordinateLabel'

/**
 * Where a city is, and who holds it — the body of its information box ({@link CityDialog}), as the dev's screen of
 * 2026-11-16 draws it: a heading per section — its coordinates, the holder by the sources, the sources numbered, the
 * polity on the map, the chain of vassalage one title per line — then the verdict. **Its coordinates are written as
 * the status bar writes the pointer's** (CARTO-368): degrees and minutes, a hemisphere letter, never a minus sign.
 * @param props - the city's name, its position, its verdict and its sources
 * @param props.name - the city's name, which names the region
 * @param props.at - its position, longitude first
 * @param props.verdict - both answers and their comparison
 * @param props.sources - the sources that say who held it
 * @returns the detail
 */
export function CityDetail({
  name,
  at,
  verdict,
  sources,
}: {
  name: string
  at: LonLat
  verdict: CityVerdict
  sources: readonly HolderSource[]
}) {
  // Context
  const t = useTranslation(CITIES_PANEL_MESSAGES)

  // Derived
  const { onMap, bySources, kind, chain } = verdict
  const said = verdictText(verdict)

  // Render
  return (
    <section className="city-detail" aria-label={name} data-verdict={kind}>
      <CityDetailSection title={t('coordinatesTitle')}>
        <p>{formatLonLat(at)}</p>
      </CityDetailSection>
      <CityDetailSection title={t('bySourcesTitle')}>
        <p>{bySources === null ? t('notEntered') : bySources.name}</p>
      </CityDetailSection>
      {sources.length > 0 && (
        <CityDetailSection title={t('sourcesTitle')}>
          <ol className="city-detail__sources">
            {sources.map(({ title, where }) => (
              <li key={`${title}|${where ?? ''}`}>
                {where === null ? title : t('sourceWhere', { title, where })}
              </li>
            ))}
          </ol>
        </CityDetailSection>
      )}
      <CityDetailSection title={t('onMapTitle')}>
        <p>{onMap === null ? t('noPolity') : onMap.name}</p>
      </CityDetailSection>
      {chain !== null && chain.length > 0 && (
        <CityDetailSection title={t('chainTitle')}>
          <CityChain readings={chain} />
        </CityDetailSection>
      )}
      {said !== null && (
        <p className="city-detail__verdict">{t(said.key, { polity: said.polity })}</p>
      )}
    </section>
  )
}
