import { useTranslation } from '../../../hooks/useTranslation'
import { POLITY_LIST_MESSAGES } from '../i18n'

/**
 * The list's subhead — `design/01`'s *"Drawn at 1100"* and the count; while a filter is typed, how many answer it out
 * of all (« 3 sur 56 », CARTO-360).
 * @param props - the year, how many polities it holds and how many answer the filter
 * @param props.year - the year being drawn
 * @param props.count - how many polities answer the filter — all of them when none is typed
 * @param props.total - how many polities the year holds
 * @returns the subhead
 */
export function PolitiesSubhead({
  year,
  count,
  total,
}: {
  year: number
  count: number
  total: number
}) {
  // Context
  const t = useTranslation(POLITY_LIST_MESSAGES)

  // Render
  return (
    <div className="polities__subhead">
      <span>{t('drawnAt', { year: String(year) })}</span>
      <span className="polities__count">
        {count === total ? total : t('countOf', { found: String(count), total: String(total) })}
      </span>
    </div>
  )
}
