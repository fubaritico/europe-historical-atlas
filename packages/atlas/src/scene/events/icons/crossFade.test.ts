import { describe, expect, it } from 'vitest'

import { flatIconSize, iconCrossFade } from './crossFade'
import { ICON_CROSS_FADE, ICON_FLAT_MIN_PIXELS, ICON_FLAT_SPAN } from './settings'

// L3: N/A — pure arithmetic over numbers; nothing is refused
// L4: N/A — no async work, nothing external

describe('iconCrossFade', () => {
  it('is the flat icon alone below the span and the 3D icon alone above it', () => {
    expect(iconCrossFade(ICON_CROSS_FADE.zoom - ICON_CROSS_FADE.span)).toBe(0)
    expect(iconCrossFade(ICON_CROSS_FADE.zoom + ICON_CROSS_FADE.span)).toBe(1)
  })

  it('is half and half at its middle, and grows with the zoom', () => {
    expect(iconCrossFade(ICON_CROSS_FADE.zoom)).toBeCloseTo(0.5)
    expect(iconCrossFade(ICON_CROSS_FADE.zoom + 0.02)).toBeGreaterThan(0.5)
  })
})

describe('flatIconSize', () => {
  it('is the 3D icon’s size when that is large enough on screen', () => {
    expect(flatIconSize(0.05, 10_000)).toBeCloseTo(0.05 * ICON_FLAT_SPAN)
  })

  it('keeps its fewest pixels when the 3D icon would be smaller on screen', () => {
    expect(flatIconSize(0.05, 10) * 10).toBeCloseTo(ICON_FLAT_MIN_PIXELS)
  })
})
