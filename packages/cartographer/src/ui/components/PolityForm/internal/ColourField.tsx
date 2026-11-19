import { ColorField } from '@fubaritico/react/ColorField'

import { useColourPickerWords } from '../../../hooks/useColourPickerWords'
import { useTranslation } from '../../../hooks/useTranslation'
import { POLITY_FORM_MESSAGES } from '../i18n'

import type { ColorValue } from '@fubaritico/behaviors'

/**
 * The colour, as the design system's field: a swatch, the hex, and the picker in a popover.
 *
 * **Three states** (CARTO-484, the dev, 2026-11-18): a colour; `nullable`, "automatic", `s02`'s default — the palette
 * decides; `allowNone`, « no colour » — nothing is painted, the polity keeps its name: the people known by its name
 * alone (a tribe with no colour), the country whose history the atlas does not tell. **No `alpha`**: a polity's colour
 * is laid over the relief, so the format has no opacity to give. **The popover stays inside the Modal**, never in a
 * portal — `showModal()` makes everything outside the dialogue inert, so a portalled panel could not be clicked.
 * @param props - the colour and the callback
 * @param props.value - the polity's colour, `null` for "automatic", or « no colour »
 * @param props.onChange - reports the colour picked, `null` when "automatic" is chosen, « no colour » when it is
 * @returns the colour field
 */
export function ColourField({
  value,
  onChange,
}: {
  value: ColorValue
  onChange: (colour: ColorValue) => void
}) {
  // Context
  const t = useTranslation(POLITY_FORM_MESSAGES)
  const picker = useColourPickerWords()

  // Render
  return (
    <ColorField
      label={t('colour')}
      value={value}
      onChange={onChange}
      nullable
      allowNone
      density="compact"
      {...picker}
    />
  )
}
