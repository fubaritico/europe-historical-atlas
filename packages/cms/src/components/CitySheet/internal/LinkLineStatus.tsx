import type { NewLinkStatus } from '../hooks/useNewLink'
import type { Say } from '../utils/say'

/**
 * Where a line « Vassal de » stands, under its fields: being saved, refused in the server's words, or failed. The
 * saving is said by the chain's live region around it — a second region here would say it twice; a refusal or a
 * failure is an alert.
 * @param props - the line's status and the translator
 * @param props.status - where the line stands
 * @param props.say - the translator
 * @returns the status lines
 */
export function LinkLineStatus({ status, say }: { status: NewLinkStatus; say: Say }) {
  return (
    <>
      <p className="city-sheet__help">{status.kind === 'saving' && say('linkSaving')}</p>
      {(status.kind === 'refused' || status.kind === 'failed') && (
        <p className="city-sheet__help city-sheet__help--error" role="alert">
          {status.kind === 'refused' ? status.message : say('linkFailed')}
        </p>
      )}
    </>
  )
}
