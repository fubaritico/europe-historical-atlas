/**
 * The battle icon: two swords crossed at right angles, points up (ATLAS-156, set on sight by the dev, 2026-10-26).
 * Its flat drawing, for afar, is in `../flat/eventIconSvg`.
 */

import { BoxGeometry, CylinderGeometry, ExtrudeGeometry, OctahedronGeometry, Shape } from 'three'

import type { Part } from './parts'

/** How far each of the crossed swords leans from upright: 45°, so the two stand at right angles (the dev). */
const SWORD_LEAN = Math.PI / 4

/**
 * How far apart the two swords stand, front to back: one passes in front of the other rather than through it (the
 * dev) — a blade is 0.07 thick with its bevel, so the gap clears it.
 */
const SWORD_GAP = 0.08

/** A sword's length, from the foot of its pommel (−0.01) to its point (1.265). */
const SWORD_LENGTH = 1.275

/**
 * Where on a sword the two cross, from its pommel: halfway along it, so that seen from the front the crossed pair fits
 * in a square (the dev) — each sword reaches as far up as down and as far left as right. The guards stay 0.15 apart.
 */
const SWORD_CROSSING = SWORD_LENGTH / 2 - 0.01

/**
 * One sword, point up, its pommel at the origin — every part placed in its geometry, so the whole sword turns as
 * one: an extruded blade with a bevel for its ridge, a guard, a grip, a pommel.
 * @returns its parts
 */
function oneSword(): Part[] {
  // The blade's outline, seen flat: a long rectangle ending in a point.
  const blade = new Shape()
  blade.moveTo(-0.075, 0)
  blade.lineTo(0.075, 0)
  blade.lineTo(0.075, 0.74)
  blade.lineTo(0, 0.9)
  blade.lineTo(-0.075, 0.74)
  blade.closePath()

  // Given a thickness; the bevel raises a ridge along the blade, which catches the light.
  const bladeGeometry = new ExtrudeGeometry(blade, {
    depth: 0.03,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.015,
    bevelSegments: 1,
  })
  // Set above the hilt, and centred front to back.
  bladeGeometry.translate(0, 0.365, -0.015)

  // From the point down: the blade, the guard across it, the grip, the pommel at the foot.
  return [
    { geometry: bladeGeometry, colour: 'steel' },
    { geometry: new BoxGeometry(0.4, 0.07, 0.1).translate(0, 0.33, 0), colour: 'brass' },
    {
      geometry: new CylinderGeometry(0.04, 0.04, 0.2, 6).translate(0, 0.2, 0),
      colour: 'leather',
    },
    { geometry: new OctahedronGeometry(0.07).translate(0, 0.06, 0), colour: 'brass' },
  ]
}

/**
 * Two swords crossed at right angles, points up: each turned about its crossing point, one each way, the hilts
 * apart below, one in front of the other.
 * @returns their parts
 */
export function swordParts(): Part[] {
  // Two swords, one leaning right and one left; every part of a sword goes through the same three moves.
  return [SWORD_LEAN, -SWORD_LEAN].flatMap((lean, index) =>
    oneSword().map((part) => ({
      ...part,
      geometry: part.geometry
        // 1. The crossing point brought to the origin, so the sword turns about it.
        .translate(0, -SWORD_CROSSING, 0)
        // 2. Leaned to its side.
        .rotateZ(lean)
        // 3. The first sword set in front, the second behind, so the blades pass and never meet.
        .translate(0, 0, index === 0 ? SWORD_GAP / 2 : -SWORD_GAP / 2),
    }))
  )
}
