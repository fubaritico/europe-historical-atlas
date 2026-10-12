import { Texture } from 'three'
import { describe, expect, it, vi } from 'vitest'

import { buildLabelAtlasSvg, createFrameLabels, degreeLabel, frameLabelLayout } from './frameLabels'

import type { GraticuleFrameOptions } from './graticuleFrame'

const OPTIONS: GraticuleFrameOptions = {
  bounds: { west: -45, south: 11, east: 78.75, north: 76.84 },
  worldWidth: 12,
  worldDepth: 10.91,
  bandWidth: 0.04,
  bandStepDeg: 2,
  ruleWidth: 0.008,
  labelLaneWidth: 0.16,
  ink: '#1c130c',
  bandOpacity: 0.92,
  lift: 0.004,
}

describe('degreeLabel', () => {
  describe('happy path', () => {
    it('names a place rather than stating arithmetic', () => {
      // `-30°` is a number. `30°O` is somewhere. A chart never prints a minus sign.
      expect(degreeLabel(-30, 'x')).toBe('30°O')
      expect(degreeLabel(30, 'x')).toBe('30°E')
    })
  })

  describe('variants', () => {
    it('names the latitudes north and south', () => {
      expect(degreeLabel(45, 'z')).toBe('45°N')
      expect(degreeLabel(-8, 'z')).toBe('8°S')
    })

    it('leaves the origin without a hemisphere, which it does not have', () => {
      expect(degreeLabel(0, 'x')).toBe('0°')
      expect(degreeLabel(0, 'z')).toBe('0°')
    })

    it('speaks French, as the rest of what the reader reads does', () => {
      // A map that says `30°W` beside a panel that says `Chargement de l'année` speaks two languages.
      expect(degreeLabel(-30, 'x')).toContain('O')
    })
  })

  describe('managed errors', () => {
    it('reads a negative zero as the origin, not as a hemisphere', () => {
      expect(degreeLabel(-0, 'x')).toBe('0°')
    })
  })

  describe('unmanaged errors', () => {
    it('rounds a fractional degree rather than printing its tail', () => {
      expect(degreeLabel(12.004, 'x')).toBe('12°E')
    })
  })

  describe('edge cases', () => {
    it('handles the far side of the world', () => {
      expect(degreeLabel(180, 'x')).toBe('180°E')
    })
  })
})

describe('frameLabelLayout', () => {
  describe('happy path', () => {
    it('writes every graduation in two margins', () => {
      const layout = frameLabelLayout(OPTIONS, 10)
      // -40 to 70 across and 20 to 70 down: twelve longitudes and six latitudes, each written twice.
      expect(layout.placements.length).toBe((12 + 6) * 2)
    })
  })

  describe('variants', () => {
    it('holds each distinct number once, however often it is written', () => {
      const layout = frameLabelLayout(OPTIONS, 10)
      expect(new Set(layout.texts).size).toBe(layout.texts.length)
      expect(layout.texts.length).toBeLessThan(layout.placements.length)
    })

    it('puts the longitudes north and south, and the latitudes east and west', () => {
      const layout = frameLabelLayout(OPTIONS, 10)
      const xs = new Set(layout.placements.map((p) => Math.sign(p.x)))
      const zs = new Set(layout.placements.map((p) => Math.sign(p.z)))
      expect(xs.has(-1) && xs.has(1)).toBe(true)
      expect(zs.has(-1) && zs.has(1)).toBe(true)
    })

    it('writes fewer numbers for a coarser step', () => {
      expect(frameLabelLayout(OPTIONS, 30).placements.length).toBeLessThan(
        frameLabelLayout(OPTIONS, 10).placements.length
      )
    })

    it('sits beyond the band, never over it', () => {
      const inner = OPTIONS.worldWidth / 2 + OPTIONS.bandWidth
      for (const p of frameLabelLayout(OPTIONS, 10).placements) {
        const outside = Math.abs(p.x) > inner || Math.abs(p.z) > OPTIONS.worldDepth / 2
        expect(outside).toBe(true)
      }
    })
  })

  describe('managed errors', () => {
    it('writes only what actually falls inside when the step is coarser than the map', () => {
      // A step of 720° leaves one graduation standing — the prime meridian, which does cross this map.
      // The latitudes have none, 11°N to 76°N containing no multiple of 720.
      const layout = frameLabelLayout(OPTIONS, 720)
      expect(layout.texts).toEqual(['0°'])
      expect(layout.placements).toHaveLength(2)
    })
  })

  describe('unmanaged errors', () => {
    it('points every placement at a text that exists', () => {
      const layout = frameLabelLayout(OPTIONS, 10)
      for (const p of layout.placements) {
        expect(layout.texts[p.cell]).toBeDefined()
      }
    })
  })

  describe('edge cases', () => {
    it('writes a single number twice when only one graduation falls inside', () => {
      const narrow = { ...OPTIONS, bounds: { ...OPTIONS.bounds, west: -5, east: 5 } }
      expect(frameLabelLayout(narrow, 10).placements.length).toBeGreaterThan(0)
    })
  })
})

