import { useTranslation } from '../../../hooks/useTranslation'
import { MAP_DIALOG_MESSAGES } from '../i18n'

/** Why *Open…* shows no list: still reading, failed, or no map at all. */
export type MapListNoteKind = 'reading' | 'failed' | 'empty'

/**
 * The line *Open…* shows in place of its list — read out as a status, or as an alert when the reading failed.
 * @param props - why there is no list
 * @param props.kind - still reading, failed, or empty
 * @returns the line
 */
export function MapListNote({ kind }: { kind: MapListNoteKind }) {
  // Context
  const t = useTranslation(MAP_DIALOG_MESSAGES)

  // Render
  return (
    <p className="short-dialogue__text" role={kind === 'failed' ? 'alert' : 'status'}>
      {t(kind)}
    </p>
  )
}
