import { ColorPicker } from '@fubaritico/react/ColorPicker'
import { Popover } from '@fubaritico/react/Popover'
import { useState } from 'react'

import { useColourPickerWords } from '../../../hooks/useColourPickerWords'
import { useTranslation } from '../../../hooks/useTranslation'
import { pickedColour } from '../../../utils/pickedColour'
import { TOOL_RAIL_MESSAGES } from '../i18n'

import type { ColorValue, HsvaColor } from '@fubaritico/behaviors'

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
 * The swatch of a polity, and the picker it opens — with, beside its hex, the design system's « copy » and « paste »
 * (0.10.0, CARTO-465, the dev, 2026-11-17): copy a polity's colour, select another, paste it.
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
  const handleChange = (value: ColorValue) => {
    const picked = pickedColour(value)
    if (picked !== undefined) setDraft(picked)
  }
  // A gesture's end — a drag let go, a hex typed, a colour pasted (design system 0.10.0, CARTO-465) — reaches the document
  const handleChangeComplete = (value: ColorValue) => {
    const picked = pickedColour(value)
    if (picked !== undefined) onColour(picked)
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
          onChange={handleChange}
          onChangeComplete={handleChangeComplete}
          nullable
          density="compact"
          labels={labels}
          describeColor={describeColor}
        />
      </Popover.Content>
    </Popover>
  )
}
