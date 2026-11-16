import { useTranslation } from '../../../hooks/useTranslation'
import { CITIES_PANEL_MESSAGES } from '../i18n'

import type { HolderSource } from '../../../../state/citiesSlice'

/**
 * The sources saying who held a city, numbered (the dev, 2026-11-16): each work's title in italics, where in it after.
 * @param props - the sources
 * @param props.sources - the sources, as the CMS gives them
 * @returns the list
 */
export function CitySources({ sources }: { sources: readonly HolderSource[] }) {
  // Context
  const t = useTranslation(CITIES_PANEL_MESSAGES)

  // Render
  return (
    <ol className="city-detail__sources">
      {sources.map(({ title, where }, index) => (
        // By its rank too: the CMS may give the same work and place twice (review QUAL-003)
        <li key={`${String(index)}|${title}|${where ?? ''}`}>
          <cite className="city-detail__work">{title}</cite>
          {where !== null && t('sourceWhere', { where })}
        </li>
      ))}
    </ol>
  )
}
