/**
 * The 3D icons' cast shadows (ATLAS-298), drawn the pins' way: each icon's shadow is an image, laid on the relief by a
 * grid that follows it (`groundShadows`) — same darkness, same soft edge (the dev, 2026-10-27: « pareille que pour les
 * épingles, d'un même bloc, des bords un peu flous »). The image is drawn from the icon's own model as it is posed —
 * its triangles slid along the light to its ground and filled as one shape (`silhouette`) — so the trebuchet's throw
 * and the swords' sway are in it. Every icon has its tile in one texture, so all the shadows are one draw. The tiles are
 * drawn again from the icons as they stand, a few times a second at most.
 */

import { DataTexture, LinearFilter, Vector3 } from 'three'

import { GROUND_SHADOW_OPTIONS, restOnRelief, shadowGrids, shadowMesh } from './groundShadows'
import {
  SHADOW_OPACITY,
  SHADOW_SUN,
  shadowDirection,
  shadowReach,
  sunFall,
} from './shadowFootprint'
import { blurCoverage, fillTriangle, framePixel, groundPoint } from './silhouette'

import type { IconInstances } from '../icons/iconInstances'
import type { EventMarkers } from '../markers'
import type { GroundAt, ShadowSpot } from './groundShadows'
import type { ShadowFrame } from './shadowAlpha'
import type { SilhouetteGround } from './silhouette'
import type { Matrix4 } from 'three'

/** One icon as its shadow needs it: where its base stands, how far it floats, how tall it is. */
export interface ShadowedIcon {
  /** Where its base stands, scaled as the relief is. */
  readonly position: Vector3
  /** How far its base floats above its place. */
  readonly lift: number
  /** How tall it stands. */
  readonly size: number
}

/**
 * How the icons' shadows are drawn. The sun, the darkness and the grid are not among them on purpose: they are the
 * markers' own constants (`SHADOW_SUN`, `SHADOW_OPACITY`, `GROUND_SHADOW_OPTIONS`), read by the pins' shadows too, so
 * the two can never cast differently.
 */
export interface IconShadowOptions {
  /** One tile's pixels, along the shadow's axis and across it. */
  tile: { along: number; across: number }
  /** How soft the edge is, as a share of the icon's size. */
  softness: number
  /** How much room is kept around the icon's foot, as a share of its size. */
  margin: number
  /** The shortest time between two drawings of an icon that moves, in seconds. */
  interval: number
}

/**
 * The default: a tile fine enough for a trebuchet's beams to cast a line of their own, an edge softened by about a
 * pixel — small against the thinnest part, as a pin's stem's is (the dev, 2026-10-27, on the trebuchet's shadow:
 * « pas tellement marqué »; at half the pixels and a blur set for the swords' blades, its beams were smeared away).
 * Redrawn up to fifteen times a second.
 */
export const ICON_SHADOW_OPTIONS: IconShadowOptions = {
  tile: { along: 192, across: 96 },
  softness: 0.012,
  margin: 0.7,
  interval: 1 / 15,
}

/**
 * The rectangle an icon's shadow fits in: room around its foot, and past where the light lays its top.
 * @param icon - the icon
 * @param margin - the room, as a share of its size
 * @returns the frame
 */
export function iconShadowFrame(
  icon: Pick<ShadowedIcon, 'lift' | 'size'>,
  margin: number
): ShadowFrame {
  const room = icon.size * margin
  return { sMin: -room, sMax: shadowReach(icon.lift + icon.size, SHADOW_SUN) + room, tHalf: room }
}

/**
 * Draw one icon's shadow into its tile: every triangle of every piece, slid to the ground and filled, then blurred.
 * @param instances - the icons, posed
 * @param index - which icon
 * @param ground - where its shadow lies
 * @param frame - the rectangle its tile covers
 * @param options - the tile's size and the edge's softness, in pixels
 * @param options.tile - the tile's pixels
 * @param options.blur - the blur's half-width, in pixels
 * @returns the tile's coverage, 0 to 1, row by row
 */
function drawIconShadow(
  instances: Pick<IconInstances, 'forEachPiece'>,
  index: number,
  ground: SilhouetteGround,
  frame: ShadowFrame,
  options: { tile: IconShadowOptions['tile']; blur: number }
): Float32Array {
  const { along: width, across: height } = options.tile
  const coverage = new Float32Array(width * height)
  const point = new Vector3()
  const corners: [number, number, number, number, number, number] = [0, 0, 0, 0, 0, 0]
  instances.forEachPiece(index, (positions, matrix: Matrix4) => {
    for (let k = 0; k + 2 < positions.count; k += 3) {
      for (let corner = 0; corner < 3; corner++) {
        point.fromBufferAttribute(positions, k + corner).applyMatrix4(matrix)
        const [s, t] = groundPoint(point.x, point.y, point.z, ground)
        const [px, py] = framePixel(s, t, frame, width, height)
        corners[corner * 2] = px
        corners[corner * 2 + 1] = py
      }
      fillTriangle(coverage, width, height, corners)
    }
  })
  return blurCoverage(coverage, width, height, options.blur)
}

/** The tiles' layout in the one texture: how many across, how many down, and its pixels. */
interface TileSheet {
  /** Tiles across. */
  columns: number
  /** Tiles down. */
  rows: number
  /** The texture's pixels across. */
  width: number
  /** The texture's pixels, RGBA, black, the shadow in the alpha. */
  pixels: Uint8Array
  /** The texture. */
  texture: DataTexture
}

/**
 * One texture for every icon's tile, in a square-ish grid.
 * @param count - how many icons
 * @param tile - one tile's pixels
 * @returns the sheet
 */
