import { describe, expect, it, vi } from 'vitest'

import {
  SOVEREIGN_BAND_IRREGULARITY,
  SOVEREIGN_BAND_WAVE_KM,
  VASSAL_BAND_SHARE,
  VASSAL_BAND_WIDTH_KM,
} from '../data/vassalBand'

import {
  BAND_SHARE,
  BAND_WAVE_KM,
  BEYOND_OUTLINE_KM,
  FEATHER_MODES,
  TRIBE_FEATHER_REACH_KM as REACH,
  TRIBE_FEATHER,
  TRIBE_FEATHER_REACH_KM,
  TRIBE_OUTLINED_FEATHER,
  bandWave,
  bandWidthKm,
  featherOpacity,
  featherReachKm,
  featherShiftKm,
  rimWidthKm,
  tribeOpacity,
  tribeOpacityAt,
} from './tribeFeather'

describe('featherOpacity', () => {
  describe('happy path', () => {
    it('is full 15 km inside in inset, at a width of 15', () => {
      expect(featherOpacity(-15, 15, 'inset')).toBe(1)
    })

    it('is nothing on the outline in inset', () => {
      expect(featherOpacity(0, 15, 'inset')).toBe(0)
    })

    it('is full on the outline in outset', () => {
      expect(featherOpacity(0, 15, 'outset')).toBe(1)
    })

    it('is nothing 15 km outside in outset', () => {
      expect(featherOpacity(15, 15, 'outset')).toBe(0)
    })
  })

  describe('variants', () => {
    it('is half way at the middle of the fade, in inset', () => {
      expect(featherOpacity(-7.5, 15, 'inset')).toBeCloseTo(0.5, 9)
    })

    it('is half way at the middle of the fade, in outset', () => {
      expect(featherOpacity(7.5, 15, 'outset')).toBeCloseTo(0.5, 9)
    })

    it('eases as a smoothstep: 0.156 a quarter of the way into an inset fade', () => {
      expect(featherOpacity(-3.75, 15, 'inset')).toBeCloseTo(0.15625, 9)
    })

    it('rises steadily from the outline inward, in inset', () => {
      const ramp = [0, -3, -6, -9, -12, -15].map((d) => featherOpacity(d, 15, 'inset'))
      for (let i = 1; i < ramp.length; i++) expect(ramp[i]).toBeGreaterThan(ramp[i - 1] ?? 1)
    })

    it('is full everywhere inside in outset, however deep', () => {
      expect(featherOpacity(-1, 15, 'outset')).toBe(1)
      expect(featherOpacity(-200, 15, 'outset')).toBe(1)
    })

    it('is nothing everywhere outside in inset', () => {
      expect(featherOpacity(1, 15, 'inset')).toBe(0)
    })
  })

  describe('managed errors', () => {
    it('draws a hard edge for a width of zero, inset: inside full, the outline empty', () => {
      expect(featherOpacity(-0.1, 0, 'inset')).toBe(1)
      expect(featherOpacity(0, 0, 'inset')).toBe(0)
    })

    it('draws a hard edge for a width of zero, outset: the outline full, outside empty', () => {
      expect(featherOpacity(0, 0, 'outset')).toBe(1)
      expect(featherOpacity(0.1, 0, 'outset')).toBe(0)
    })
  })

  describe('unmanaged errors', () => {
    it('answers NaN for a distance that is not a number', () => {
      expect(featherOpacity(Number.NaN, 15, 'inset')).toBeNaN()
    })

    it('answers NaN for a width that is not a number', () => {
      expect(featherOpacity(-5, Number.NaN, 'outset')).toBeNaN()
    })
  })

  describe('edge cases', () => {
    it('reads a negative width as a hard edge', () => {
      expect(featherOpacity(-1, -4, 'inset')).toBe(1)
    })

    it('stays within 0..1 far on either side', () => {
      for (const mode of FEATHER_MODES) {
        expect(featherOpacity(-1e6, 15, mode)).toBe(1)
        expect(featherOpacity(1e6, 15, mode)).toBe(0)
      }
    })
  })
})

describe('featherShiftKm', () => {
  it('is zero for inset and the width for outset — what the atlas shader is handed', () => {
    expect(featherShiftKm('inset', 15)).toBe(0)
    expect(featherShiftKm('outset', 15)).toBe(15)
  })
})

