import { useTranslation } from '../../../hooks/useTranslation'
import { BORDER_MESSAGES } from '../../../i18n/border'
import { OVERRIDES_PANEL_MESSAGES } from '../i18n'

import type { OverrideRow } from '../utils/overrideRows'

/**
 * One override.
 * @param props - the row and the callback
 * @param props.row - the override
 * @param props.onClear - `[Clear]` was pressed
 * @returns the row
 */
export function OverrideItem({
  row,
  onClear,
}: {
  row: OverrideRow
  onClear: (row: OverrideRow) => void
}) {
  // Context
  const t = useTranslation(OVERRIDES_PANEL_MESSAGES)
  const border = useTranslation(BORDER_MESSAGES)

  // Derived
  const hand = row.hand === null ? t('fact') : border('handName', { hand: row.hand })

  // Handlers
  const handleClear = () => {
    onClear(row)
  }

  // Render
  return (
    <li className="override-row" data-orphaned={row.orphaned}>
      <span className="override-row__hand">{hand}</span>
      <span className="override-row__what">{row.label}</span>
      <button
        type="button"
        className="override-row__clear"
        aria-label={t('clearLabel', { hand, what: row.label })}
        onClick={handleClear}
      >
        {t('clear')}
      </button>
    </li>
  )
}
