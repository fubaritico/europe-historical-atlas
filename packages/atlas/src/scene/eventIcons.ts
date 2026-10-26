import {
  Box3,
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  ExtrudeGeometry,
  Group,
  HemisphereLight,
  LatheGeometry,
  Mesh,
  MeshStandardMaterial,
  OctahedronGeometry,
  Shape,
  Vector2,
  Vector3,
} from 'three'

import type { EventIcon as ContentEventIcon } from '@europe-historical-atlas/core/data/contentFormat'
import type { BufferGeometry } from 'three'

/** The shapes this module builds: every icon of the content format but the pin, which `eventMarkers` draws. */
export type EventIconKind = Exclude<ContentEventIcon, 'pin'>

/** The colours of the icons, as CSS colours. */
export interface EventIconPalette {
  /** A sword's blade. */
  steel: string
  /** A sword's guard and pommel. */
  brass: string
  /** A sword's grip. */
  leather: string
  /** A tower's walls. */
  stone: string
  /** A tower's door. */
  door: string
  /** A crown. */
  gold: string
  /** A crown's stones. */
  jewel: string
}

/** The default colours — metals and stone that read on the parchment. */
export const EVENT_ICON_PALETTE: EventIconPalette = {
  steel: '#c9ccd1',
  brass: '#b08d3c',
  leather: '#4a2c1d',
  stone: '#cbb894',
  door: '#3b2a1e',
  gold: '#d4a53a',
  jewel: '#9b1c1c',
}

/** One icon: a group one unit high, standing on its base at the origin. */
export interface EventIcon {
  /** The meshes, to add to a scene and scale to the map. */
  readonly object: Group
  /**
   * Fade the icon, for its cross-fade with its flat drawing.
   * @param opacity - 0 gone, 1 solid
   * @returns nothing
   */
  setOpacity(opacity: number): void
  /** Free its geometries and materials. */
  dispose(): void
}

/** What a part of an icon is: its geometry, its colour, where it sits. */
interface Part {
  /** Its geometry, built around its own origin. */
  geometry: BufferGeometry
  /** Its colour, a key of the palette. */
  colour: keyof EventIconPalette
  /** Where its origin goes, `[x, y, z]`. */
  at?: [number, number, number]
  /** A turn about the vertical axis, in radians. */
  turn?: number
}

/**
 * A faceted material: `flatShading` gives each face one tone, which is what makes a small low-poly object read as
 * cut rather than smooth.
 * @param colour - its colour
 * @returns the material
 */
function faceted(colour: string): MeshStandardMaterial {
  return new MeshStandardMaterial({
    color: colour,
    flatShading: true,
    // In the transparent pass, so the icons are drawn after the borders, like the pins (`EVENT_RENDER_ORDER`).
    transparent: true,
    roughness: 0.55,
    metalness: 0.1,
  })
}

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
  const blade = new Shape()
  blade.moveTo(-0.075, 0)
  blade.lineTo(0.075, 0)
  blade.lineTo(0.075, 0.74)
  blade.lineTo(0, 0.9)
  blade.lineTo(-0.075, 0.74)
  blade.closePath()
  const bladeGeometry = new ExtrudeGeometry(blade, {
    depth: 0.03,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.015,
    bevelSegments: 1,
  })
  bladeGeometry.translate(0, 0.365, -0.015)
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
function swordParts(): Part[] {
  return [SWORD_LEAN, -SWORD_LEAN].flatMap((lean, index) =>
    oneSword().map((part) => ({
      ...part,
      geometry: part.geometry
        .translate(0, -SWORD_CROSSING, 0)
        .rotateZ(lean)
        .translate(0, 0, index === 0 ? SWORD_GAP / 2 : -SWORD_GAP / 2),
    }))
  )
}

/** How many sides the tower has, and how many merlons crown it. */
const TOWER_SIDES = 8

/**
 * A crenellated tower: an octagonal body turned from a profile, a merlon on every other side, a door.
 * @returns its parts
 */
function towerParts(): Part[] {
  const profile = [
    new Vector2(0, 0),
    new Vector2(0.3, 0),
    new Vector2(0.26, 0.1),
    new Vector2(0.25, 0.66),
    new Vector2(0.31, 0.72),
    new Vector2(0.31, 0.78),
    new Vector2(0, 0.78),
  ]
  const merlons: Part[] = Array.from({ length: TOWER_SIDES / 2 }, (_, index) => {
    const angle = (index * 2 * Math.PI * 2) / TOWER_SIDES
    return {
      geometry: new BoxGeometry(0.13, 0.14, 0.1),
      colour: 'stone',
      at: [Math.sin(angle) * 0.25, 0.85, Math.cos(angle) * 0.25],
      turn: angle,
    }
  })
  return [
    { geometry: new LatheGeometry(profile, TOWER_SIDES), colour: 'stone' },
    ...merlons,
    { geometry: new BoxGeometry(0.12, 0.2, 0.04), colour: 'door', at: [0, 0.12, 0.27] },
  ]
}

/** How many fleurons the crown carries. */
const CROWN_FLEURONS = 5

/**
 * A crown: a band turned from a ring's section, pointed fleurons each tipped with a pearl, a stone between two.
 * @returns its parts
 */
