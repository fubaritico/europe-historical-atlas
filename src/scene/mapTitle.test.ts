import { Texture } from 'three'
import { describe, expect, it, vi } from 'vitest'

import { ATLAS_SUBJECT, ATLAS_TITLE, MAP_TYPEFACE } from '../utils/lettering'

import { MAP_TITLE, buildMapTitleSvg, createMapTitle } from './mapTitle'

import type { MapTitleOptions } from './mapTitle'

/**
 * The canvas width the markup declares, read back rather than restated.
 * @param svg - the markup
 * @returns the width in canvas pixels
 */
function canvasWidth(svg: string): number {
  return Number(/<svg width="(\d+)"/.exec(svg)?.[1])
}

const OPTIONS: MapTitleOptions = {
  text: MAP_TITLE,
  size: 0.34,
  z: 5.98,
  lift: 0.0045,
  ink: '#4a3424',
  opacity: 0.9,
  roughness: 1.4,
  loadTexture: () => new Texture(),
}

interface Wired {
  geometry: {
    getAttribute: (name: string) => { array: Float32Array } | undefined
    dispose: () => void
  }
  material: { opacity: number; transparent: boolean; map: Texture | null; dispose: () => void }
}

describe('buildMapTitleSvg', () => {
  describe('happy path', () => {
    it('letters the name the way the splash does', () => {
      // The whole point of the request: the map's title and the loading screen's must be the same
      // lettering, lambdas included. A different face would make them two different things.
      expect(buildMapTitleSvg('Historical atlas', '#4a3424', 0)).toContain('HISTORICΛL ΛTLΛS')
    })

    it('sets it in the shared face, the one the splash uses', () => {
      // Pinned to the constant rather than to a font name: `ui/splash` asserts the same thing against
      // the same constant, which is what keeps the two screens from drifting apart.
      expect(buildMapTitleSvg(MAP_TITLE, '#000000', 0)).toContain(`font-family="${MAP_TYPEFACE}"`)
    })

    it('sets the width and the height, not only a viewBox', () => {
      // A viewBox-only SVG loaded as an `<img>` rasterises to 0x0 and the title is silently blank.
      const svg = buildMapTitleSvg(MAP_TITLE, '#000000', 0)
      expect(svg).toMatch(/<svg width="\d+" height="\d+"/)
    })
  })

  describe('variants', () => {
    it('leaves the outlines clean when no roughness is asked for', () => {
      expect(buildMapTitleSvg(MAP_TITLE, '#000000', 0)).not.toContain('feTurbulence')
    })

    it('eats the outlines when roughness is asked for', () => {
      const svg = buildMapTitleSvg(MAP_TITLE, '#000000', 2)
      expect(svg).toContain('feDisplacementMap')
      expect(svg).toContain('scale="2"')
    })

    it('writes in the ink it is given', () => {
      expect(buildMapTitleSvg(MAP_TITLE, '#4a3424', 0)).toContain('fill="#4a3424"')
    })
  })

  describe('managed errors', () => {
    it('sets no name when there is no name, rather than inventing one', () => {
      // No fallback title: an empty name comes out as an empty title, which is visible and reportable.
      const svg = buildMapTitleSvg('', '#000000', 0)
      expect(svg).toContain('</text>')
      expect(svg).toContain('><text')
    })
  })

  // L4 (unmanaged errors): N/A — it concatenates a string and calls nothing that can fail.

  describe('edge cases', () => {
    it('pulls the anchor back by half the tracking, so the block sits on centre', () => {
      // Letter-spacing adds a gap after the LAST letter too, so text anchored at the middle sits half a
      // gap left of where it looks like it should, and the anchor moves to answer it. The splash has no
      // such correction to make: a `space-between` row has no trailing gap in the first place.
      const svg = buildMapTitleSvg(MAP_TITLE, '#000000', 0)
      const x = Number(/<text x="([\d.]+)"/.exec(svg)?.[1])
      const tracking = Number(/letter-spacing="(\d+)"/.exec(svg)?.[1])
      expect(x).toBeCloseTo(canvasWidth(svg) / 2 - tracking / 2, 0)
    })

    it('leaves room for the lettering it sets', () => {
      // Tracked capitals advance about (0.62 + 0.42) x fontSize each. Read off the canvas rather than
      // written down here: a title that grows must widen the canvas, and a test holding its own copy of
      // the old width would pass while the name ran off both ends.
      const svg = buildMapTitleSvg(MAP_TITLE, '#000000', 0)
      const fontSize = Number(/font-size="(\d+)"/.exec(svg)?.[1])
      expect(MAP_TITLE.length * 1.04 * fontSize).toBeLessThan(canvasWidth(svg))
    })

    it('holds the subject and the atlas on one line', () => {
      const svg = buildMapTitleSvg(MAP_TITLE, '#000000', 0)
      expect(svg.match(/<text /g)).toHaveLength(1)
      expect(svg).toContain('EUROPE HISTORICΛL ΛTLΛS')
    })

    it('runs together the two halves the splash stacks', () => {
      // One source for the name. Two literals agreeing today is the shape that gave this codebase
      // fills and borders with separate ideas of where a country ended.
      expect(MAP_TITLE).toBe(`${ATLAS_SUBJECT} ${ATLAS_TITLE}`)
    })
  })
})

