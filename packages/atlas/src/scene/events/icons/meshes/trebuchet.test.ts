import { Matrix4, Vector3 } from 'three'
import { describe, expect, it } from 'vitest'

import {
  AXLE_HEIGHT,
  TREBUCHET_MOTIONS,
  armTurn,
  slingAngle,
  stoneAt,
  trebuchetParts,
} from './trebuchet'

/** The cycle's moments, in seconds since it began: rest 1.2, load 1.3, hold 0.3, throw 0.35, settle 0.9. */
const AT = { loaded: 2.45, held: 2.7, release: 2.8 + 0.1575, thrown: 3.15, settled: 4.05 }

/**
 * Where a motion places its piece's origin at a moment.
 * @param motion - the motion's name
 * @param seconds - the moment
 * @returns the position
 */
function placed(motion: string, seconds: number): Vector3 {
  const move = TREBUCHET_MOTIONS[motion]
  if (move === undefined) throw new Error(`no ${motion}`)
  return new Vector3().setFromMatrixPosition(move.place(seconds, new Matrix4()))
}

describe('the throw', () => {
  describe('happy path', () => {
    it('rests with the arm still, then hauls it down to load, holds, whips it past the top, and settles back', () => {
      expect(armTurn(0)).toBe(0)
      expect(armTurn(AT.loaded)).toBeGreaterThan(1)
      expect(armTurn(AT.held)).toBeCloseTo(armTurn(AT.loaded), 1)
      // Thrown toward the east: the arm turns clockwise seen from the south, past the vertical.
      expect(armTurn(AT.thrown)).toBeLessThan(-1)
      expect(armTurn(AT.settled)).toBeCloseTo(0)
    })

    it('hangs the sling straight down, but sweeps it a full turn round the tip during the throw', () => {
      expect(slingAngle(0)).toBeCloseTo(-Math.PI / 2)
      expect(slingAngle(AT.held)).toBeCloseTo(-Math.PI / 2)
      // Mid-throw, swept half a turn: pointing up, over the tip.
      expect(slingAngle(2.8 + 0.175)).toBeCloseTo(Math.PI / 2 - 2 * Math.PI)
      expect(slingAngle(AT.thrown)).toBeCloseTo(-Math.PI / 2 - 2 * Math.PI)
      expect(slingAngle(AT.settled)).toBeCloseTo(-Math.PI / 2)
    })

    it('shows the stone in the pouch once loaded, throws it east nearly straight at the release, fading away', () => {
      expect(stoneAt(0)).toBeNull()
      expect(stoneAt(AT.loaded)).toBeNull()
      const held = stoneAt(AT.held)
      expect(held).not.toBeNull()
      // In the pouch, whole, near the ground to the west, where the hauled-down arm left it.
      expect(held?.[0]).toBeLessThan(-0.8)
      expect(held?.[1]).toBeLessThan(0.15)
      expect(held?.[2]).toBe(1)
      // In flight: far east fast, bent down only a little, and fainter as it goes.
      const [early, later] = [stoneAt(AT.release + 0.1), stoneAt(AT.release + 0.5)]
      if (early === null || later === null) throw new Error('no stone in flight')
      const [east, drop] = [later[0] - early[0], early[1] - later[1]]
      expect(east).toBeGreaterThan(1)
      expect(drop).toBeGreaterThan(0)
      expect(drop).toBeLessThan(east / 4)
      expect(later[2]).toBeLessThan(early[2])
      expect(later[2]).toBeGreaterThan(0)
      // Gone before a second is out.
      expect(stoneAt(AT.release + 0.85)).toBeNull()
    })
  })

  describe('variants', () => {
    it('whips up faster than it was hauled down', () => {
      // A tenth of a second into each move: the throw has covered far more of the way than the haul.
      const hauled = armTurn(1.2 + 0.1) / armTurn(AT.loaded)
      const thrown =
        (armTurn(2.8 + 0.1) - armTurn(AT.loaded)) / (armTurn(AT.thrown) - armTurn(AT.loaded))
      expect(hauled).toBeLessThan(0.1)
      expect(thrown).toBeGreaterThan(0.4)
    })

    it('places the arm at the axle, turned; the ropes upright at the head; the sling at the tip; the stone nowhere at rest', () => {
      expect(placed('arm', 0).toArray()).toEqual([0, AXLE_HEIGHT, 0])
      // The head stands east of the axle and below it, the arm's long end up to the west.
      const head = placed('ropes', 0)
      expect(head.x).toBeGreaterThan(0)
      expect(head.y).toBeLessThan(AXLE_HEIGHT)
      // The ropes never turn: their placement is a translation.
      const ropes = TREBUCHET_MOTIONS.ropes?.place(AT.thrown, new Matrix4())
      expect(ropes?.elements[0]).toBe(1)
      expect(ropes?.elements[5]).toBe(1)
      const tip = placed('sling', 0)
      expect(tip.x).toBeLessThan(0)
      expect(tip.y).toBeGreaterThan(AXLE_HEIGHT)
      // Hidden: scaled to nothing and faded out; in flight, at its own size, fading.
      expect(TREBUCHET_MOTIONS.stone?.place(0, new Matrix4()).elements[0]).toBe(0)
      expect(TREBUCHET_MOTIONS.stone?.fade?.(0)).toBe(0)
      expect(TREBUCHET_MOTIONS.stone?.place(AT.release + 0.4, new Matrix4()).elements[0]).toBe(1)
      const fading = TREBUCHET_MOTIONS.stone?.fade?.(AT.release + 0.4)
      expect(fading).toBeGreaterThan(0)
      expect(fading).toBeLessThan(1)
    })

    it('repeats, cycle after cycle, and takes a time before the map started as the same cycle', () => {
      expect(armTurn(4.05 + AT.thrown)).toBeCloseTo(armTurn(AT.thrown))
      expect(armTurn(-4.05 + AT.thrown)).toBeCloseTo(armTurn(AT.thrown))
    })
  })

  // L3: N/A — nothing is refused
  // L4: N/A — no async work, nothing external

  describe('edge cases', () => {
    it('never turns the arm past the throw nor below the load', () => {
      for (let t = 0; t < 4.05; t += 0.01) {
        expect(armTurn(t)).toBeGreaterThanOrEqual(armTurn(AT.thrown) - 1e-9)
        expect(armTurn(t)).toBeLessThanOrEqual(armTurn(AT.held) + 1e-9)
      }
    })

    it('keeps the loaded pouch above the ground', () => {
      const held = stoneAt(AT.held)
      expect(held?.[1]).toBeGreaterThan(0)
    })
  })
})

describe('trebuchetParts', () => {
  it('stands the frame still and moves the arm, the ropes, the sling and the stone, each by a motion the model has', () => {
    const parts = trebuchetParts()
    const motions = new Set(parts.map(({ moves }) => moves).filter((m) => m !== undefined))
    expect([...motions].sort()).toEqual(['arm', 'ropes', 'sling', 'stone'])
    for (const motion of motions) expect(TREBUCHET_MOTIONS[motion]).toBeDefined()
    expect(parts.filter(({ moves }) => moves === undefined).length).toBeGreaterThan(0)
    // The frame first, so a kind's first piece is one that stands still.
    expect(parts[0]?.moves).toBeUndefined()
  })
})
