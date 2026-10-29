import { describe, expect, it } from 'vitest'

import {
  frontierStrokes,
  groupSegmentsByPattern,
  inlayOpacityScale,
  patternStrokes,
} from './borderStrokes'
import { STYLE } from './testing/borderFixtures'

describe('inlayOpacityScale', () => {
  it('ramps from nothing at full zoom-out to full strength at the threshold', () => {
    expect(inlayOpacityScale(0, 0.4)).toBe(0)
    expect(inlayOpacityScale(0.2, 0.4)).toBeCloseTo(0.5)
    expect(inlayOpacityScale(0.4, 0.4)).toBe(1)
  })

  it('holds at full strength beyond the threshold', () => {
    expect(inlayOpacityScale(1, 0.4)).toBe(1)
  })

  it('never fades when the threshold is zero, instead of dividing by it', () => {
    // The slider goes down to 0. `0 / 0` is NaN, and `clamp01` passes NaN straight through since both
    // its comparisons are false against it — a NaN opacity throws nothing and WebGL drops the draw, so
    // the casing would vanish silently at the default camera position.
    expect(inlayOpacityScale(0, 0)).toBe(1)
    expect(inlayOpacityScale(0.5, 0)).toBe(1)
    expect(Number.isNaN(inlayOpacityScale(0, 0))).toBe(false)
  })

  it('clamps a negative threshold rather than inverting the ramp', () => {
    expect(inlayOpacityScale(0.5, -1)).toBe(1)
  })
})

describe('groupSegmentsByPattern', () => {
  const line = [
    { u: 0, v: 0 },
    { u: 1, v: 0 },
  ]
  const between = [
    { pair: [0, 1] as const, lines: [line] },
    { pair: [1, 2] as const, lines: [line] },
  ]

  describe('happy path', () => {
    it('puts every pair drawn the same way into one bucket', () => {
      const grouped = groupSegmentsByPattern(between, () => 'solid', 0.001)
      expect(grouped.size).toBe(1)
      expect(grouped.get('solid')).toHaveLength(2)
    })
  })

  describe('variants', () => {
    it('keeps patterns apart, since each is its own draw call', () => {
      const grouped = groupSegmentsByPattern(
        between,
        (p) => (p[0] === 0 ? 'dashed' : 'solid'),
        0.001
      )
      expect([...grouped.keys()].sort()).toEqual(['dashed', 'solid'])
    })

    it('doubles the geometry of a doubled border, shifting each half either way', () => {
      const grouped = groupSegmentsByPattern(between, () => 'double', 0.001)
      expect(grouped.get('double')).toHaveLength(4)
    })
  })

  describe('managed errors', () => {
    it('returns nothing for a year with no shared borders', () => {
      expect(groupSegmentsByPattern([], () => 'solid', 0.001).size).toBe(0)
    })
  })

  describe('unmanaged errors', () => {
    it('drops a chain too short to make a segment rather than emitting a degenerate one', () => {
      const grouped = groupSegmentsByPattern(
        [{ pair: [0, 1] as const, lines: [[{ u: 0, v: 0 }]] }],
        () => 'solid',
        0.001
      )
      expect(grouped.get('solid')).toHaveLength(0)
    })
  })

  describe('edge cases', () => {
    it('leaves a doubled border on its true line at zero gap', () => {
      const grouped = groupSegmentsByPattern(between, () => 'double', 0)
      expect(grouped.get('double')?.[0]?.[0]).toEqual({ u: 0, v: 0 })
    })
  })
})