describe('TRIBE_FEATHER', () => {
  it('fades within the reach the distances are computed to', () => {
    expect(TRIBE_FEATHER.widthKm).toBeGreaterThan(0)
    expect(TRIBE_FEATHER.widthKm).toBeLessThanOrEqual(TRIBE_FEATHER_REACH_KM)
  })

  it('is one of the modes — the band, the dev’s choice of 2026-11-02', () => {
    expect(FEATHER_MODES).toContain(TRIBE_FEATHER.mode)
    expect(TRIBE_FEATHER.mode).toBe('band')
  })
})

// The dev, 2026-11-02: Illustrator's offset path inwards — the full colour, and the offset band at half.
describe('featherOpacity, the band', () => {
  describe('happy path', () => {
    it('gives half the colour within 30 km inside the outline, the full colour deeper', () => {
      expect([featherOpacity(-10, 30, 'band'), featherOpacity(-40, 30, 'band')]).toEqual([
        BAND_SHARE,
        1,
      ])
    })
  })

  describe('variants', () => {
    it('steps at the width itself: half just short of it, full from it', () => {
      expect([featherOpacity(-29.999, 30, 'band'), featherOpacity(-30, 30, 'band')]).toEqual([
        BAND_SHARE,
        1,
      ])
    })
  })

  describe('unmanaged errors', () => {
    it('stays NaN for a NaN distance', () => {
      expect(featherOpacity(Number.NaN, 30, 'band')).toBeNaN()
    })
  })

  describe('edge cases', () => {
    it('gives nothing on the outline and past it, nor half a colour outside', () => {
      expect([featherOpacity(0, 30, 'band'), featherOpacity(5, 30, 'band')]).toEqual([0, 0])
    })

    it('is the full colour everywhere inside for a width of zero', () => {
      expect(featherOpacity(-0.001, 0, 'band')).toBe(1)
    })
  })
})

describe('tribeOpacity', () => {
  const OUTSET = { mode: 'outset', widthKm: 30 } as const
  const INSET = { mode: 'inset', widthKm: 30 } as const

  describe('happy path', () => {
    it('spills an outset fade over land nobody claims', () => {
      expect(tribeOpacity({ signedKm: 10, claimedKm: 50, land: true }, OUTSET)).toBeCloseTo(
        featherOpacity(10, 30, 'outset'),
        12
      )
    })

    it('cuts an outset fade to nothing over another polity’s ground', () => {
      expect(tribeOpacity({ signedKm: 10, claimedKm: -2, land: true }, OUTSET)).toBe(0)
    })
  })

  describe('variants', () => {
    it('cuts an outset fade to nothing over the sea, as a fill never paints it', () => {
      expect(tribeOpacity({ signedKm: 5, claimedKm: 50, land: false }, OUTSET)).toBe(0)
    })

    it('colours its own ground as a fill would, lakes included', () => {
      expect(tribeOpacity({ signedKm: -5, claimedKm: 50, land: false }, OUTSET)).toBe(1)
    })

    it('leaves an inset fade as it is: it never reaches beyond the outline', () => {
      expect(tribeOpacity({ signedKm: -10, claimedKm: -3, land: true }, INSET)).toBeCloseTo(
        featherOpacity(-10, 30, 'inset'),
        12
      )
    })
  })

  describe('managed errors', () => {
    it('keeps the colour full on its own outline in outset, where its neighbour begins', () => {
      expect(tribeOpacity({ signedKm: 0, claimedKm: 0, land: true }, OUTSET)).toBe(1)
    })
  })

  describe('unmanaged errors', () => {
    it('answers NaN for a claimed distance that is not a number, rather than spilling', () => {
      expect(tribeOpacity({ signedKm: 5, claimedKm: Number.NaN, land: true }, OUTSET)).toBeNaN()
    })
  })

  describe('edge cases', () => {
    it('cuts just past the outline, over a neighbour a hair inside its own ground', () => {
      expect(tribeOpacity({ signedKm: 1e-6, claimedKm: -1e-6, land: true }, OUTSET)).toBe(0)
    })
  })
})

