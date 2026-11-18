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
import { SOIL_OPACITY, soiled } from './soil'

import type { IconInstances } from '../icons/iconInstances'
import type { EventMarkers } from '../markers'
import type { GroundAt, ShadowSpot } from './groundShadows'
import type { ShadowFrame } from './shadowAlpha'
import type { SilhouetteGround } from './silhouette'
import type { Soil } from './soil'
import type { Matrix4 } from 'three'

/** One icon as its shadow needs it: where its base stands, how far it floats, how tall it is, whether it moves. */
export interface ShadowedIcon {
  /** Where its base stands, scaled as the relief is. */
  readonly position: Vector3
  /** How far its base floats above its place. */
  readonly lift: number
  /** How tall its model stands, in world units. */
  readonly size: number
  /** How many world units one unit of its model is. */
  readonly unit: number
  /** Whether it turns to face the camera at each frame. */
  readonly turns: boolean
  /** Whether it sways about its upright at each frame. */
  readonly sways: boolean
  /**
   * How dark the soiled ground about its foot is, 0 to 1 — a building's, so it reads as set in the ground (`soil`).
   * Left out or `0`: none.
   */
  readonly soil?: number
}

/**
 * How the icons' shadows are drawn. The sun, the darkness and the grid are not among them on purpose: they are the
 * markers' own constants (`SHADOW_SUN`, `SHADOW_OPACITY`, `GROUND_SHADOW_OPTIONS`), read by the pins' shadows too, so
 * the two can never cast differently. The icons' image is drawn darker than that, at the soil's `SOIL_OPACITY`, and a
 * cast shadow takes only its share of it (`CAST_SHARE`): on the ground it is `SHADOW_OPACITY` still.
 */
export interface IconShadowOptions {
  /** One tile's pixels, along the shadow's axis and across it. */
  tile: { along: number; across: number }
  /** How soft the edge is, as a share of the icon's size. */
  softness: number
  /** How much room is kept around the icon's foot, as a share of its size. */
  margin: number
  /**
   * The shortest time between two drawings of an icon that moves, in seconds. One that stands still — a cathedral, a
   * grave — is drawn once, and again only when the relief is rescaled or the icons come back into view (ATLAS-469).
   */
  interval: number
  /** How far the soiled ground spreads past a building's walls, as a share of its size. */
  soilReach: number
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
  soilReach: 0.2,
}

/** How far an icon's own model reaches, in its model's units (`ShadowedIcon.unit`). */
export interface ModelExtent {
  /** The furthest it reaches from its upright, whichever way it is turned. */
  readonly radius: number
  /** Its top above its base. */
  readonly top: number
  /**
   * How far the soiled ground spreads past its walls, as a share of its height, for a model that has it; left out,
   * none. The frame keeps room
   * for it and for its soft end, or the soil stops at the frame in a straight edge (the dev, 2026-11-17: « on voit un
   * bord droit »).
   */
  readonly soilReach?: number
}

/** How much room is kept past a model's own reach, so its shadow's soft edge is not cut: a share of that reach. */
const REACH_ROOM = 1.15

/** How much room the soil takes past the walls, in its own reaches: its spread, then the soft end half as long again. */
const SOIL_ROOM = 1.8

/**
 * How far an icon's model reaches, read from its pieces as they are built — before any pose, which only turns and
 * places it.
 * @param instances - the icons as drawn
 * @param index - which icon
 * @returns its reach, in its model's units
 */
export function modelExtent(
  instances: Pick<IconInstances, 'forEachPiece'>,
  index: number
): ModelExtent {
  let radius = 0
  let top = 0
  instances.forEachPiece(index, (positions) => {
    for (let k = 0; k < positions.count; k++) {
      radius = Math.max(radius, Math.hypot(positions.getX(k), positions.getZ(k)))
      top = Math.max(top, positions.getY(k))
    }
  })
  return { radius, top }
}

/**
 * The rectangle an icon's shadow fits in: room around its foot, and past where the light lays its top. A model that
 * reaches further than its size — a cathedral twice as long as it is tall, whose shadow was cut at both ends (the
 * dev, 2026-11-17: « l'ombre ne fait pas la bonne taille ») — widens it to its own reach; one that does not keeps the
 * frame its size gives.
 * @param icon - the icon
 * @param margin - the room, as a share of its size
 * @param extent - how far its model reaches, in its model's units; left out, the icon's size alone frames it
 * @returns the frame
 */
export function iconShadowFrame(
  icon: Pick<ShadowedIcon, 'lift' | 'size' | 'unit'>,
  margin: number,
  extent?: ModelExtent
): ShadowFrame {
  const reach =
    (extent?.radius ?? 0) * REACH_ROOM * icon.unit +
    (extent?.soilReach ?? 0) * SOIL_ROOM * icon.size
  const room = Math.max(icon.size * margin, reach)
  const top = Math.max(icon.size, (extent?.top ?? 0) * icon.unit)
  return { sMin: -room, sMax: shadowReach(icon.lift + top, SHADOW_SUN) + room, tHalf: room }
}

