import { BoxGeometry, Matrix4, Vector3 } from 'three'
import { describe, expect, it, vi } from 'vitest'

import { EVENT_ICON_PALETTE } from '../palette'

import { buildIconModel, buildModel, placedGeometry } from './iconModel'

import type { EventIconKind } from '../kinds'

const KINDS: EventIconKind[] = ['swords', 'tower', 'crown']

/**
 * A small box, for a part of a model built from literals.
 * @returns its geometry
 */
function box(): BoxGeometry {
  return new BoxGeometry(0.1, 0.1, 0.1)
}

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
      // A moving piece is built about its own origin: placed as its motion has it at rest, it stands where the
      // model has it — the stone is nowhere at rest, so it is left out.
      const model = buildIconModel(kind)
      const tops = model.pieces
        .filter(({ motion }) => motion !== 'stone')
        .map(({ geometry, motion }) => {
          geometry.computeBoundingBox()
          const box = geometry.boundingBox?.clone()
          return motion === null ? box : box?.applyMatrix4(model.placeAt(motion, 0, new Matrix4()))
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

    it('keeps the siege’s moving parts apart by motion, places them by it, and leaves a still kind unmoved', () => {
      const siege = buildIconModel('tower')
      const moving = siege.pieces
        .filter(({ motion }) => motion !== null)
        .map(({ motion }) => motion)
      expect(new Set(moving)).toEqual(new Set(['arm', 'ropes', 'sling', 'stone']))
      // At the end of the throw, the arm is turned about the axle; at rest it is not.
      const arm = siege.placeAt('arm', 3.1, new Matrix4()).setPosition(0, 0, 0)
      expect(new Vector3(1, 0, 0).applyMatrix4(arm).angleTo(new Vector3(1, 0, 0))).toBeGreaterThan(
        1
      )
      expect(buildIconModel('swords').pieces.every(({ motion }) => motion === null)).toBe(true)
    })

    it('keeps parts of one colour apart by motion, and fuses those under the same motion', () => {
      const model = buildModel(
        'test',
        [
          { geometry: box(), colour: 'wood' },
          { geometry: box(), colour: 'wood', at: [0, 1, 0], moves: 'a' },
          { geometry: box(), colour: 'wood', at: [0, 1, 0], moves: 'b' },
          { geometry: box(), colour: 'wood', at: [0, 1, 0], moves: 'b' },
        ],
        {
          a: { place: (_seconds, into) => into.identity() },
          b: { place: (_seconds, into) => into.identity() },
        },
        EVENT_ICON_PALETTE
      )
      expect(model.pieces.map(({ motion }) => motion)).toEqual([null, 'a', 'b'])
    })

    it('carries a placement from the build units to the model’s: lifted off the floor, scaled with the parts', () => {
      // Two units high, its floor at 1: the model's scale is a half, its floor zero.
      const model = buildModel(
        'test',
        [
          { geometry: new BoxGeometry(0.1, 2, 0.1).translate(0, 2, 0), colour: 'wood' },
          { geometry: box(), colour: 'wood', at: [0, 2, 0], moves: 'm' },
        ],
        { m: { place: (_seconds, into) => into.makeTranslation(4, 3, 2) } },
        EVENT_ICON_PALETTE
      )
      const placed = new Vector3().setFromMatrixPosition(model.placeAt('m', 0, new Matrix4()))
      expect(placed.toArray()).toEqual([2, 1, 1])
    })

    it('fades a piece whose motion fades, on top of the model’s own opacity, and leaves the others', () => {
      const model = buildModel(
        'test',
        [
          { geometry: box(), colour: 'wood' },
          { geometry: box(), colour: 'wood', at: [0, 0, 0], moves: 'm' },
        ],
        { m: { place: (_seconds, into) => into.identity(), fade: (seconds) => seconds / 10 } },
        EVENT_ICON_PALETTE
      )
      model.setOpacity(0.5)
      model.fadeAt(4)
      expect(model.pieces.map(({ material }) => material.opacity)).toEqual([0.5, 0.2])
    })

    it('keeps a fading piece faded when the model’s opacity changes after it, at the last moment it was given', () => {
      const model = buildModel(
        'test',
        [
          { geometry: box(), colour: 'wood' },
          { geometry: box(), colour: 'wood', at: [0, 0, 0], moves: 'm' },
        ],
        { m: { place: (_seconds, into) => into.identity(), fade: (seconds) => seconds / 10 } },
        EVENT_ICON_PALETTE
      )
      model.fadeAt(4)
      // The cross-fade comes after the frame's fade: the stone stays at its fade, on top of the new opacity.
      model.setOpacity(0.5)
      expect(model.pieces.map(({ material }) => material.opacity)).toEqual([0.5, 0.2])
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

  describe('managed errors', () => {
    it('refuses a part that names a motion the model does not have', () => {
      expect(() =>
        buildModel(
          'test',
          [{ geometry: box(), colour: 'wood', at: [0, 1, 0], moves: 'nowhere' }],
          { m: { place: (_seconds, into) => into.identity() } },
          EVENT_ICON_PALETTE
        )
      ).toThrow(/nowhere parts have no such motion/)
    })

    it('refuses to place a motion the model does not have', () => {
      expect(() => buildIconModel('swords').placeAt('arm', 0, new Matrix4())).toThrow(
        /no arm motion/
      )
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

    it('leaves a moving part about its own origin: its motion places it, not its rest position', () => {
      const geometry = placedGeometry({
        geometry: new BoxGeometry(1, 1, 1),
        colour: 'stone',
        at: [5, 5, 5],
        moves: 'm',
      })
      geometry.computeBoundingBox()
      expect(geometry.boundingBox?.min.toArray()).toEqual([-0.5, -0.5, -0.5])
    })
  })

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
