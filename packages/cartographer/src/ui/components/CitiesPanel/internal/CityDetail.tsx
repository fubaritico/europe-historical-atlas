import { formatLonLat } from '../../../../viewport/coordinateLabel'
import { useTranslation } from '../../../hooks/useTranslation'
import { CITIES_PANEL_MESSAGES } from '../i18n'

import type { HolderSource } from '../../../../state/citiesSlice'
import type { LonLat } from '../../../../viewport/coordinateLabel'
import type { CityVerdict } from '../utils/cityVerdict'

/**
 * Where a city is, and who holds it: by the sources, with the lines saying so, and on the map — and whether they agree.
 * The body of its information box ({@link CityDialog}). **Its coordinates are written as the status bar writes the
 * pointer's** (CARTO-368): degrees and minutes, a hemisphere letter, never a minus sign.
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
  const { onMap, bySources, kind } = verdict
  const holder = bySources?.name ?? ''

  // Render
  return (
    <section className="city-detail" aria-label={name} data-verdict={kind}>
      <p className="city-detail__line">{t('coordinates', { position: formatLonLat(at) })}</p>
      <p className="city-detail__line">
        {bySources === null ? t('notEntered') : t('bySources', { polity: holder })}
      </p>
      {sources.map(({ title, where }) => (
        <p key={`${title}|${where ?? ''}`} className="city-detail__line city-detail__line--source">
          {where === null ? t('source', { title }) : t('sourceWhere', { title, where })}
        </p>
      ))}
      <p className="city-detail__line">
        {onMap === null ? t('unclaimed') : t('onMap', { polity: onMap.name })}
      </p>
      {kind !== 'notEntered' && (
        <p className="city-detail__verdict">{t(kind, { polity: holder })}</p>
      )}
    </section>
  )
}
