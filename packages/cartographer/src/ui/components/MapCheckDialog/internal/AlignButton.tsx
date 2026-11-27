import { useTranslation } from '../../../hooks/useTranslation'
import { MAP_CHECK_MESSAGES } from '../i18n'

/**
 * « Aligner » on a row to confirm — the author's confirmation that the Wikidata item ties the right territory.
 * Named after its polity for a screen reader, the visible word first (WCAG 2.5.3).
 * @param props - the polity and the alignment
 * @param props.id - the polity's id
 * @param props.name - the polity's name on the map
 * @param props.onAlign - aligns a polity
 * @returns the button
 */
export function AlignButton({
  id,
  name,
  onAlign,
}: {
  id: string
  name: string
  onAlign: (id: string) => void
}) {
  // Context
  const t = useTranslation(MAP_CHECK_MESSAGES)

  // Handlers
  const handleAlign = (): void => {
    onAlign(id)
  }

  // Render
  return (
    <button
      type="button"
      className="ui-button"
      aria-label={t('alignPolity', { name })}
      onClick={handleAlign}
    >
      {t('align')}
    </button>
  )
}
