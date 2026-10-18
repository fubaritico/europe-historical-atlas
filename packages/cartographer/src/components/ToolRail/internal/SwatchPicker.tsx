import { ColorPicker } from '@fubaritico/react/ColorPicker'
import { Popover } from '@fubaritico/react/Popover'
import { useState } from 'react'

import type { ActiveSwatchProps, SwatchPolity } from './ActiveSwatch'
import type { HsvaColor } from '@fubaritico/behaviors'

/**
 * The swatch of a polity, and the picker it opens.
 * @param props - the polity, where a chosen colour goes, and whether it starts open
 * @param props.polity - the polity aimed at
 * @param props.onColour - a gesture ended on a colour
 * @param props.defaultOpen - show the picker open from the start
 * @returns the swatch and its picker
 */
export function SwatchPicker({
  polity,
  onColour,
  defaultOpen,
}: {
  polity: SwatchPolity
  onColour: ActiveSwatchProps['onColour']
  defaultOpen: boolean
}) {
  // State
  // The picker's value during a gesture: it moves with every sample, and only its end reaches the document.
  const [draft, setDraft] = useState<HsvaColor | null>(polity.picked)

  // Derived
  const name = `Colour of ${polity.name}`

  // Handlers
  const handleOpenChange = (open: boolean) => {
    // Every opening starts from the document's colour, not from where an earlier gesture left the picker.
    if (open) setDraft(polity.picked)
  }

  // Render
  return (
    <Popover label={name} defaultOpen={defaultOpen} onOpenChange={handleOpenChange}>
      <Popover.Trigger
        className="tool-rail__swatch"
        aria-label={name}
        title={`${name} — click to change it`}
        style={{ background: polity.colour }}
      />
      <Popover.Content className="tool-rail__picker">
        <ColorPicker
          value={draft}
          onChange={setDraft}
          onChangeComplete={onColour}
          nullable
          density="compact"
        />
      </Popover.Content>
    </Popover>
  )
}
