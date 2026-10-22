import { COLOUR_PICKER_MESSAGES } from '../i18n/colourPicker'
import { describeColour } from '../utils/describeColour'

import { useTranslation } from './useTranslation'

import type { ColorPickerLabels, HsvaColor } from '@fubaritico/behaviors'

/**
 * What the design system's colour picker says, in the page's language (ATLAS-159): its labels, its swatch
 * button's name, and how it describes a colour — the three props it takes to be localised.
 * @returns the props to spread on a `ColorPicker` or a `ColorField`
 */
export function useColourPickerWords() {
  // Context
  const t = useTranslation(COLOUR_PICKER_MESSAGES)

  // Derived
  const labels: ColorPickerLabels = {
    area: t('area'),
    saturation: t('saturation'),
    brightness: t('brightness'),
    hue: t('hue'),
    alpha: t('alpha'),
    hex: t('hex'),
    automatic: t('automatic'),
    automaticDescription: t('automaticDescription'),
    areaRoleDescription: t('areaRoleDescription'),
    hexInvalid: t('hexInvalid'),
    picker: t('picker'),
  }

  // Return
  return {
    labels,
    triggerLabel: t('trigger'),
    describeColor: (color: HsvaColor) => describeColour(color, t),
  }
}
