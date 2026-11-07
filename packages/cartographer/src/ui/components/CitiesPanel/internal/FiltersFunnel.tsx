import { useTranslation } from '../../../hooks/useTranslation'
import { ListIcon } from '../../../icons/listIcons'
import { CITIES_PANEL_MESSAGES } from '../i18n'

/** What the funnel shows and reports. */
export interface FiltersFunnelProps {
  /** How many holders are ticked: `0` at rest. */
  ticked: number
  /** The funnel was clicked: the advanced filters open. */
  onOpen: () => void
}

/**
 * The funnel at the right of the name filter (CARTO-370, the dev's drawing): it opens the advanced filters, and says when
 * holders are ticked — filled with the accent, their count beside it, and in its name.
 * @param props - how many holders are ticked, and what a click does
 * @param props.ticked - how many holders are ticked
 * @param props.onOpen - opens the advanced filters
 * @returns the button
 */
export function FiltersFunnel({ ticked, onOpen }: FiltersFunnelProps) {
  // Context
  const t = useTranslation(CITIES_PANEL_MESSAGES)

  // Derived
  const name = ticked === 0 ? t('filters') : t('filtersOn', { count: ticked })

  // Render
  return (
    <button
      type="button"
      className="list-filter__action"
      data-active={ticked > 0}
      aria-label={name}
      title={name}
      onClick={onOpen}
    >
      <ListIcon name="funnel" />
      {ticked === 0 ? null : (
        <span className="list-filter__count" aria-hidden="true">
          {ticked}
        </span>
      )}
    </button>
  )
}
