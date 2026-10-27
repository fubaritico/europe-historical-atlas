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
import { TREBUCHET_MOTIONS, trebuchetParts } from './trebuchet'

import type { EventIconKind } from '../kinds'
import type { EventIconPalette } from '../palette'
import type { Fit, Motions, Part } from './parts'
import type { BufferGeometry, MeshStandardMaterial } from 'three'

/**
 * Each kind's parts. A new kind is a new file beside this one and a line here — plus its line in `ICON_LIFT`
 * (`../settings`) and in `DRAWINGS` (`../flat/eventIconSvg`), which type-check asks for.
 */
const PARTS: Record<EventIconKind, () => Part[]> = {
  swords: swordParts,
  // The siege's icon keeps its stored name, `tower`; its 3D model is a trebuchet since 2026-10-27, the tower in reserve.
  tower: trebuchetParts,
  crown: crownParts,
}

/** The kinds whose model moves, and how: each motion its parts name. A kind left out stands still. */
const MOTIONS: Partial<Record<EventIconKind, Motions>> = { tower: TREBUCHET_MOTIONS }

/** One colour of a model: every part painted that colour, fused into a single geometry. */
export interface IconPiece {
  /** The colour, a key of the palette. */
  colour: keyof EventIconPalette
  /** The fused geometry, one unit high with the rest of the model, standing on the origin. */
  geometry: BufferGeometry
  /** Its faceted material. */
  material: MeshStandardMaterial
  /** The motion it follows, by name, for a piece that moves — `null` for one that stands still, its place in its geometry. */
  motion: string | null
}

