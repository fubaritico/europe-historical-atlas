import { BoxGeometry } from 'three'
import { describe, expect, it, vi } from 'vitest'

import { EVENT_ICON_PALETTE } from '../palette'

import { buildIconModel, placedGeometry } from './iconModel'

import type { EventIconKind } from '../kinds'

const KINDS: EventIconKind[] = ['swords', 'tower', 'crown']

describe('buildIconModel', () => {
  describe('happy path', () => {
    it('fuses the swords into one piece per colour: steel, brass, leather', () => {
      expect(buildIconModel('swords').pieces.map(({ colour }) => colour)).toEqual([
        'steel',
        'brass',
        'leather',
      ])
    })
  })

  describe('variants', () => {
    it.each(KINDS)('keeps the %s one unit high on the origin once fused', (kind) => {
      const tops = buildIconModel(kind).pieces.map(({ geometry }) => {
        geometry.computeBoundingBox()
        return geometry.boundingBox
      })
      expect(Math.min(...tops.map((box) => box?.min.y ?? Number.NaN))).toBeCloseTo(0, 5)
      expect(Math.max(...tops.map((box) => box?.max.y ?? Number.NaN))).toBeCloseTo(1, 5)
    })

    it('bakes a placed part where it sits: the crown’s stones stand around the band, not at its axis', () => {
      const jewel = buildIconModel('crown').pieces.find(({ colour }) => colour === 'jewel')
      jewel?.geometry.computeBoundingBox()
      const box = jewel?.geometry.boundingBox
      if (!box) throw new Error('no jewel piece')
      // Five stones set in the band, all around: the piece spans the band's width, not a single stone's.
      expect(box.max.x - box.min.x).toBeGreaterThan(0.5)
    })

    it('paints each piece in the palette given', () => {
      const model = buildIconModel('crown', { ...EVENT_ICON_PALETTE, gold: '#00ff00' })
      const gold = model.pieces.find(({ colour }) => colour === 'gold')
      expect(gold?.material.color.getHexString()).toBe('00ff00')
    })

    it('fades every piece together', () => {
      const model = buildIconModel('swords')
      model.setOpacity(0.25)
      for (const { material } of model.pieces) expect(material.opacity).toBe(0.25)
    })
  })

  describe('placedGeometry', () => {
    it('turns a part about its own origin, then moves it to its place — as a mesh at `at`, turned by `turn`', () => {
      // A box long on X, placed at x = 1 and turned a quarter: it must end centred at x = 1, long on Z. Moved first
      // and turned after, it would swing round the origin to z = -1 instead.
      const geometry = placedGeometry({
        geometry: new BoxGeometry(0.4, 0.1, 0.1),
        colour: 'stone',
        at: [1, 0, 0],
        turn: Math.PI / 2,
      })
      geometry.computeBoundingBox()
      const box = geometry.boundingBox
      if (box === null) throw new Error('no box')
      expect((box.min.x + box.max.x) / 2).toBeCloseTo(1)
      expect((box.min.z + box.max.z) / 2).toBeCloseTo(0)
      expect(box.max.z - box.min.z).toBeCloseTo(0.4)
    })

    it('leaves a part with no place and no turn where it was built', () => {
      const geometry = placedGeometry({ geometry: new BoxGeometry(1, 1, 1), colour: 'stone' })
      geometry.computeBoundingBox()
      expect(geometry.boundingBox?.min.toArray()).toEqual([-0.5, -0.5, -0.5])
    })
  })

  // L3: N/A — a colour whose parts cannot be fused throws, but the parts as built always fuse (every one is made
  //     non-indexed with the same attributes); the throw guards a part added wrong, not an input
  // L4: N/A — no async work, nothing external

  describe('edge cases', () => {
    it('frees every piece once on dispose', () => {
      const model = buildIconModel('tower')
      const spies = model.pieces.flatMap(({ geometry, material }) => [
        vi.spyOn(geometry, 'dispose'),
        vi.spyOn(material, 'dispose'),
      ])
      model.dispose()
      for (const spy of spies) expect(spy).toHaveBeenCalledTimes(1)
    })
  })
})
