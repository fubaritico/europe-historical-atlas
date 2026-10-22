import { ColorPicker } from '@fubaritico/react/ColorPicker'
import { Popover } from '@fubaritico/react/Popover'
import { useState } from 'react'

import { useColourPickerWords } from '../../../hooks/useColourPickerWords'
import { useTranslation } from '../../../hooks/useTranslation'
import { TOOL_RAIL_MESSAGES } from '../i18n'

import type { HsvaColor } from '@fubaritico/behaviors'

/** The polity the swatch shows. */
export interface SwatchPolity {
  /** Its name, verbatim. */
  name: string
  /** The colour it is painted in — the palette's when it has none of its own. */
  colour: string
  /** Its own colour as the picker holds it, or `null` for "automatic". */
  picked: HsvaColor | null
}

/** What the picker shows and does. */
export interface SwatchPickerProps {
  /** The polity whose colour it shows. */
  polity: SwatchPolity
  /** A gesture in the picker ended on this colour, or on "automatic". */
  onColour: (picked: HsvaColor | null) => void
  /** Show the picker open from the start. */
  defaultOpen: boolean
}

/**
 * The swatch of a polity, and the picker it opens.
 * @param props - the polity, where a chosen colour goes, and whether it starts open
 * @param props.polity - the polity aimed at
 * @param props.onColour - a gesture ended on a colour
 * @param props.defaultOpen - show the picker open from the start
 * @returns the swatch and its picker
 */
export function SwatchPicker({ polity, onColour, defaultOpen }: SwatchPickerProps) {
  // Context
  const t = useTranslation(TOOL_RAIL_MESSAGES)
  const { labels, describeColor } = useColourPickerWords()

  // State
  // The picker's value during a gesture: it moves with every sample, and only its end reaches the document.
  const [draft, setDraft] = useState<HsvaColor | null>(polity.picked)

  // Derived
  const name = t('colourOf', { name: polity.name })

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
        title={t('colourHint', { name: polity.name })}
        style={{ background: polity.colour }}
      />
      <Popover.Content className="tool-rail__picker">
        <ColorPicker
          value={draft}
          onChange={setDraft}
          onChangeComplete={onColour}
          nullable
          density="compact"
          labels={labels}
          describeColor={describeColor}
        />
      </Popover.Content>
    </Popover>
  )
}
