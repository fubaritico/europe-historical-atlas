import { Checkbox } from '@fubaritico/react/Checkbox'

import type { SovereigntyError } from '../utils/pendingLine'
import type { Say } from '../utils/say'

/**
 * « Souverain » (the dev, 2026-11-16) — beside « Tenue par » for the holder, under the last block of the chain for its
 * top. **Nothing saves on a tick**: the sheet's « Enregistrer » saves it with the rest. Why it was not saved, if it was
 * not, is said under it.
 * @param props - its name, whether it is ticked, its gesture, its help, its error, the translator
 * @param props.name - its name in the form, unique on the sheet
 * @param props.checked - whether it is ticked on the screen
 * @param props.onChange - ticks or unticks it
 * @param props.help - the sentence under it
 * @param props.error - why it was not saved, `null` when nothing went wrong
 * @param props.say - the translator
 * @returns the box
 */
export function SovereignBox({
  name,
  checked,
  onChange,
  help,
  error = null,
  say,
}: {
  name: string
  checked: boolean
  onChange: (sovereign: boolean) => void
  help: string
  error?: SovereigntyError | null
  say: Say
}) {
  // Render
  return (
    <div className="city-sheet__field">
      <Checkbox
        name={name}
        checked={checked}
        onChange={() => {
          onChange(!checked)
        }}
        label={say('sovereign')}
      />
      <p className="city-sheet__help">{help}</p>
      {error !== null && (
        <p className="city-sheet__help city-sheet__help--error" role="alert">
          {error.kind === 'refused' ? error.message : say('sovereignFailed')}
        </p>
      )}
    </div>
  )
}