describe('tribeOpacityAt', () => {
  const OUTSET = { mode: 'outset', widthKm: 30 } as const
  const INSET = { mode: 'inset', widthKm: 30 } as const
  const free = { claimedKm: 50, land: true }

  describe('happy path', () => {
    it('answers as tribeOpacity, asking the neighbours once within an outset spill', () => {
      const beyond = vi.fn(() => free)
      expect(tribeOpacityAt(10, OUTSET, beyond)).toBe(
        tribeOpacity({ signedKm: 10, ...free }, OUTSET)
      )
      expect(beyond).toHaveBeenCalledTimes(1)
    })
  })

  describe('variants', () => {
    // QUAL-003: in inset the neighbours and the land are never needed, so never measured.
    it('never asks the neighbours in inset, inside or beyond the outline', () => {
      const beyond = vi.fn(() => free)
      for (const d of [-40, -10, 0, 1e-6, 10, 45]) tribeOpacityAt(d, INSET, beyond)
      expect(beyond).not.toHaveBeenCalled()
    })

    it('never asks the neighbours inside the outline in outset', () => {
      const beyond = vi.fn(() => free)
      for (const d of [-40, -10, 0]) tribeOpacityAt(d, OUTSET, beyond)
      expect(beyond).not.toHaveBeenCalled()
    })

    it('never asks the neighbours past the end of an outset spill, where the ramp is nothing', () => {
      const beyond = vi.fn(() => free)
      expect(tribeOpacityAt(30, OUTSET, beyond)).toBe(0)
      expect(tribeOpacityAt(45, OUTSET, beyond)).toBe(0)
      expect(beyond).not.toHaveBeenCalled()
    })
  })

  describe('managed errors', () => {
    it('cuts over the sea, read only where it decides', () => {
      expect(tribeOpacityAt(5, OUTSET, () => ({ claimedKm: 50, land: false }))).toBe(0)
    })
  })

  describe('unmanaged errors', () => {
    it('answers NaN for a width that is not a number beyond the outline, even over a neighbour', () => {
      const width = { mode: 'outset', widthKm: Number.NaN } as const
      expect(tribeOpacityAt(5, width, () => ({ claimedKm: -5, land: true }))).toBeNaN()
    })

    it('answers NaN for a distance that is not a number', () => {
      expect(tribeOpacityAt(Number.NaN, OUTSET, () => free)).toBeNaN()
    })
  })

  describe('edge cases', () => {
    it('reads a point less than BEYOND_OUTLINE_KM past the outline as on it: not cut', () => {
      const claimed = { claimedKm: -5, land: true }
      expect(tribeOpacityAt(BEYOND_OUTLINE_KM / 2, OUTSET, () => claimed)).toBeCloseTo(1, 9)
      expect(tribeOpacityAt(BEYOND_OUTLINE_KM, OUTSET, () => claimed)).toBe(0)
    })
  })
})

/** Ground nobody claims, dry — what the band never asks, being inside. */
const FREE = () => ({ claimedKm: 5, land: true })

