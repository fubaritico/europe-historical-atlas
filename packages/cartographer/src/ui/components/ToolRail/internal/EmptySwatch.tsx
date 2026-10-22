import { useTranslation } from '../../../hooks/useTranslation'
import { TOOL_RAIL_MESSAGES } from '../i18n'
import { refuseColour } from '../utils/refuseColour'

/**
 * The swatch with nobody aimed at: struck through, and it says why it does nothing.
 * @returns the disabled swatch button, whose click only warns
 */
export function EmptySwatch() {
  // Context
  const t = useTranslation(TOOL_RAIL_MESSAGES)

  // Render
  return (
    <button
      type="button"
      className="tool-rail__swatch"
      aria-label={t('noTarget')}
      aria-disabled="true"
      title={t('noTargetHint')}
      data-empty="true"
      onClick={refuseColour}
    />
  )
}
