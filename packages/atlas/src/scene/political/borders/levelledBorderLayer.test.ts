import { describe, expect, it } from 'vitest'

import { createLevelledBorderLayer, splitBordersByLevel } from './levelledBorderLayer'

import type { ComposedLineLayer, ComposedStroke } from './composedLineLayer'
import type { UvPoint } from '@europe-historical-atlas/core/data/coastlineSource'
import type { RegionBorders } from '@europe-historical-atlas/core/data/regionBorders'

/** A vertical two-point run. */
function run(u: number): UvPoint[] {
  return [
    { u, v: 0 },
    { u, v: 1 },
  ]
}

/** One pass of one stretch, recognisable by its opacity. */
function stroke(opacity: number, role: ComposedStroke['role'] = 'edge'): ComposedStroke {
  const [a, b] = run(opacity)
  return {
    segments: a && b ? [[a, b]] : [],
    color: '#000000',
    width: 2,
    opacity,
    role,
  }
}

/** Project a grid coordinate onto a flat plane — the collaborator, mocked. */
const project = (u: number, v: number): [number, number, number] => [u, 0, v]

/** The live opacity of each pass of a level. */
function opacities(layer: ComposedLineLayer | undefined): number[] {
  return (layer?.object.children ?? []).map((child: object) => {
    const { material } = child as unknown as { material: { opacity: number } }
    return material.opacity
  })
}

/** One live material property of each pass of a level — what a setter must reach. */
function live(
  layer: ComposedLineLayer | undefined,
  read: (material: {
    linewidth: number
    dashScale: number
    resolution: { x: number; y: number }
  }) => number
): number[] {
  return (layer?.object.children ?? []).map((child: object) => {
    const { material } = child as unknown as {
      material: { linewidth: number; dashScale: number; resolution: { x: number; y: number } }
    }
    return read(material)
  })
}

const BORDERS: RegionBorders = {
  between: [
    { pair: [0, 0], lines: [run(0.1)] },
    { pair: [1, 1], lines: [run(0.2)] },
    { pair: [2, 2], lines: [run(0.3)] },
  ],
  frontier: [run(0.9)],
}

describe('splitBordersByLevel', () => {
  describe('happy path', () => {
    it('files each group under its split level, the frontier under level 0', () => {
      const levels = splitBordersByLevel(BORDERS, (pair) => [0, 1, 1][pair[0]] ?? 0)
      expect(levels.get(0)).toEqual({ between: [BORDERS.between[0]], frontier: BORDERS.frontier })
      expect(levels.get(1)).toEqual({
        between: [BORDERS.between[1], BORDERS.between[2]],
        frontier: [],
      })
    })
  })

  describe('variants', () => {
    it('keeps every group at level 0 when nothing is a vassal — a payload year', () => {
      expect([...splitBordersByLevel(BORDERS, () => 0).keys()]).toEqual([0])
    })
  })

  // L3 (managed errors): N/A — it sorts what it is given; a missing level is the caller's to refuse.

  describe('unmanaged errors', () => {
    it('files a negative level under level 0 rather than hiding the line for ever', () => {
      expect(splitBordersByLevel(BORDERS, () => -1).get(0)?.between).toHaveLength(3)
    })
  })

  describe('edge cases', () => {
    it('answers an empty level 0 for no line at all', () => {
      expect(splitBordersByLevel({ between: [], frontier: [] }, () => 1)).toEqual(
        new Map([[0, { between: [], frontier: [] }]])
      )
    })
  })
})

describe('createLevelledBorderLayer', () => {
  const byLevel = new Map([
    [1, [stroke(0.6)]],
    [0, [stroke(0.4, 'frontier'), stroke(0.8)]],
  ])

  describe('happy path', () => {
    it('builds one composed layer per level, shallowest first in draw order', () => {
      const layer = createLevelledBorderLayer(byLevel, { project, renderOrderBase: 10 })
      expect([...layer.levels.keys()]).toEqual([0, 1])
      const orders = layer.object.children.flatMap((level) =>
        level.children.map((pass) => pass.renderOrder)
      )
      expect(orders).toEqual([10, 11, 12])
      layer.dispose()
    })

    it('hides a level of homage until the detail reaches it, and keeps level 0 whole', () => {
      const layer = createLevelledBorderLayer(byLevel, { project })
      layer.setDetail(0)
      expect(layer.levels.get(1)?.object.visible).toBe(false)
      expect(layer.levels.get(0)?.object.visible).toBe(true)
      expect(opacities(layer.levels.get(0))).toEqual([0.4, 0.8])
      layer.dispose()
    })
  })

  describe('variants', () => {
    it('fades a level in with the detail, every pass of it', () => {
      const layer = createLevelledBorderLayer(byLevel, { project })
      layer.setDetail(0.5)
      expect(layer.levels.get(1)?.object.visible).toBe(true)
      expect(opacities(layer.levels.get(1))).toEqual([0.3])
      layer.setDetail(1)
      expect(opacities(layer.levels.get(1))).toEqual([0.6])
      layer.dispose()
    })

    it('hands the zoom-out ease to every level, composed with the fade', () => {
      const layer = createLevelledBorderLayer(byLevel, { project })
      layer.setDetail(0.5)
      layer.setOpacityScale(0.5)
      expect(opacities(layer.levels.get(0))).toEqual([0.2, 0.4])
      expect(opacities(layer.levels.get(1))).toEqual([0.15])
      layer.dispose()
    })

    // Each setter checked on a deeper level, not only level 0: a forwarding that stopped at the first
    // level would leave every vassal border at its build-time width, dash and closeness.
    it('hands width, closeness, dash and resolution to a level of homage too', () => {
      const layer = createLevelledBorderLayer(
        new Map([
          [0, [stroke(0.4)]],
          // A vassals' parchment line stays as built; a close-up pass follows the closeness.
          [1, [stroke(0.5, 'vassal'), stroke(0.8, 'inlay')]],
        ]),
        { project }
      )
      layer.setDetail(1)
      layer.setWidthScale(0.5)
      layer.setCloseness(0.25)
      layer.setDashScale(320)
      layer.setResolution(800, 600)
      const deeper = layer.levels.get(1)
      expect(live(deeper, (material) => material.linewidth)).toEqual([1, 1])
      expect(opacities(deeper)).toEqual([0.5, 0.2])
      expect(live(deeper, (material) => material.dashScale)).toEqual([320, 320])
      expect(live(deeper, (material) => material.resolution.x)).toEqual([800, 800])
      expect(live(deeper, (material) => material.resolution.y)).toEqual([600, 600])
      layer.dispose()
    })
  })

  // L3 (managed errors): N/A — nothing is refused; an empty level is simply not built.

  describe('unmanaged errors', () => {
    it('builds no layer for a level whose passes are empty', () => {
      const layer = createLevelledBorderLayer(new Map([[2, [{ ...stroke(1), segments: [] }]]]), {
        project,
      })
      expect(layer.levels.size).toBe(0)
      layer.dispose()
    })
  })

  describe('edge cases', () => {
    it('frees every level on dispose', () => {
      const layer = createLevelledBorderLayer(byLevel, { project })
      layer.dispose()
      expect(layer.levels.size).toBe(0)
      expect(layer.object.children).toHaveLength(0)
    })
  })
})
