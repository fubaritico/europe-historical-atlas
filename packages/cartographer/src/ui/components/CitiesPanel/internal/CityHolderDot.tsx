import { Tooltip, useTooltip } from '@fubaritico/react/Tooltip'
import { useRef } from 'react'

import { useTranslation } from '../../../hooks/useTranslation'
import { CITIES_PANEL_MESSAGES } from '../i18n'

import type { HolderDot } from '../utils/holderDot'

/**
 * The dot between a city's eye and its name (CARTO-367, the dev, 2026-11-07): its holder's colour by the sources, ringed
 * as its point on the canvas, a hollow ring when none is entered or the map lacks it; on hover, a bubble names the holder
 * and its suzerain — the design system's `Tooltip`, at once, the pointer able to rest on it.
 *
 * **Hover only**: the dot is not a tab stop — a stop per city across a thousand rows would bury the keyboard, and the
 * holder is said by the detail the name opens (‹enter›).
 * @param props - the dot
 * @param props.dot - its colour and what its bubble says
 * @returns the dot and its bubble
 */
export function CityHolderDot({ dot }: { dot: HolderDot }) {
  // Context
  const t = useTranslation(CITIES_PANEL_MESSAGES)

  // Refs
  const ref = useRef<HTMLSpanElement>(null)

  // State
  const { open, triggerProps, bubbleProps } = useTooltip({ openDelay: 0 })

  // Render
  return (
    <>
      <span
        ref={ref}
        className="city-row__dot"
        data-empty={dot.colour === null}
        style={dot.colour === null ? undefined : { background: dot.colour }}
        {...triggerProps}
      />
      <Tooltip
        content={t(dot.key, dot.values)}
        visible={open}
        targetRef={ref}
        placement="top"
        {...bubbleProps}
      />
    </>
  )
}
