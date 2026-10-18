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

import { createComposedLineLayer } from './composedLineLayer'
import { levelOpacity } from './homageReveal'

import type {
  ComposedLineLayer,
  ComposedLineLayerOptions,
  ComposedStroke,
} from './composedLineLayer'
import type { RegionBorders } from '@europe-historical-atlas/core/data/regionBorders'

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
  const byLevel = new Map<number, RegionBorders>([[0, { between: [], frontier: borders.frontier }]])
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
 * @returns the layer handle
 */
export function createLevelledBorderLayer(
  strokesByLevel: ReadonlyMap<number, readonly ComposedStroke[]>,
  options: ComposedLineLayerOptions
): LevelledBorderLayer {
  const object = new Group()
  const levels = new Map<number, ComposedLineLayer>()
  let renderOrderBase = options.renderOrderBase ?? 0
  for (const [level, strokes] of [...strokesByLevel].sort((a, b) => a[0] - b[0])) {
    const drawn = strokes.filter((stroke) => stroke.segments.length > 0)
    if (drawn.length === 0) continue
    const layer = createComposedLineLayer(drawn, { ...options, renderOrderBase })
    renderOrderBase += drawn.length
    levels.set(level, layer)
    object.add(layer.object)
  }
  return {
    object,
    levels,
    ...sharedSetters(levels),
    setDetail(detail: number): void {
      for (const [level, layer] of levels) layer.setFade(levelOpacity(detail, level))
    },
    dispose(): void {
      for (const layer of levels.values()) {
        object.remove(layer.object)
        layer.dispose()
      }
      levels.clear()
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
  'setResolution' | 'setWidthScale' | 'setInlayOpacity' | 'setOpacityScale' | 'setDashScale'
> {
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
    setInlayOpacity(scale: number): void {
      each((layer) => {
        layer.setInlayOpacity(scale)
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
