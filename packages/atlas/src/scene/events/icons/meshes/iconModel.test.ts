import { BoxGeometry, Matrix4, Vector3 } from 'three'
import { describe, expect, it, vi } from 'vitest'

import { EVENT_ICON_PALETTE } from '../palette'
import { ICON_SIZE } from '../settings'

import { buildIconModel, buildModel, placedGeometry } from './iconModel'
import { fitInBox } from './parts'

import type { EventIconKind } from '../kinds'

/**
 * How tall each kind's model stood on the map, in icon heights, the day before every model was fitted in one box
 * (measured 2026-11-17, ATLAS-469): the sizes the dev set on sight, which the change was not to move.
 */
const TALLS_SET_ON_SIGHT: [EventIconKind, number][] = [
  ['swords', 0.6375],
  ['tower', 1.05],
  ['crown', 0.231],
  ['cathedral', 0.6],
  ['tomb', 0.45],
]

/**
 * The box around a model's pieces, each moving one where its motion has it at rest — the stone, nowhere at rest,
 * left out.
 * @param kind - which model
 * @returns the lowest and highest point, and the widest side on the ground
 */
function boxOfModel(kind: EventIconKind): { floor: number; top: number; wide: number } {
  const model = buildIconModel(kind)
  const boxes = model.pieces
    .filter(({ motion }) => motion !== 'stone')
    .map(({ geometry, motion }) => {
      geometry.computeBoundingBox()
      const own = geometry.boundingBox?.clone()
      if (!own) throw new Error('no box')
      return motion === null ? own : own.applyMatrix4(model.placeAt(motion, 0, new Matrix4()))
    })
  const span = (axis: 'x' | 'y' | 'z'): [number, number] => [
    Math.min(...boxes.map((own) => own.min[axis])),
    Math.max(...boxes.map((own) => own.max[axis])),
  ]
  const [x, y, z] = [span('x'), span('y'), span('z')]
  return { floor: y[0], top: y[1], wide: Math.max(x[1] - x[0], z[1] - z[0]) }
}

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
    it.each(TALLS_SET_ON_SIGHT)(
      'stands the %s on the origin, its longest side filling the box of its kind’s size',
      (kind) => {
        const { floor, top, wide } = boxOfModel(kind)
        expect(floor).toBeCloseTo(0, 5)
        // The siege's box also holds its sling and its stone laid out where they rest before the throw, which the
        // motion then places elsewhere: what shows of it stays within its box, without filling it.
        if (kind === 'tower') {
          expect(Math.max(top, wide)).toBeLessThan(ICON_SIZE[kind] / 100)
          // Its box, the resting parts counted, is filled all the same: the model says so itself.
          const { reach } = buildIconModel(kind)
          expect(Math.max(reach.tall, reach.wide)).toBeCloseTo(ICON_SIZE[kind] / 100, 5)
        } else expect(Math.max(top, wide)).toBeCloseTo(ICON_SIZE[kind] / 100, 3)
      }
    )

    it.each(TALLS_SET_ON_SIGHT)(
      'keeps the %s as tall on the map as it was set on sight, %d of an icon’s height, to half a percent',
      (kind, tall) => {
        // The day of the change nothing was to move on screen: half a percent is under a pixel of any icon.
        expect(boxOfModel(kind).top / tall).toBeGreaterThan(0.995)
        expect(boxOfModel(kind).top / tall).toBeLessThan(1.005)
      }
    )

    it.each(TALLS_SET_ON_SIGHT)(
      'says how far the %s reaches: its real height, its real width',
      (kind) => {
        const { top, wide } = boxOfModel(kind)
        const { reach } = buildIconModel(kind)
        expect(reach.tall).toBeCloseTo(top, 2)
        // The siege's moving parts are counted where they rest, wider than its motion shows them.
        if (kind === 'tower') expect(reach.wide).toBeGreaterThan(wide)
        else expect(reach.wide).toBeCloseTo(wide, 3)
      }
    )

    it('says a low crown stands well under its box: what stands about it reads that, not its size', () => {
      expect(buildIconModel('crown').reach.tall).toBeLessThan((ICON_SIZE.crown / 100) * 0.5)
    })

    it('brings a low and wide model to the width of a tall one, with no factor of its own', () => {
      // The dev, 2026-11-17, of the low open crown: fitted one unit high it came out 2.8 wide, twice any other icon.
      const low = buildModel(
        'low',
        [{ geometry: new BoxGeometry(2.8, 1, 2.8).translate(0, 0.5, 0), colour: 'gold' }],
        undefined,
        EVENT_ICON_PALETTE
      )
      const tall = buildModel(
        'tall',
        [{ geometry: new BoxGeometry(1, 1, 1).translate(0, 0.5, 0), colour: 'gold' }],
        undefined,
        EVENT_ICON_PALETTE
      )
      expect(low.reach.wide).toBeCloseTo(tall.reach.wide)
      expect(low.reach.wide).toBeCloseTo(1)
      expect(low.reach.tall).toBeCloseTo(1 / 2.8)
    })

    it('writes the size given into the model’s own points', () => {
      const model = buildModel(
        'sized',
        [{ geometry: new BoxGeometry(1, 2, 1).translate(0, 1, 0), colour: 'gold' }],
        undefined,
        EVENT_ICON_PALETTE,
        0.6
      )
      model.pieces[0]?.geometry.computeBoundingBox()
      expect(model.pieces[0]?.geometry.boundingBox?.max.y).toBeCloseTo(0.6)
      expect(model.reach.tall).toBeCloseTo(0.6)
      expect(model.reach.wide).toBeCloseTo(0.3)
    })

    it('bakes a placed part where it sits: the crown’s stones stand around the band, not at its axis', () => {
      const jewel = buildIconModel('crown').pieces.find(({ colour }) => colour === 'jewel')
      jewel?.geometry.computeBoundingBox()
      const box = jewel?.geometry.boundingBox
      if (!box) throw new Error('no jewel piece')
      // Four red stones set in the band, one in two of the eight, all around: the piece spans the band's width, not a
      // single stone's.
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

  describe('fitInBox', () => {
    it('measures a turned part as it is turned: a long beam turned a quarter is long the other way', () => {
      // Long on X and thin on Z as built, placed far along Z: its width on the ground is what the turn makes it.
      const { reach } = fitInBox([
        { geometry: new BoxGeometry(4, 1, 0.2), colour: 'wood', turn: Math.PI / 2 },
        { geometry: new BoxGeometry(0.2, 1, 0.2), colour: 'wood', at: [0, 0, 3] },
      ])
      // From z = -2 (the beam's end) to z = 3.1 (the post's far side): 5.1 long, the box's side.
      expect(reach.wide).toBeCloseTo(1)
      expect(reach.tall).toBeCloseTo(1 / 5.1)
    })

    it('counts a moving part where it stands at rest', () => {
      const { reach } = fitInBox([
        { geometry: new BoxGeometry(1, 1, 1), colour: 'wood' },
        { geometry: new BoxGeometry(1, 1, 1), colour: 'wood', at: [0, 3, 0], moves: 'm' },
      ])
      // From -0.5 to 3.5: four high, one wide.
      expect(reach.tall).toBeCloseTo(1)
      expect(reach.wide).toBeCloseTo(0.25)
    })

    it('refuses parts with no extent: nothing to fit', () => {
      expect(() => fitInBox([])).toThrow(/no extent/)
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
