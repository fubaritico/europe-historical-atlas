/**
 * A kind's 3D model, built once and shared by every icon of that kind (ATLAS-289): its parts fitted one unit high,
 * then fused into one geometry per colour, each with its faceted material. A hundred battles draw these few pieces a
 * hundred times over — they are never built a hundred times.
 */

import { Matrix4 } from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

import { EVENT_ICON_PALETTE } from '../palette'

import { crownParts } from './crown'
import { faceted, standUnitHigh } from './parts'
import { swordParts } from './swords'
import { towerParts } from './tower'

import type { EventIconKind } from '../kinds'
import type { EventIconPalette } from '../palette'
import type { Part } from './parts'
import type { BufferGeometry, MeshStandardMaterial } from 'three'

/**
 * Each kind's parts. A new kind is a new file beside this one and a line here — plus its line in `ICON_LIFT`
 * (`../settings`) and in `DRAWINGS` (`../flat/eventIconSvg`), which type-check asks for.
 */
const PARTS: Record<EventIconKind, () => Part[]> = {
  swords: swordParts,
  tower: towerParts,
  crown: crownParts,
}

/** One colour of a model: every part painted that colour, fused into a single geometry. */
export interface IconPiece {
  /** The colour, a key of the palette. */
  colour: keyof EventIconPalette
  /** The fused geometry, one unit high with the rest of the model, standing on the origin. */
  geometry: BufferGeometry
  /** Its faceted material. */
  material: MeshStandardMaterial
}

/** A kind's model: its pieces, one per colour, and what changes on all of them at once. */
export interface IconModel {
  /** The pieces, in the order their colours first appear in the model. */
  readonly pieces: readonly IconPiece[]
  /**
   * Fade the model, for its cross-fade with its flat drawing — every icon drawn with it fades together.
   * @param opacity - 0 gone, 1 solid
   * @returns nothing
   */
  setOpacity(opacity: number): void
  /** Free its geometries and materials. */
  dispose(): void
}

/**
 * A part's geometry with its place on the model baked in: turned about the vertical, then moved to where it sits —
 * so parts that sat apart as meshes can be fused into one geometry. Every part is made non-indexed first, since a
 * fusion takes indexed and non-indexed geometries alike or not at all.
 * @param part - the part, fitted
 * @returns a new geometry, the part's own left to be freed by the caller
 */
export function placedGeometry(part: Part): BufferGeometry {
  const geometry =
    part.geometry.index === null ? part.geometry.clone() : part.geometry.toNonIndexed()
  const place = new Matrix4().makeRotationY(part.turn ?? 0)
  if (part.at !== undefined) place.setPosition(...part.at)
  return geometry.applyMatrix4(place)
}

/**
 * Fuse geometries into one. Typed by three as never null, `mergeGeometries` returns null on geometries it cannot
 * fuse (BufferGeometryUtils.js: `console.error(…); return null`) — so its real return type is declared here.
 * @param geometries - the geometries, of the same attributes
 * @returns the fused geometry, or `null` when they could not be fused
 */
function fuse(geometries: BufferGeometry[]): BufferGeometry | null {
  return mergeGeometries(geometries)
}

/**
 * Build a kind's model.
 * @param kind - which shape
 * @param palette - its colours
 * @returns the model, one unit high, standing on the origin
 * @throws when a colour's parts cannot be fused — their attributes differ, a defect of a part's construction, and a
 *   model drawn without that colour would be a battle with no blades, said nowhere
 */
export function buildIconModel(
  kind: EventIconKind,
  palette: EventIconPalette = EVENT_ICON_PALETTE
): IconModel {
  // 1. The kind's parts, fitted one unit high, each with its place baked into its geometry.
  const parts = standUnitHigh(PARTS[kind]())
  const byColour = new Map<keyof EventIconPalette, BufferGeometry[]>()
  for (const part of parts) {
    const placed = byColour.get(part.colour) ?? []
    placed.push(placedGeometry(part))
    byColour.set(part.colour, placed)
    part.geometry.dispose()
  }

  // 2. One geometry and one material per colour; on a colour that cannot be fused, what was built is freed first.
  const pieces: IconPiece[] = []
  for (const [colour, geometries] of byColour) {
    const geometry = fuse(geometries)
    for (const placed of geometries) placed.dispose()
    if (geometry === null) {
      for (const built of pieces) {
        built.geometry.dispose()
        built.material.dispose()
      }
      throw new Error(
        `[atlas] the ${kind} icon's ${colour} parts could not be fused into one geometry`
      )
    }
    pieces.push({ colour, geometry, material: faceted(palette[colour]) })
  }

  return {
    pieces,
    setOpacity(opacity: number): void {
      for (const { material } of pieces) material.opacity = opacity
    },
    dispose(): void {
      for (const { geometry, material } of pieces) {
        geometry.dispose()
        material.dispose()
      }
    },
  }
}
