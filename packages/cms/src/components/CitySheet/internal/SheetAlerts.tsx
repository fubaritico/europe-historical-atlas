import type { Say } from '../utils/say'

/**
 * What the sheet says at its top (the dev, 2026-11-16: never a grey button that says nothing): the server's answer or
 * the chain's, and — after a click on « Enregistrer » with fields to correct — that nothing is saved, each field saying
 * its own in red under it.
 * @param props - the form's status, whether fields are to correct, the translator
 * @param props.status - the form's status: a sentence, or nothing
 * @param props.fieldsToFix - whether « Enregistrer » was clicked with fields to correct
 * @param props.say - the translator
 * @returns the alerts
 */
export function SheetAlerts({
  status,
  fieldsToFix,
  say,
}: {
  status: unknown
  fieldsToFix: boolean
  say: Say
}) {
  return (
    <>
      {typeof status === 'string' && (
        <p className="city-sheet__status" role="alert">
          {status}
        </p>
      )}
      {fieldsToFix && (
        <p className="city-sheet__status" role="alert">
          {say('fixFields')}
        </p>
      )}
    </>
  )
}
