/**
 * The political line work, one composed layer per split level of homage (ATLAS-253).
 *
 * A border between a vassal and its suzerain is hidden from afar and fades in as the zoom shows the
 * vassal in its own colour; a border between two realms is level 0 and always drawn. Grouping the lines by
 * level at build time is what keeps the reveal cheap — the same trade the rivers make by rank: every frame
 * sets one fade per level, and nothing is rebuilt while zooming.
 *
 * Behind the composed layer's own handle shape, so the frame loop thins, eases and dashes it exactly as it
 * did the single layer this replaces.
 */

import { Group } from 'three'

import { BLUR_LAYERS } from '../../blurLayers'
import { levelOpacity } from '../homageReveal'

import { createComposedLineLayer } from './composedLineLayer'

import type {
  ComposedLineLayer,
  ComposedLineLayerOptions,
  ComposedStroke,
} from './composedLineLayer'
import type { BlurMethod } from '../../blur/blurMethod'
import type { RegionBorders } from '@europe-historical-atlas/core/data/regionBorders'

/** The layer the borders' lines move to while blurred (ATLAS-302) — one the camera does not see. */
export const BORDER_BLUR_LAYER = BLUR_LAYERS.borders

/** The line work by level, behind one handle. */
export interface LevelledBorderLayer extends Omit<ComposedLineLayer, 'object' | 'setFade'> {
  /** The group holding every level's layer; scaling it scales them all. */
  readonly object: Group
  /** Each level's composed layer, keyed by split level — exposed so the grouping can be inspected. */
  readonly levels: ReadonlyMap<number, ComposedLineLayer>
  /**
   * Fade each level in as the detail reaches it; level 0 stays whole.
   * @param detail - how much homage the zoom shows (`homageReveal.homageDetail`)
   * @returns nothing
   */
  setDetail(detail: number): void
  /**
   * Blur the line work a little (ATLAS-302), or draw it crisp at a reach the blur's method does not draw (`0` always).
   * @param pixels - the blur's reach, in CSS pixels
   * @returns nothing
   */
  setBlur(pixels: number): void
}

/**
 * Sort a year's borders by split level. The frontier against unclaimed ground has one side and is level
 * 0, shown at every zoom.
 * @param borders - the year's lines
 * @param levelFor - the split level of a group, by its pair
 * @returns the lines by level, level 0 always present
 */
export function splitBordersByLevel(
  borders: RegionBorders,
  levelFor: (pair: readonly [number, number]) => number
): Map<number, RegionBorders> {
  // Level 0 holds the frontier, which has no pair, and starts with no border between polities.
  const byLevel = new Map<number, RegionBorders>([[0, { between: [], frontier: borders.frontier }]])
  // File each group under its level (a negative one counts as 0), opening a bucket for a new level.
  for (const group of borders.between) {
    const level = Math.max(0, levelFor(group.pair))
    const bucket = byLevel.get(level)
    if (bucket) bucket.between.push(group)
    else byLevel.set(level, { between: [group], frontier: [] })
  }
  return byLevel
}

/**
 * Draw the line work as one composed layer per level.
 *
 * Levels are drawn in ascending order and their passes numbered on from one another, so with depth testing
 * off a deeper level's line still lands above a shallower one's, as one layer's later passes do.
 * @param strokesByLevel - each level's passes, in draw order within it
 * @param options - projection and depth behaviour, shared by every level
 * @param blurMethod - how the map's blurs are drawn (ATLAS-304)
 * @returns the layer handle
 */
export function createLevelledBorderLayer(
  strokesByLevel: ReadonlyMap<number, readonly ComposedStroke[]>,
  options: ComposedLineLayerOptions,
  blurMethod: BlurMethod
): LevelledBorderLayer {
  const object = new Group()
  const levels = new Map<number, ComposedLineLayer>()
  // The blur, at the line work's rank: off until the frame sets its reach.
  const blur = blurMethod.create(object, {
    layer: BORDER_BLUR_LAYER,
    renderOrder: options.renderOrderBase ?? 0,
    blend: 'normal',
  })
  // One composed layer per level, shallowest first, its draw order following the level before.
  let renderOrderBase = options.renderOrderBase ?? 0
  for (const [level, strokes] of [...strokesByLevel].sort((a, b) => a[0] - b[0])) {
    const drawn = strokes.filter((stroke) => stroke.segments.length > 0)
    if (drawn.length === 0) continue
    const layer = createComposedLineLayer(drawn, { ...options, renderOrderBase })
    renderOrderBase += drawn.length
    levels.set(level, layer)
    object.add(layer.object)
  }
  object.add(blur.object)
  // The handle: setters shared by every level, and the fade by detail that tells the levels apart.
  return {
    object,
    levels,
    ...sharedSetters(levels),
    setDetail(detail: number): void {
      for (const [level, layer] of levels) layer.setFade(levelOpacity(detail, level))
    },
    setBlur(pixels: number): void {
      blur.setRadius(pixels)
    },
    dispose(): void {
      for (const layer of levels.values()) {
        object.remove(layer.object)
        layer.dispose()
      }
      levels.clear()
      object.remove(blur.object)
      blur.dispose()
    },
  }
}

/**
 * The setters every level takes alike — the frame loop's thinning, easing and dashing, handed on.
 * @param levels - each level's layer
 * @returns those setters, over every level
 */
function sharedSetters(
  levels: ReadonlyMap<number, ComposedLineLayer>
): Pick<
  LevelledBorderLayer,
  'setResolution' | 'setWidthScale' | 'setCloseness' | 'setOpacityScale' | 'setDashScale'
> {
  // Apply one call to every level's layer.
  const each = (call: (layer: ComposedLineLayer) => void): void => {
    for (const layer of levels.values()) call(layer)
  }
  return {
    setResolution(width: number, height: number): void {
      each((layer) => {
        layer.setResolution(width, height)
      })
    },
    setWidthScale(scale: number, patternScale?: number): void {
      each((layer) => {
        layer.setWidthScale(scale, patternScale)
      })
    },
    setCloseness(closeness: number): void {
      each((layer) => {
        layer.setCloseness(closeness)
      })
    },
    setOpacityScale(scale: number): void {
      each((layer) => {
        layer.setOpacityScale(scale)
      })
    },
    setDashScale(scale: number): void {
      each((layer) => {
        layer.setDashScale(scale)
      })
    },
  }
}
