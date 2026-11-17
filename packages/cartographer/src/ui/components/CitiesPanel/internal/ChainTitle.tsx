import { useTranslation } from '../../../hooks/useTranslation'
import { CITIES_PANEL_MESSAGES } from '../i18n'
import { chainDates, parseTitle } from '../utils/titleFormat'

import type { ContentChainTitle } from '@europe-historical-atlas/core/data/contentFormat'

/**
 * One title of a city's chain on its line (the dev, 2026-11-17): an arrow when it climbs from the line above, the
 * person in italics, the territory, a span of years — a lone year is the map's own and left out — and, on a reading's
 * last title, how the reading ends.
 * @param props - the title and its place in the chain
 * @param props.title - the title, as the export names it
 * @param props.arrow - whether it climbs from the line above
 * @param props.end - how the reading ends, already worded, on its last title; `null` on the others
 * @returns the line's content
 */
export function ChainTitle({
  title,
  arrow,
  end,
}: {
  title: ContentChainTitle
  arrow: boolean
  end: string | null
}) {
  // Context
  const t = useTranslation(CITIES_PANEL_MESSAGES)

  // Derived
  const { person, territory, dates } = parseTitle(title.name)
  const shown = chainDates(dates)
  const when = shown === null ? '' : `, ${shown}`

  // Render
  return (
    <>
      {arrow && <span className="city-detail__arrow">→ </span>}
      {person !== null && <em className="city-detail__person">{person}</em>}
      {person !== null && ' — '}
      {territory}
      {when}
      {end !== null && t('chainEnd', { end })}
    </>
  )
}
