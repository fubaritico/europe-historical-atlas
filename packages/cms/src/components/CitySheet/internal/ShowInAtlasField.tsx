import { Checkbox } from '@fubaritico/react/Checkbox'
import { useFormikContext } from 'formik'

import type { Say } from '../utils/say'
import type { SheetValues } from '../utils/sheetValues'

/**
 * « Afficher la ville dans l’atlas » (CMS-391, the dev, 2026-11-08: the historian's research brought too many cities to
 * show them all): unticked by default, the city stays in the contribution and in the Cartographer, which places the
 * borders with it; ticked, the published atlas shows it.
 * @param props - the translator
 * @param props.say - the translator
 * @returns the box and its sentence
 */
export function ShowInAtlasField({ say }: { say: Say }) {
  // Context
  const { getFieldProps } = useFormikContext<SheetValues>()

  // Render
  return (
    <div className="city-sheet__field">
      <Checkbox
        {...getFieldProps({ name: 'showInAtlas', type: 'checkbox' })}
        label={say('showInAtlas')}
      />
      <p className="city-sheet__help">{say('showInAtlasHelp')}</p>
    </div>
  )
}
