import { describe, expect, it, vi } from 'vitest'

import {
  BEYOND_OUTLINE_KM,
  FEATHER_MODES,
  TRIBE_FEATHER,
  TRIBE_FEATHER_REACH_KM,
  featherOpacity,
  featherShiftKm,
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

  it('is one of the two modes', () => {
    expect(FEATHER_MODES).toContain(TRIBE_FEATHER.mode)
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
