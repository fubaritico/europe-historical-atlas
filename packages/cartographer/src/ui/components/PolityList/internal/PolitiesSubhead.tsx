import { useTranslation } from '../../../hooks/useTranslation'
import { POLITY_LIST_MESSAGES } from '../i18n'

/**
 * The list's subhead — `design/01`'s *"Drawn at 1100"* and the count.
 * @param props - the year and how many polities it holds
 * @param props.year - the year being drawn
 * @param props.count - how many polities the year holds
 * @returns the subhead
 */
export function PolitiesSubhead({ year, count }: { year: number; count: number }) {
  // Context
  const t = useTranslation(POLITY_LIST_MESSAGES)

  // Render
  return (
    <div className="polities__subhead">
      <span>{t('drawnAt', { year: String(year) })}</span>
      <span className="polities__count">{count}</span>
    </div>
  )
}
