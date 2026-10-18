import { ColorField } from '@fubaritico/react/ColorField'

import type { HsvaColor } from '@fubaritico/behaviors'

/**
 * The colour, as the design system's field: a swatch, the hex, and the picker in a popover.
 *
 * `nullable` is "automatic", `s02`'s default. **No `alpha`**: a polity's colour is laid over the relief,
 * so the format has no opacity to give. **The popover stays inside the Modal**, never in a portal —
 * `showModal()` makes everything outside the dialogue inert, so a portalled panel could not be clicked.
 */
export function ColourField({
  value,
  onChange,
}: {
  value: HsvaColor | null
  onChange: (colour: HsvaColor | null) => void
}) {
  // Render
  return <ColorField label="Colour" value={value} onChange={onChange} nullable density="compact" />
}
