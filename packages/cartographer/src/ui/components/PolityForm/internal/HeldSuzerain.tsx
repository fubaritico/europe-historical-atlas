import { IconButton } from '@fubaritico/react/IconButton'

import { useTranslation } from '../../../hooks/useTranslation'
import { POLITY_FORM_MESSAGES } from '../i18n'

/**
 * The choice held now — the suzerain, or the CMS territory (CARTO-450) — its name, or *none*, and the cross that removes it.
 * @param props - the name held, the cross's name and what removing does
 * @param props.held - the name held, or `null` when there is none
 * @param props.removeKey - the message naming the cross, given the name held
 * @param props.onRemove - remove the choice
 * @returns the line
 */
export function HeldSuzerain({
  held,
  removeKey,
  onRemove,
}: {
  held: string | null
  removeKey: 'removeSuzerain' | 'removeTerritory'
  onRemove: () => void
}) {
  // Context
  const t = useTranslation(POLITY_FORM_MESSAGES)

  // Render
  return (
    <p className="suzerain-field__held">
      {/* Announced when the choice changes (A11Y-010); the cross stays out of the announcement. */}
      <span role="status">{held ?? t('none')}</span>
      {held !== null && (
        <IconButton
          type="button"
          icon="XMark"
          aria-label={t(removeKey, { name: held })}
          onClick={onRemove}
        />
      )}
    </p>
  )
}