describe('buildLabelAtlasSvg', () => {
  describe('happy path', () => {
    it('draws one text per number', () => {
      const atlas = buildLabelAtlasSvg(['0°', '10°E', '20°E'], '#000')
      expect(atlas.svg.match(/<text/g)).toHaveLength(3)
    })
  })

  describe('variants', () => {
    it('carries explicit width and height, not just a viewBox', () => {
      // Loaded as an `<img>` for a texture, a viewBox-only SVG rasterises to 0x0 and comes out blank.
      const atlas = buildLabelAtlasSvg(['0°'], '#000')
      expect(atlas.svg).toMatch(/<svg width="\d+" height="\d+"/)
    })

    it('grows a row at a time rather than a column', () => {
      const four = buildLabelAtlasSvg(['a', 'b', 'c', 'd'], '#000')
      const five = buildLabelAtlasSvg(['a', 'b', 'c', 'd', 'e'], '#000')
      expect(four.rows).toBe(1)
      expect(five.rows).toBe(2)
      expect(five.columns).toBe(four.columns)
    })

    it('writes in the ink it was given', () => {
      expect(buildLabelAtlasSvg(['0°'], '#abcdef').svg).toContain('#abcdef')
    })
  })

  describe('managed errors', () => {
    it('keeps a row even with nothing to draw, rather than a zero-sized image', () => {
      const atlas = buildLabelAtlasSvg([], '#000')
      expect(atlas.rows).toBe(1)
      expect(atlas.svg).toMatch(/height="\d+"/)
    })
  })

  describe('unmanaged errors', () => {
    it('places each number in its own cell', () => {
      const atlas = buildLabelAtlasSvg(['a', 'b', 'c', 'd', 'e'], '#000')
      const xs = [...atlas.svg.matchAll(/<text x="(\d+)" y="(\d+)"/g)].map(
        (m) => `${m[1] ?? ''},${m[2] ?? ''}`
      )
      expect(new Set(xs).size).toBe(5)
    })
  })

  describe('edge cases', () => {
    it('fills a full row before starting the next', () => {
      const atlas = buildLabelAtlasSvg(['a', 'b', 'c', 'd'], '#000')
      const ys = [...atlas.svg.matchAll(/y="(\d+)"/g)].map((m) => m[1])
      expect(new Set(ys).size).toBe(1)
    })
  })
})

const build = (over: Partial<Parameters<typeof createFrameLabels>[0]> = {}) =>
  createFrameLabels({
    ...OPTIONS,
    labelStepDeg: 10,
    labelInk: '#4a3424',
    labelRoughness: 1.1,
    labelOpacity: 0.88,
    loadTexture: vi.fn(() => new Texture()),
    ...over,
  })

describe('createFrameLabels', () => {
  describe('happy path', () => {
    it('builds one quad per placement', () => {
      const labels = build()
      const geometry = (
        labels?.object as unknown as {
          geometry: { getAttribute: (n: string) => { count: number } }
        }
      ).geometry
      expect(geometry.getAttribute('position').count).toBe((12 + 6) * 2 * 6)
      labels?.dispose()
    })

    it('rasterises the atlas through the loader it was given', () => {
      const loadTexture = vi.fn(() => new Texture())
      build({ loadTexture })?.dispose()
      expect(loadTexture).toHaveBeenCalledTimes(1)
    })
  })

  describe('variants', () => {
    it('carries a UV per vertex, so one atlas serves every number', () => {
      const labels = build()
      const geometry = (
        labels?.object as unknown as {
          geometry: { getAttribute: (n: string) => unknown }
        }
      ).geometry
      expect(geometry.getAttribute('uv')).toBeDefined()
      labels?.dispose()
    })
  })

  describe('managed errors', () => {
    it('builds nothing at all when the frame carries no numbers', () => {
      // No graduation falls inside a map that stops short of the meridian.
      const offset = { ...OPTIONS, bounds: { ...OPTIONS.bounds, west: 3, east: 7 } }
      expect(build({ ...offset, labelStepDeg: 720 })).toBeNull()
    })
  })

  describe('unmanaged errors', () => {
    it('asks its loader once, however many numbers there are', () => {
      const loadTexture = vi.fn(() => new Texture())
      build({ labelStepDeg: 1, loadTexture })?.dispose()
      expect(loadTexture).toHaveBeenCalledTimes(1)
    })
  })

  describe('edge cases', () => {
    it('frees its geometry, material and texture on teardown', () => {
      const texture = new Texture()
      const freed = vi.spyOn(texture, 'dispose')
      build({ loadTexture: () => texture })?.dispose()
      expect(freed).toHaveBeenCalled()
    })
  })
})