function tileSheet(count: number, tile: IconShadowOptions['tile']): TileSheet {
  const columns = Math.max(1, Math.ceil(Math.sqrt(count)))
  const rows = Math.max(1, Math.ceil(count / columns))
  const width = columns * tile.along
  const pixels = new Uint8Array(width * rows * tile.across * 4)
  const texture = new DataTexture(pixels, width, rows * tile.across)
  texture.magFilter = LinearFilter
  texture.minFilter = LinearFilter
  return { columns, rows, width, pixels, texture }
}

/**
 * Where an icon's tile sits in the texture, in texture fractions.
 * @param index - the icon
 * @param sheet - the sheet's layout
 * @returns the tile's corner and size
 */
function tileOf(index: number, sheet: Pick<TileSheet, 'columns' | 'rows'>): ShadowSpot['tile'] {
  return {
    u: (index % sheet.columns) / sheet.columns,
    v: Math.floor(index / sheet.columns) / sheet.rows,
    width: 1 / sheet.columns,
    height: 1 / sheet.rows,
  }
}

/**
 * Write one tile's coverage into the sheet's alpha.
 * @param sheet - the sheet
 * @param index - the icon whose tile it is
 * @param coverage - its coverage, 0 to 1, row by row
 * @param tile - one tile's pixels
 * @returns nothing
 */
function writeTile(
  sheet: TileSheet,
  index: number,
  coverage: Float32Array,
  tile: IconShadowOptions['tile']
): void {
  const left = (index % sheet.columns) * tile.along
  const top = Math.floor(index / sheet.columns) * tile.across
  for (let row = 0; row < tile.across; row++)
    for (let col = 0; col < tile.along; col++)
      sheet.pixels[((top + row) * sheet.width + left + col) * 4 + 3] = Math.round(
        Math.min(1, coverage[row * tile.along + col] ?? 0) * 255
      )
}

/**
 * How an icon's tile is drawn: its shadow from its pose, slid to its ground, its blur the softness over one pixel's
 * length, written into the sheet.
 * @param sheet - the sheet the tiles are in
 * @param instances - the icons as drawn
 * @param options - the tile's size and the edge's softness
 * @returns the drawer, for one icon, its rank and its frame
 */
function tileDrawer(
  sheet: TileSheet,
  instances: Pick<IconInstances, 'forEachPiece'>,
  options: Pick<IconShadowOptions, 'tile' | 'softness'>
): (index: number, icon: ShadowedIcon, frame: ShadowFrame) => void {
  const axis = shadowDirection(SHADOW_SUN)
  const fall = sunFall(SHADOW_SUN)
  return (index, icon, frame) => {
    const { x, y, z } = icon.position
    const ground = { x, z, y: y - icon.lift, axis, fall }
    const blur = Math.round(
      (icon.size * options.softness * options.tile.along) / (frame.sMax - frame.sMin)
    )
    const coverage = drawIconShadow(instances, index, ground, frame, { tile: options.tile, blur })
    writeTile(sheet, index, coverage, options.tile)
  }
}

/**
 * The icons' shadows, one tile each in one texture, laid on the relief.
 * @param icons - each icon, in the instances' order
 * @param instances - the icons as drawn, read for their pieces' poses
 * @param groundAt - the relief's height under any point
 * @param options - how they are drawn
 * @returns the shadows, shaped like the markers' handle, plus `setOpacity` for the icons' cross-fade
 */
export function createIconShadows(
  icons: readonly ShadowedIcon[],
  instances: Pick<IconInstances, 'forEachPiece'>,
  groundAt: GroundAt,
  options: IconShadowOptions = ICON_SHADOW_OPTIONS
): EventMarkers & { setOpacity: (opacity: number) => void } {
  // 1. One texture for every tile; each icon's frame and tile, and the grids laid on the relief.
  const sheet = tileSheet(icons.length, options.tile)
  const framed = icons.map((icon) => ({ icon, frame: iconShadowFrame(icon, options.margin) }))
  const spots = framed.map(({ icon, frame }, index) => ({
    x: icon.position.x,
    z: icon.position.z,
    frame,
    tile: tileOf(index, sheet),
  }))
  const { geometry, grounds } = shadowGrids(spots, groundAt, GROUND_SHADOW_OPTIONS)
  const { object, material } = shadowMesh(geometry, sheet.texture, {
    opacity: SHADOW_OPACITY,
    depthPull: GROUND_SHADOW_OPTIONS.depthPull,
  })

  // 2. Drawing a tile: the icon's shadow from its pose.
  const drawTile = tileDrawer(sheet, instances, options)
  let last = Number.NEGATIVE_INFINITY

  return {
    object,
    setReliefScale(scale: number): void {
      restOnRelief(geometry, grounds, scale)
    },
    setZoom(): void {
      // The shadows fade with the 3D icons, through `setOpacity`.
    },
    faceCamera(_camera, seconds: number): void {
      // Drawn again from the icons as they are posed now, at most every interval — and not at all while the 3D icons
      // are faded out, from afar: nothing would show it.
      if (material.opacity === 0 || seconds - last < options.interval) return
      last = seconds
      framed.forEach(({ icon, frame }, index) => {
        drawTile(index, icon, frame)
      })
      sheet.texture.needsUpdate = true
    },
    setOpacity(opacity: number): void {
      // Coming back into view: drawn at the next frame, never shown as it stood when it faded out.
      if (material.opacity === 0 && opacity > 0) last = Number.NEGATIVE_INFINITY
      material.opacity = SHADOW_OPACITY * opacity
    },
    dispose(): void {
      geometry.dispose()
      material.dispose()
      sheet.texture.dispose()
    },
  }
}