// The dev, 2026-11-02: an irregular offset — "sometimes wider, sometimes thicker, to show the variation".
describe('bandWidthKm', () => {
  const UNEVEN = { mode: 'band', widthKm: 30, irregularity: 0.5, waveKm: 150 } as const
  const SAMPLES = Array.from({ length: 400 }, (_, index) => ({
    u: (index % 20) / 20,
    v: Math.floor(index / 20) / 20,
  }))

  describe('happy path', () => {
    it('varies along the frame between half and one and a half times the mean width', () => {
      const widths = SAMPLES.map(({ u, v }) => bandWidthKm(UNEVEN, u, v))
      expect(Math.min(...widths)).toBeGreaterThanOrEqual(15)
      expect(Math.max(...widths)).toBeLessThanOrEqual(45)
      expect(Math.max(...widths) - Math.min(...widths)).toBeGreaterThan(20)
    })
  })

  describe('variants', () => {
    it('keeps the band even with no irregularity, or none given', () => {
      expect(bandWidthKm({ ...UNEVEN, irregularity: 0 }, 0.3, 0.7)).toBe(30)
      expect(bandWidthKm({ mode: 'band', widthKm: 30 }, 0.3, 0.7)).toBe(30)
    })

    it('is the same at each opening: the wave holds no chance', () => {
      expect(bandWave(0.31, 0.42, 150)).toBe(bandWave(0.31, 0.42, 150))
    })

    it('undulates the opacity at a point given, and keeps the mean width without one', () => {
      const at = SAMPLES.find(({ u, v }) => bandWidthKm(UNEVEN, u, v) > 40)
      if (!at) throw new Error('no wide point among the samples')
      expect([tribeOpacityAt(-35, UNEVEN, FREE, at), tribeOpacityAt(-35, UNEVEN, FREE)]).toEqual([
        BAND_SHARE,
        1,
      ])
    })
  })

  // L3, L4: N/A — arithmetic on numbers.

  describe('edge cases', () => {
    it('never goes past the depth its distances are computed to, the band’s nor the fade’s', () => {
      const widths = SAMPLES.map(({ u, v }) => bandWidthKm(UNEVEN, u, v))
      expect(Math.max(...widths)).toBeLessThanOrEqual(featherReachKm(UNEVEN))
      expect(featherReachKm({ mode: 'inset', widthKm: 30, irregularity: 0.5 })).toBe(30)
    })

    it('stays inside: the band shifts nothing past the outline', () => {
      expect(featherShiftKm('band', 30)).toBe(0)
    })

    it('never goes past the reach the distances are computed to, nor under nought', () => {
      const wild = { ...UNEVEN, widthKm: REACH, irregularity: 1 }
      const widths = SAMPLES.map(({ u, v }) => bandWidthKm(wild, u, v))
      expect([Math.max(...widths) <= REACH, Math.min(...widths) >= 0]).toEqual([true, true])
    })
  })
})

// ATLAS-398, the dev, 2026-11-09: the vassals' band is the tribes' "regular" and "thinner" — the same half, a narrower
// width. Held here, where both are in reach: `data/` may not import the editor.
describe('the vassals’ band beside the tribes’', () => {
  it('shares the tribes’ band share, and is thinner than their band', () => {
    expect(VASSAL_BAND_SHARE).toBe(BAND_SHARE)
    expect(VASSAL_BAND_WIDTH_KM).toBeLessThan(TRIBE_FEATHER.widthKm)
  })

  // The dev, 2026-11-09: the sovereigns' band undulates as the tribes' does — the same irregularity and wavelength.
  it('gives the sovereigns’ band the tribes’ undulation', () => {
    expect([SOVEREIGN_BAND_IRREGULARITY, SOVEREIGN_BAND_WAVE_KM]).toEqual([
      TRIBE_FEATHER.irregularity,
      BAND_WAVE_KM,
    ])
  })
})

// CARTO-439, the dev, 2026-11-13: the band inside out — full from the outline to 10 km, half to 20, nothing deeper.
describe('featherOpacity, the outlined tribe', () => {
  describe('happy path', () => {
    it('is full within 10 km of the outline, half from 10 to 20 km, nothing deeper', () => {
      expect(
        [-1, -9.9, -10, -19.9, -20, -60].map((d) => featherOpacity(d, 20, 'outlined', 10))
      ).toEqual([1, 1, BAND_SHARE, BAND_SHARE, 0, 0])
    })
  })

  describe('variants', () => {
    it('undulates both limits by one wave, the rim always half the width', () => {
      for (const [u, v] of [
        [0.1, 0.2],
        [0.72, 0.05],
      ] as const)
        expect(rimWidthKm(TRIBE_OUTLINED_FEATHER, u, v) * 2).toBeCloseTo(
          bandWidthKm(TRIBE_OUTLINED_FEATHER, u, v),
          9
        )
    })
  })

  describe('managed errors', () => {
    it('draws nothing on the outline nor past it', () => {
      expect([0, 5].map((d) => featherOpacity(d, 30, 'outlined', 15))).toEqual([0, 0])
    })
  })

  describe('unmanaged errors', () => {
    it('stays NaN for a NaN distance', () => {
      expect(featherOpacity(Number.NaN, 30, 'outlined', 15)).toBeNaN()
    })
  })

  describe('edge cases', () => {
    it('is computed within the reach the distances are measured to', () => {
      expect(featherReachKm(TRIBE_OUTLINED_FEATHER)).toBeLessThanOrEqual(TRIBE_FEATHER_REACH_KM)
    })
  })
})