/** The share of the image's opacity a cast shadow takes, so it stays as dark as every marker's (`SHADOW_OPACITY`). */
const CAST_SHARE = SHADOW_OPACITY / SOIL_OPACITY

/**
 * Draw one icon's shadow into its tile: every triangle of every piece, slid to the ground and filled, then blurred.
 * @param instances - the icons, posed
 * @param index - which icon
 * @param ground - where its shadow lies
 * @param frame - the rectangle its tile covers
 * @param options - the tile's size and the edge's softness, in pixels
 * @param options.tile - the tile's pixels
 * @param options.blur - the blur's half-width, in pixels
 * @param options.soil - the soiled ground about its foot, for an icon that has it
 * @returns the tile's coverage, 0 to 1, row by row
 */
function drawIconShadow(
  instances: Pick<IconInstances, 'forEachPiece'>,
  index: number,
  ground: SilhouetteGround,
  frame: ShadowFrame,
  options: { tile: IconShadowOptions['tile']; blur: number; soil?: Soil }
): Float32Array {
  const { along: width, across: height } = options.tile
  const coverage = new Float32Array(width * height)
  // Its footprint, straight under it — drawn only for an icon whose ground is soiled.
  const footprint = options.soil === undefined ? null : new Float32Array(width * height)
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
      if (footprint === null) continue
      // The same triangle again, dropped straight down: taken at the ground's own height, the light slides it nowhere.
      for (let corner = 0; corner < 3; corner++) {
        point.fromBufferAttribute(positions, k + corner).applyMatrix4(matrix)
        const [s, t] = groundPoint(point.x, ground.y, point.z, ground)
        const [px, py] = framePixel(s, t, frame, width, height)
        corners[corner * 2] = px
        corners[corner * 2 + 1] = py
      }
      fillTriangle(footprint, width, height, corners)
    }
  })
  // The cast shadow at its own darkness, within an image drawn dark enough for the soil (`SOIL_OPACITY`).
  const cast = blurCoverage(coverage, width, height, options.blur)
  for (let k = 0; k < cast.length; k++) cast[k] = (cast[k] ?? 0) * CAST_SHARE
  return footprint === null || options.soil === undefined
    ? cast
    : soiled(cast, footprint, width, height, options.soil)
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
 * How dark an icon's soiled ground is — the one place that says whether it has any, for its frame and its drawing
 * alike: a frame with no room for a soil that is drawn would cut it in a straight edge.
 * @param icon - the icon
 * @returns its darkness, 0 for an icon with none
 */
function soilOf(icon: Pick<ShadowedIcon, 'soil'>): number {
  return icon.soil !== undefined && icon.soil > 0 ? icon.soil : 0
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
  options: Pick<IconShadowOptions, 'tile' | 'softness' | 'soilReach'>
): (index: number, icon: ShadowedIcon, frame: ShadowFrame) => void {
  const axis = shadowDirection(SHADOW_SUN)
  const fall = sunFall(SHADOW_SUN)
  return (index, icon, frame) => {
    const { x, y, z } = icon.position
    const ground = { x, z, y: y - icon.lift, axis, fall }
    const blur = Math.round(
      (icon.size * options.softness * options.tile.along) / (frame.sMax - frame.sMin)
    )
    // Pixels a unit of the world, along the tile.
    const density = options.tile.along / (frame.sMax - frame.sMin)
    const darkness = soilOf(icon)
    const soil =
      darkness === 0
        ? {}
        : { soil: { darkness, spread: Math.round(icon.size * options.soilReach * density) } }
    const coverage = drawIconShadow(instances, index, ground, frame, {
      tile: options.tile,
      blur,
      ...soil,
    })
    writeTile(sheet, index, coverage, options.tile)
  }
}

/**
 * Each icon with the frame its shadow fits in, from its size and its model's own reach.
 * @param icons - each icon, in the instances' order
 * @param instances - the icons as drawn, read for how far each model reaches
 * @param margin - the room around an icon's foot, as a share of its size
 * @param soilReach - how far the soil spreads past a soiled icon's walls, as a share of its size
 * @returns the icons, framed
 */
function framedIcons(
  icons: readonly ShadowedIcon[],
  instances: Pick<IconInstances, 'forEachPiece'>,
  margin: number,
  soilReach: number
): { icon: ShadowedIcon; frame: ShadowFrame }[] {
  return icons.map((icon, index) => {
    const extent = modelExtent(instances, index)
    // Room for the soil only where there is some: the frame and the drawing ask the one question (`soilOf`).
    const inSoil = soilOf(icon) > 0
    return {
      icon,
      frame: iconShadowFrame(icon, margin, inSoil ? { ...extent, soilReach } : extent),
    }
  })
}