describe('patternStrokes', () => {
  const segments = [
    [
      { u: 0, v: 0 },
      { u: 1, v: 0 },
    ],
  ] as unknown as Parameters<typeof patternStrokes>[1]

  describe('happy path', () => {
    it('dresses a plain border as a parchment line afar, and an edging with a core inside it close up', () => {
      expect(patternStrokes('solid', segments, STYLE).map((s) => s.role)).toEqual([
        'far',
        'edge',
        'inlay',
      ])
    })
  })

  describe('variants', () => {
    it('leaves a patterned border as one dark stroke, its meaning being its shape', () => {
      expect(patternStrokes('dashed', segments, STYLE).map((s) => s.role)).toEqual(['pattern'])
    })

    // The dev, 2026-10-29: « frontière entre vassaux couleur parchemin ».
    it('draws a border between vassals as one parchment stroke, whatever its pattern', () => {
      const strokes = patternStrokes('solid', segments, STYLE, true)
      expect(strokes.map(({ role, color }) => [role, color])).toEqual([
        ['vassal', STYLE.vassalColor],
      ])
      expect(patternStrokes('double', segments, STYLE, true)).toHaveLength(1)
    })

    // The dev, 2026-10-29: « entre vassaux plus fin, essayer de n'avoir que des points, pas de tirets ».
    it('dots a border between vassals with its own thin width and its own dots, whatever its pattern', () => {
      for (const pattern of ['solid', 'dashed'] as const)
        expect(patternStrokes(pattern, segments, STYLE, true)[0]).toMatchObject({
          width: STYLE.vassalWidth,
          dashed: true,
          dashSize: STYLE.vassalDotSize,
          gapSize: STYLE.vassalDotGap,
        })
    })

    it('draws the parchment afar thinner than the brown edge close up', () => {
      const [far, edge] = patternStrokes('solid', segments, STYLE)
      expect([far?.color, edge?.color]).toEqual([STYLE.parchmentColor, STYLE.edgeColor])
      expect(far?.width).toBeLessThan(edge?.width ?? 0)
    })

    it('marks a dashed pattern dashed and a doubled one not', () => {
      expect(patternStrokes('dashed', segments, STYLE)[0]?.dashed).toBe(true)
      expect(patternStrokes('double', segments, STYLE)[0]?.dashed).toBe(false)
    })
  })

  describe('managed errors', () => {
    it('skips an inlay that would cover the edging it sits inside', () => {
      const wide = { ...STYLE, coreWidth: 3, edgeWidth: 3 }
      expect(patternStrokes('solid', segments, wide).map((s) => s.role)).toEqual(['far', 'edge'])
    })
  })

  describe('unmanaged errors', () => {
    it('still emits its passes for an empty set, the caller deciding what is worth drawing', () => {
      expect(patternStrokes('solid', [], STYLE)).toHaveLength(3)
    })
  })

  describe('edge cases', () => {
    it('draws the edging first, so the core lands on top of it', () => {
      const [, edge, inlay] = patternStrokes('solid', segments, STYLE)
      expect(edge?.width).toBeGreaterThan(inlay?.width ?? 0)
    })
  })
})

describe('frontierStrokes', () => {
  // A run heading east, north up: its polity on the left, the north; the unclaimed ground south, on its right.
  const east = [
    [
      { u: 0, v: 0.5 },
      { u: 1, v: 0.5 },
    ],
  ]

  describe('happy path', () => {
    // The dev, 2026-10-29: « dézoomé couleur parchemin, un peu plus fin, zoomé un trait marron et un trait couleur
    // parchemin côté non revendiqué ».
    it('draws the frontier in parchment afar, and close up a brown stroke with a parchment one beside it', () => {
      expect(frontierStrokes(east, STYLE).map(({ role, color }) => [role, color])).toEqual([
        ['far', STYLE.parchmentColor],
        ['side', STYLE.parchmentColor],
        ['side', STYLE.parchmentColor],
        ['frontier', STYLE.frontierColor],
      ])
    })
  })

  describe('variants', () => {
    it('lays the parchment beside it on the unclaimed side, the run’s right — south of a run heading east', () => {
      const side = frontierStrokes(east, STYLE)[2]?.segments[0]
      // v grows southward on the grid.
      expect(side?.[0]?.v).toBeCloseTo(0.5 + STYLE.frontierSideGap, 9)
    })

    // The dev, 2026-10-29: « un troisième tracé après le parchemin […] pour suggérer une légère disparition ».
    it('lays the same line half gone beyond it, as far again, so the frontier fades out', () => {
      const fading = frontierStrokes(east, STYLE)[1]
      expect(fading?.segments[0]?.[0]?.v).toBeCloseTo(0.5 + 2 * STYLE.frontierSideGap, 9)
      expect(fading?.opacity).toBeCloseTo(STYLE.opacity * STYLE.frontierFadeShare, 9)
    })

    it('gives the brown stroke and the parchment beside it their own widths', () => {
      const [, , side, frontier] = frontierStrokes(east, STYLE)
      expect([side?.width, frontier?.width]).toEqual([STYLE.frontierSideWidth, STYLE.frontierWidth])
    })

    it('draws it thinner afar than close up', () => {
      const [far, , , frontier] = frontierStrokes(east, STYLE)
      expect(far?.width).toBeLessThan(frontier?.width ?? 0)
    })
  })

  // L3, L4: N/A — pure dressing of runs the derivation checked.

  describe('edge cases', () => {
    it('draws nothing for a year with no frontier, each pass empty', () => {
      expect(frontierStrokes([], STYLE).every(({ segments }) => segments.length === 0)).toBe(true)
    })
  })
})