function crownParts(): Part[] {
  const section = [
    new Vector2(0.3, 0),
    new Vector2(0.36, 0),
    new Vector2(0.36, 0.26),
    new Vector2(0.3, 0.26),
    new Vector2(0.3, 0),
  ]
  const around = Array.from(
    { length: CROWN_FLEURONS },
    (_, index) => (index * Math.PI * 2) / CROWN_FLEURONS
  )
  return [
    { geometry: new LatheGeometry(section, 10), colour: 'gold' },
    ...around.map((angle): Part => ({
      geometry: new ConeGeometry(0.08, 0.3, 4),
      colour: 'gold',
      at: [Math.sin(angle) * 0.33, 0.41, Math.cos(angle) * 0.33],
      turn: angle,
    })),
    ...around.map((angle): Part => ({
      geometry: new OctahedronGeometry(0.05),
      colour: 'gold',
      at: [Math.sin(angle) * 0.33, 0.6, Math.cos(angle) * 0.33],
    })),
    ...around.map((angle): Part => {
      const between = angle + Math.PI / CROWN_FLEURONS
      return {
        geometry: new OctahedronGeometry(0.045),
        colour: 'jewel',
        at: [Math.sin(between) * 0.37, 0.13, Math.cos(between) * 0.37],
      }
    }),
  ]
}

/**
 * Scale and lift an icon's parts so the whole stands one unit high on the origin — so every kind is built at
 * whatever size reads best, and they all come out alike.
 * @param parts - the parts, their geometries placed
 * @returns the same parts, their geometries fitted
 */
function standUnitHigh(parts: Part[]): Part[] {
  const box = new Box3()
  for (const part of parts) {
    part.geometry.computeBoundingBox()
    const own = part.geometry.boundingBox
    if (own === null) continue
    const placed = own.clone()
    if (part.at !== undefined) placed.translate(new Vector3(...part.at))
    box.union(placed)
  }
  const height = box.max.y - box.min.y
  const scale = 1 / height
  for (const part of parts) {
    if (part.at === undefined) {
      part.geometry.translate(0, -box.min.y, 0).scale(scale, scale, scale)
    } else {
      // A placed part is lifted through its position, so its geometry, built about its own origin, is only scaled.
      part.geometry.scale(scale, scale, scale)
      const [x, y, z] = part.at
      part.at = [x * scale, (y - box.min.y) * scale, z * scale]
    }
  }
  return parts
}

/** Each kind's parts. */
const PARTS: Record<EventIconKind, () => Part[]> = {
  swords: swordParts,
  tower: towerParts,
  crown: crownParts,
}

/**
 * Build one icon. Its parts share one material per colour, so an icon costs a handful of materials however many
 * parts it has.
 * @param kind - which shape
 * @param palette - its colours
 * @returns the icon, one unit high, standing at the origin
 */
export function createEventIcon(
  kind: EventIconKind,
  palette: EventIconPalette = EVENT_ICON_PALETTE
): EventIcon {
  const parts = standUnitHigh(PARTS[kind]())
  const materials = new Map<keyof EventIconPalette, MeshStandardMaterial>()
  const object = new Group()
  for (const part of parts) {
    let material = materials.get(part.colour)
    if (material === undefined) {
      material = faceted(palette[part.colour])
      materials.set(part.colour, material)
    }
    const mesh = new Mesh(part.geometry, material)
    if (part.at !== undefined) mesh.position.set(...part.at)
    if (part.turn !== undefined) mesh.rotation.y = part.turn
    object.add(mesh)
  }
  return {
    object,
    setOpacity(opacity: number): void {
      for (const material of materials.values()) material.opacity = opacity
    },
    dispose(): void {
      for (const part of parts) part.geometry.dispose()
      for (const material of materials.values()) material.dispose()
    },
  }
}

/** How bright each of the icons' lights is. */
export interface IconLighting {
  /** The light behind the icon, against the light (the dev, 2026-10-26): it cuts out the edges. The strongest. */
  rim: number
  /** The light from the reader's side, on the faces the camera sees. Softer, so the faces keep their shading. */
  key: number
  /** The sky, so no face is black. Low, or it flattens the volume. */
  sky: number
}

/**
 * The default lighting: a strong rim, a softer key, a low sky — the contrast that makes a small object read as a
 * volume (the dev, 2026-10-26: the same problem as the relief's).
 */
export const ICON_LIGHTING: IconLighting = { rim: 5, key: 1.3, sky: 0.35 }

/** Where the rim light stands in the camera's frame (+Z toward the reader): behind the icon, above it, to the left. */
const RIM_FROM: [number, number, number] = [-6, 8, -10]

/** Where the key light stands in the camera's frame: on the reader's side, above, to the right. */
const KEY_FROM: [number, number, number] = [7, 5, 10]

/**
 * The icons' lights, set in the camera's frame: the rig is turned with the camera at each frame, so the rim is
 * always behind an icon and the key always on the reader's side, whatever the point of view — lit in the world, one
 * point of view would show the volume and the next would lose it. The relief and the pins are unlit
 * (`MeshBasicMaterial`), so these light the icons and nothing else.
 * @param lighting - how bright each light is
 * @returns the rig — a group holding the rim, the key and the sky, in that order — to turn with the camera
 */
export function createIconLights(lighting: IconLighting = ICON_LIGHTING): Group {
  const rim = new DirectionalLight('#fff4dd', lighting.rim)
  rim.position.set(...RIM_FROM)
  const key = new DirectionalLight('#ffffff', lighting.key)
  key.position.set(...KEY_FROM)
  const rig = new Group()
  rig.add(rim, key, new HemisphereLight('#fff8e8', '#6b5a43', lighting.sky))
  return rig
}
