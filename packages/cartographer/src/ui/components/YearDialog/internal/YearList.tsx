import { useTranslation } from '../../../hooks/useTranslation'
import { YEAR_DIALOG_MESSAGES } from '../i18n'

import { YearChoice } from './YearChoice'

/** The list of years, as it is being read. */
export type YearListing =
  { state: 'reading' } | { state: 'failed' } | { state: 'read'; years: readonly number[] }

/** What the list shows and does. */
export interface YearListProps {
  /** The years, or where their reading stands. */
  listing: YearListing
  /** The year open. */
  year: number
  /**
   * Open a year.
   * @param year - the year chosen
   */
  choose: (year: number) => void
}

/**
 * *Open…*'s list: the years saved side by side, or the line that says why there is none.
 * @param props - the listing, the year open, what choosing does
 * @param props.listing - the years, or where their reading stands
 * @param props.year - the year open
 * @param props.choose - open a year
 * @returns the list, or a line of text
 */
export function YearList({ listing, year, choose }: YearListProps) {
  // Context
  const t = useTranslation(YEAR_DIALOG_MESSAGES)

  // Render
  if (listing.state === 'reading')
    return (
      <p className="short-dialogue__text" role="status">
        {t('reading')}
      </p>
    )
  if (listing.state === 'failed')
    return (
      <p className="short-dialogue__text" role="alert">
        {t('failed')}
      </p>
    )
  if (listing.years.length === 0)
    return (
      <p className="short-dialogue__text" role="status">
        {t('empty')}
      </p>
    )
  return (
    <ul className="year-choices" aria-label={t('legend')}>
      {listing.years.map((listed) => (
        <YearChoice key={listed} year={listed} isOpen={listed === year} choose={choose} />
      ))}
    </ul>
  )
}
