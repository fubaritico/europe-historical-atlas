import { Button } from '@fubaritico/react/Button'

import { useTranslation } from '../../../hooks/useTranslation'
import { YEAR_DIALOG_MESSAGES } from '../i18n'

/** One year of the list. */
export interface YearChoiceProps {
  /** The year it stands for. */
  year: number
  /** Whether it is the year open — written, not offered. */
  isOpen: boolean
  /**
   * Open it.
   * @param year - the year
   */
  choose: (year: number) => void
}

/**
 * One line of *Open…*'s list: a button to open the year, or the open year written as such.
 * @param props - the year, whether it is open, what choosing does
 * @param props.year - the year
 * @param props.isOpen - whether it is the year open
 * @param props.choose - open it
 * @returns the line
 */
export function YearChoice({ year, isOpen, choose }: YearChoiceProps) {
  // Context
  const t = useTranslation(YEAR_DIALOG_MESSAGES)

  // Handlers
  const handleClick = (): void => {
    choose(year)
  }

  // Render
  return (
    <li>
      {isOpen ? (
        <span className="year-choices__open">{t('isOpen', { year: String(year) })}</span>
      ) : (
        <Button type="button" variant="secondary" onClick={handleClick}>
          {t('openYear', { year: String(year) })}
        </Button>
      )}
    </li>
  )
}
