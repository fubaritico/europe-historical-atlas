import { ColorField } from '@fubaritico/react/ColorField'

import { useColourPickerWords } from '../../../hooks/useColourPickerWords'
import { useTranslation } from '../../../hooks/useTranslation'
import { pickedColour } from '../../../utils/pickedColour'
import { POLITY_FORM_MESSAGES } from '../i18n'

import type { ColorValue, HsvaColor } from '@fubaritico/behaviors'

/**
 * The colour, as the design system's field: a swatch, the hex, and the picker in a popover.
 *
 * `nullable` is "automatic", `s02`'s default. **No `alpha`**: a polity's colour is laid over the relief,
 * so the format has no opacity to give. **The popover stays inside the Modal**, never in a portal —
 * `showModal()` makes everything outside the dialogue inert, so a portalled panel could not be clicked.
 * @param props - the colour and the callback
 * @param props.value - the polity's colour, or `null` for "automatic"
 * @param props.onChange - reports the colour picked, `null` when "automatic" is chosen
 * @returns the colour field
 */
export function ColourField({
  value,
  onChange,
}: {
  value: HsvaColor | null
  onChange: (colour: HsvaColor | null) => void
}) {
  // Context
  const t = useTranslation(POLITY_FORM_MESSAGES)
  const picker = useColourPickerWords()

  // Handlers
  const handleChange = (colour: ColorValue) => {
    const picked = pickedColour(colour)
    if (picked !== undefined) onChange(picked)
  }

  // Render
  return (
    <ColorField
      label={t('colour')}
      value={value}
      onChange={handleChange}
      nullable
      density="compact"
      {...picker}
    />
  )
}