/** A kind's model: its pieces, one per colour, and what changes on all of them at once. */
export interface IconModel {
  /** The pieces, in the order their colours first appear in the model; a colour that moves is a piece apart. */
  readonly pieces: readonly IconPiece[]
  /**
   * Where a moving piece stands at a moment, in the model's units: its geometry, built about the point the motion
   * places, goes through this placement.
   * @param motion - the motion's name, as the piece carries it
   * @param seconds - the time since the map started
   * @param into - the matrix to write
   * @returns `into`
   */
  placeAt(motion: string, seconds: number, into: Matrix4): Matrix4
  /**
   * Fade the pieces whose motion fades, as it has them at a moment — on top of the model's own opacity.
   * @param seconds - the time since the map started
   * @returns nothing
   */
  fadeAt(seconds: number): void
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
  // A moving part stays about its own origin: its motion places it, at each moment.
  if (part.at !== undefined && part.moves === undefined) place.setPosition(...part.at)
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

/** A piece before it is fused: its colour, its motion if it moves, its parts' geometries placed. */
interface GatheredPiece {
  /** The colour, a key of the palette. */
  colour: keyof EventIconPalette
  /** The motion it follows, or `null` for a piece that stands still. */
  motion: string | null
  /** Its parts' geometries, each with its place baked in. */
  geometries: BufferGeometry[]
}

/**
 * Gather a model's parts into pieces: one per colour that stands still, its parts' places baked into their geometries;
 * one per colour and motion that moves, its parts kept about their origin. Frees each part's own geometry.
 * @param parts - the parts, fitted one unit high
 * @returns the pieces, in the order they first appear
 */
function gatherPieces(parts: Part[]): GatheredPiece[] {
  const byPiece = new Map<string, GatheredPiece>()
  for (const part of parts) {
    const motion = part.moves ?? null
    // A moving part goes with those of its colour under the same motion, so each piece moves as one.
    const key = motion === null ? part.colour : `${part.colour} ${motion}`
    const piece = byPiece.get(key) ?? { colour: part.colour, motion, geometries: [] }
    piece.geometries.push(placedGeometry(part))
    byPiece.set(key, piece)
    part.geometry.dispose()
  }
  return [...byPiece.values()]
}

/**
 * Fuse each gathered piece into one geometry, with its faceted material. Frees the placed geometries; on a piece that
 * cannot be fused, frees what was built first.
 * @param name - what the model is, for an error's message
 * @param gathered - the pieces, their parts' geometries placed
 * @param palette - the colours
 * @returns the pieces
 * @throws when a piece's geometries cannot be fused — their attributes differ, a defect of a part's construction
 */
function fusePieces(
  name: string,
  gathered: readonly GatheredPiece[],
  palette: EventIconPalette
): IconPiece[] {
  const pieces: IconPiece[] = []
  for (const { colour, motion, geometries } of gathered) {
    const geometry = fuse(geometries)
    for (const placed of geometries) placed.dispose()
    if (geometry === null) {
      for (const built of pieces) {
        built.geometry.dispose()
        built.material.dispose()
      }
      throw new Error(
        `[atlas] the ${name} icon's ${colour} parts could not be fused into one geometry`
      )
    }
    pieces.push({ colour, geometry, material: faceted(palette[colour]), motion })
  }
  return pieces
}

/**
 * Carry a placement from the units the parts were built in to the model's: its translation lifted off the floor and
 * scaled as the parts were; its turn and scale as they are.
 * @param placement - the placement, in build units — rewritten in place
 * @param fit - how the parts were fitted
 * @returns `placement`
 */
function fitPlacement(placement: Matrix4, fit: Fit): Matrix4 {
  const e = placement.elements
  e[12] = e[12] * fit.scale
  e[13] = (e[13] - fit.floor) * fit.scale
  e[14] = e[14] * fit.scale
  return placement
}

/**
 * Build a kind's model.
 * @param kind - which shape
 * @param palette - its colours
 * @returns the model, one unit high, standing on the origin
 * @throws when a colour's parts cannot be fused (`buildModel`)
 */
export function buildIconModel(
  kind: EventIconKind,
  palette: EventIconPalette = EVENT_ICON_PALETTE
): IconModel {
  return buildModel(kind, PARTS[kind](), MOTIONS[kind], palette)
}

/**
 * Build a model from its parts, exactly as the map builds its own — what the icons' bench builds its candidates with,
 * so the one chosen there is the one the map shows.
 * @param name - what it is, for an error's message
 * @param parts - its parts, each built as `Part` says
 * @param motions - how its moving parts are placed at a moment, by the names they use; `undefined` for a model that
 *   stands still
 * @param palette - its colours
 * @returns the model, one unit high, standing on the origin
 * @throws when a colour's parts cannot be fused (`fusePieces`) — a model drawn without that colour would be a battle
 *   with no blades, said nowhere; or when a part names a motion the model does not have, the same kind of defect
 */
export function buildModel(
  name: string,
  parts: Part[],
  motions: Motions | undefined,
  palette: EventIconPalette
): IconModel {
  // 1. The parts, fitted one unit high, gathered into pieces — each moving one's motion known.
  const fitted = standUnitHigh(parts)
  const byPiece = gatherPieces(fitted.parts)
  const missing = byPiece.find(({ motion }) => motion !== null && motions?.[motion] === undefined)
  if (missing !== undefined) {
    for (const { geometries } of byPiece) for (const placed of geometries) placed.dispose()
    throw new Error(
      `[atlas] the ${name} icon's ${String(missing.motion)} parts have no such motion`
    )
  }

  // 2. One geometry and one material per piece.
  const pieces = fusePieces(name, byPiece, palette)

  // The pieces whose motion fades, with their fade; and the model's own opacity, which theirs sits on.
  const fading = pieces.flatMap(({ material, motion }) => {
    const fade = motion === null ? undefined : motions?.[motion]?.fade
    return fade === undefined ? [] : [{ material, fade }]
  })
  // The fading pieces have one writer, `fadeAt`; the cross-fade's opacity and the last moment are what it reads.
  let opacity = 1
  let lastSeconds = 0
  const fadingMaterials = new Set(fading.map(({ material }) => material))

  return {
    pieces,
    placeAt(motion: string, seconds: number, into: Matrix4): Matrix4 {
      const move = motions?.[motion]
      if (move === undefined) throw new Error(`[atlas] the ${name} icon has no ${motion} motion`)
      return fitPlacement(move.place(seconds, into), fitted.fit)
    },
    fadeAt(seconds: number): void {
      lastSeconds = seconds
      for (const { material, fade } of fading) material.opacity = opacity * fade(seconds)
    },
    setOpacity(value: number): void {
      opacity = value
      for (const { material } of pieces)
        if (!fadingMaterials.has(material)) material.opacity = value
      // The fading pieces at the new opacity, as they stood at the last moment — never at full for a frame.
      for (const { material, fade } of fading) material.opacity = value * fade(lastSeconds)
    },
    dispose(): void {
      for (const { geometry, material } of pieces) {
        geometry.dispose()
        material.dispose()
      }
    },
  }
}
