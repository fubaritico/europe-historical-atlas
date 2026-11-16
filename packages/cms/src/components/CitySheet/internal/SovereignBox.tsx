import { Checkbox } from '@fubaritico/react/Checkbox'
import { toast } from '@payloadcms/ui'

import { useSovereignSave } from '../hooks/useSovereignSave'

import type { SaveSovereign } from '../utils/saveSovereign'
import type { Say } from '../utils/say'

/**
 * « Souverain » under the last block of the chain (the dev, 2026-11-16): only the top of the chain has it — ⊕ moves it
 * to the new block, the suzerain who may be the sovereign. Ticked, it is saved on that title at once, and no ⊕ follows:
 * the chain stops there. One save at a time; a refusal or a failure is said under it, and the box shows the title as
 * the base holds it.
 * @param props - the title, whether it is sovereign, the save, what follows it, the translator
 * @param props.title - the title's id
 * @param props.checked - whether the base holds it sovereign
 * @param props.save - ticks or unticks it in the base
 * @param props.onSaved - called with the new value once saved
 * @param props.say - the translator
 * @returns the box
 */
export function SovereignBox({
  title,
  checked,
  save,
  onSaved,
  say,
}: {
  title: number | string
  checked: boolean
  save: SaveSovereign
  onSaved: (sovereign: boolean) => void
  say: Say
}) {
  const { state, toggle } = useSovereignSave(save, () => {
    toast.error(say('sovereignFailed'))
  })
  const handleChange = () => {
    toggle(title, !checked, onSaved)
  }

  // Render
  return (
    <div className="city-sheet__field">
      <Checkbox
        name={`sovereign-${String(title)}`}
        checked={checked}
        disabled={state.kind === 'saving'}
        onChange={handleChange}
        label={say('sovereign')}
      />
      <p className="city-sheet__help">{say('sovereignHelp')}</p>
      {(state.kind === 'refused' || state.kind === 'failed') && (
        <p className="city-sheet__help city-sheet__help--error" role="alert">
          {state.kind === 'refused' ? state.message : say('sovereignFailed')}
        </p>
      )}
    </div>
  )
}
