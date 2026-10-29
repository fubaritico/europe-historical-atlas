import { describe, expect, it } from 'vitest'

import { crossFading, flatIconSize, iconCrossFade } from './crossFade'
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

// The dev, 2026-10-29: the markers fade in with the countries and their names at startup.
describe('crossFading', () => {
  it('shares the forms by the zoom, the whole by how far it has come in', () => {
    const shares: [number, number][] = []
    const fading = crossFading((near, far) => shares.push([near, far]))
    fading.setNear(0.25)
    fading.setReveal(0.5)
    expect(shares.at(-1)).toEqual([0.125, 0.375])
  })

  it('keeps the startup’s share when the zoom moves, and the zoom’s when the share does', () => {
    const shares: [number, number][] = []
    const fading = crossFading((near, far) => shares.push([near, far]))
    fading.setReveal(0)
    fading.setNear(1)
    expect(shares.at(-1)).toEqual([0, 0])
  })
})