/** Which tiles are drawn again at a moment, and what makes the others due. */
interface TileRedraw {
  /**
   * Draw the tiles that are due at a moment.
   * @param seconds - the time since the map started
   * @returns how many tiles were drawn
   */
  draw(seconds: number): number
  /** The still icons stand elsewhere — the relief was rescaled: their tiles are due. */
  forgetStill(): void
  /** Every tile is due at the next drawing, whatever the interval. */
  forgetAll(): void
}

/**
 * When each icon's tile is drawn again (ATLAS-469; the dev's worry for the frame rate, 2026-11-17: only the shadows
 * of the icons that move are redrawn). An icon whose shadow changes by itself — it turns to the camera, it sways, its
 * model moves — is drawn again at every interval; one that stands still, a cathedral or a grave, once, and again only
 * when it is forgotten.
 * @param framed - each icon with its frame, in the instances' order
 * @param instances - the icons as drawn, asked whether each one's model moves by itself
 * @param drawTile - how one icon's tile is drawn
 * @param interval - the shortest time between two drawings of an icon that moves, in seconds
 * @returns the redraw
 */
function tileRedraw(
  framed: readonly { icon: ShadowedIcon; frame: ShadowFrame }[],
  instances: Pick<IconInstances, 'movesAlone'>,
  drawTile: (index: number, icon: ShadowedIcon, frame: ShadowFrame) => void,
  interval: number
): TileRedraw {
  const moving = framed.map(
    ({ icon }, index) => icon.turns || icon.sways || instances.movesAlone(index)
  )
  let last = Number.NEGATIVE_INFINITY
  let stillDrawn = false
  return {
    draw(seconds: number): number {
      const due = seconds - last >= interval
      if (due) last = seconds
      let drawn = 0
      for (const [index, { icon, frame }] of framed.entries()) {
        // A moving icon waits for its interval; a still one is drawn the first time it is asked, at once.
        if (moving[index] === true ? !due : stillDrawn) continue
        drawTile(index, icon, frame)
        drawn += 1
      }
      stillDrawn = true
      return drawn
    },
    forgetStill(): void {
      stillDrawn = false
    },
    forgetAll(): void {
      last = Number.NEGATIVE_INFINITY
      stillDrawn = false
    },
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
  instances: Pick<IconInstances, 'forEachPiece' | 'movesAlone'>,
  groundAt: GroundAt,
  options: IconShadowOptions = ICON_SHADOW_OPTIONS
): EventMarkers & { setOpacity: (opacity: number) => void } {
  // 1. One texture for every tile; each icon's frame and tile, and the grids laid on the relief.
  const sheet = tileSheet(icons.length, options.tile)
  const framed = framedIcons(icons, instances, options.margin, options.soilReach)
  const spots = framed.map(({ icon, frame }, index) => ({
    x: icon.position.x,
    z: icon.position.z,
    frame,
    tile: tileOf(index, sheet),
  }))
  const { geometry, grounds } = shadowGrids(spots, groundAt, GROUND_SHADOW_OPTIONS)
  const { object, material } = shadowMesh(geometry, sheet.texture, {
    opacity: SOIL_OPACITY,
    depthPull: GROUND_SHADOW_OPTIONS.depthPull,
  })

  // 2. Drawing a tile: the icon's shadow from its pose.
  const tiles = tileRedraw(
    framed,
    instances,
    tileDrawer(sheet, instances, options),
    options.interval
  )

  return {
    object,
    setReliefScale(scale: number): void {
      restOnRelief(geometry, grounds, scale)
      // The icons stand elsewhere: the still ones are drawn again.
      tiles.forgetStill()
    },
    setZoom(): void {
      // The shadows fade with the 3D icons, through `setOpacity`.
    },
    setReveal(): void {
      // The icons' fade reaches the shadows through `setOpacity` too (`eventIconMarkers.fadeForms`).
    },
    faceCamera(_camera, seconds: number): void {
      // Drawn again from the icons as they are posed now, at most every interval — and not at all while the 3D icons
      // are faded out, from afar: nothing would show it.
      if (material.opacity === 0) return
      // Handed to the GPU only when a tile changed: a map of buildings alone uploads nothing once drawn.
      if (tiles.draw(seconds) > 0) sheet.texture.needsUpdate = true
    },
    setOpacity(opacity: number): void {
      // Coming back into view: drawn at the next frame, never shown as it stood when it faded out.
      if (material.opacity === 0 && opacity > 0) tiles.forgetAll()
      material.opacity = SOIL_OPACITY * opacity
    },
    dispose(): void {
      geometry.dispose()
      material.dispose()
      sheet.texture.dispose()
    },
  }
}