/**
 * The vertex positions of a built title.
 * @param title - the title
 * @returns its position attribute, flattened
 */
function positions(title: ReturnType<typeof createMapTitle>): Float32Array {
  return (
    (title.object as unknown as Wired).geometry.getAttribute('position')?.array ??
    new Float32Array()
  )
}

/**
 * One component of a position attribute.
 * @param a - the flattened positions
 * @param i - the index
 * @returns the value, zero past the end
 */
function at(a: Float32Array, i: number): number {
  return a[i] ?? 0
}

describe('createMapTitle', () => {
  describe('happy path', () => {
    it('lays a quad on centre, at the depth it is given', () => {
      const p = positions(createMapTitle(OPTIONS))
      expect(p).toHaveLength(18)
      const xs = [...p].filter((_, i) => i % 3 === 0)
      // Centred on the map's own axis, so the name reads under the middle of the sheet.
      expect(Math.min(...xs)).toBeCloseTo(-Math.max(...xs), 6)
      const zs = [...p].filter((_, i) => i % 3 === 2)
      expect((Math.min(...zs) + Math.max(...zs)) / 2).toBeCloseTo(OPTIONS.z, 6)
    })

    it('faces up, so a front-facing material draws it', () => {
      // The frame was invisible for exactly this reason: hand-wound triangles taken the other way round
      // point their normal at the ground and nothing is drawn, with nothing in the scene saying so.
      const a = positions(createMapTitle(OPTIONS))
      for (const base of [0, 9]) {
        const bx = at(a, base + 3) - at(a, base)
        const bz = at(a, base + 5) - at(a, base + 2)
        const cx = at(a, base + 6) - at(a, base)
        const cz = at(a, base + 8) - at(a, base + 2)
        expect(bz * cx - bx * cz).toBeGreaterThan(0)
      }
    })

    it('sits at the lift it is given, clear of the sheet under it', () => {
      const ys = [...positions(createMapTitle(OPTIONS))].filter((_, i) => i % 3 === 1)
      // Float32, hence a tolerance: the attribute stores what the GPU will read, not what was asked.
      expect(ys.every((y) => Math.abs(y - OPTIONS.lift) < 1e-6)).toBe(true)
    })
  })

  describe('variants', () => {
    it('keeps the lettering unstretched, whatever height is asked for', () => {
      const extent = (size: number): { w: number; h: number } => {
        const p = positions(createMapTitle({ ...OPTIONS, size }))
        const xs = [...p].filter((_, i) => i % 3 === 0)
        const zs = [...p].filter((_, i) => i % 3 === 2)
        return { w: Math.max(...xs) - Math.min(...xs), h: Math.max(...zs) - Math.min(...zs) }
      }
      const small = extent(0.2)
      const large = extent(0.8)
      expect(small.w / small.h).toBeCloseTo(large.w / large.h, 4)
    })

    it('carries the opacity it is given onto a transparent material', () => {
      const material = (createMapTitle({ ...OPTIONS, opacity: 0.4 }).object as unknown as Wired)
        .material
      expect(material.transparent).toBe(true)
      expect(material.opacity).toBeCloseTo(0.4, 6)
    })

    it('rasterises through the loader it is handed, not one of its own', () => {
      const loadTexture = vi.fn((svg: string) => {
        expect(svg).toContain('HISTORICΛL ΛTLΛS')
        return new Texture()
      })
      createMapTitle({ ...OPTIONS, loadTexture })
      expect(loadTexture).toHaveBeenCalledTimes(1)
    })
  })

  // L3 (managed errors): N/A — it builds a quad and hands a string to an injected loader.
  // L4 (unmanaged errors): N/A — nothing here awaits or catches; a loader that throws propagates.

  describe('edge cases', () => {
    it('frees its geometry, its material and its texture on teardown', () => {
      const texture = new Texture()
      const title = createMapTitle({ ...OPTIONS, loadTexture: () => texture })
      const wired = title.object as unknown as Wired
      const geometry = vi.spyOn(wired.geometry, 'dispose')
      const material = vi.spyOn(wired.material, 'dispose')
      const map = vi.spyOn(texture, 'dispose')
      title.dispose()
      expect(geometry).toHaveBeenCalledTimes(1)
      expect(material).toHaveBeenCalledTimes(1)
      // The texture is not the material's to free: `Material.dispose` leaves `map` alone.
      expect(map).toHaveBeenCalledTimes(1)
    })

    it('builds a degenerate quad rather than throwing at zero size', () => {
      const p = (
        createMapTitle({ ...OPTIONS, size: 0 }).object as unknown as Wired
      ).geometry.getAttribute('position')?.array
      expect(p).toHaveLength(18)
      expect([...(p ?? [])].filter((_, i) => i % 3 === 0).every((x) => x === 0)).toBe(true)
    })
  })
})
