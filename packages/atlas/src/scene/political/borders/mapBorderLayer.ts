/**
 * How the political line work is put on the map: each border group's pattern and split level, its strokes, and
 * the layer that holds them.
 */

import { borderPatternFor } from '@europe-historical-atlas/core/data/borderStyles'
import { pairKey } from '@europe-historical-atlas/core/editor/atlasBorders'

import { disposeHandle } from '../../layers/disposeHandle'
import { DRAPED_DEPTH_BIAS } from '../../lines/lineLayer'

import { buildBorderStrokes } from './borderStrokes'
import { createLevelledBorderLayer, splitBordersByLevel } from './levelledBorderLayer'

import type { DevState } from '../../../tunables/devState'
import type { LayerContext } from '../../layers/layerContext'
import type { BorderPattern } from '@europe-historical-atlas/core/data/borderStyles'

/**
 * Draw order of the political line work. It only matters once `borderOnTop` switches depth testing off:
 * with no depth to arbitrate, this is the sole thing keeping a core stroke above its own edging.
 */
export const BORDER_RENDER_ORDER = 10

/**
 * How a border group is drawn: its hand when the year is authored, else looked up by name in the editorial
 * style table.
 * @param context - the layers and what they read
 * @param pair - the two region indices the stretch separates
 * @returns the drawing pattern
 * @throws when an authored year has no pattern for a group — every group is filed with one, so a miss is a
 *   defect, said rather than drawn in a pattern nobody chose
 */
export function patternForPair(
  context: LayerContext,
  pair: readonly [number, number]
): BorderPattern {
  // An authored year files a pattern for every group: read it there.
  const authored = context.sources.borderPatterns
  if (authored !== null) {
    const pattern = authored.get(pairKey(pair))
    if (pattern === undefined)
      throw new Error(`[atlas] no pattern filed for the border group ${pairKey(pair)}`)
    return pattern
  }
  // A payload year: look the pattern up by the two regions' names.
  const regions = context.sources.regionSet?.regions
  if (!regions) return 'solid'
  return borderPatternFor(regions[pair[0]]?.name ?? null, regions[pair[1]]?.name ?? null)
}

/**
 * The split level of a border group (ATLAS-253): the one its year filed when it is authored, else 0 — a
 * payload year carries no homage, and every one of its lines shows at every zoom.
 * @param context - the layers and what they read
 * @param pair - the group's two indices
 * @returns the split level
 * @throws when an authored year has no level for a group — every group is filed with one, so a miss is a
 *   defect, said rather than drawn at a level nobody chose
 */
export function levelForPair(context: LayerContext, pair: readonly [number, number]): number {
  const authored = context.sources.borderLevels
  if (authored === null) return 0
  const level = authored.get(pairKey(pair))
  if (level === undefined)
    throw new Error(`[atlas] no split level filed for the border group ${pairKey(pair)}`)
  return level
}

/**
 * Redraw the political line work from the borders the compute derived.
 *
 * Derived from the fills, a border *is* their boundary — it cannot disagree with the colour and it
 * cannot be interrupted. The tracing happens in the compute, beside the grid it reads; what is kept here
 * is its result, so restyling a stroke redraws without re-tracing anything.
 * @param context - the layers and what they read
 * @returns nothing
 */
export function rebuildBorders(context: LayerContext): void {
  const { scene, dev, sources, handles, projection } = context
  // Clear the line work on screen; nothing is redrawn without derived borders or with borders off.
  disposeHandle(scene, handles.borders)
  handles.borders = null
  if (!sources.derivedBorders || !dev.political.showBorders) return
  // Sort the borders by split level, then dress each level's lines in its passes.
  const style = borderStrokeStyle(dev)
  const byLevel = splitBordersByLevel(sources.derivedBorders, (pair) => levelForPair(context, pair))
  const strokesByLevel = new Map(
    [...byLevel].map(([level, borders]) => [
      level,
      // Past the sovereigns' level, the borders lie between vassals: one parchment line.
      buildBorderStrokes(borders, style, (pair) => patternForPair(context, pair), level > 0),
    ])
  )
  // Every level came out empty: no layer to build.
  if ([...strokesByLevel.values()].every((strokes) => strokes.length === 0)) return
  // One composed layer per level, draped on the relief, its depth test and dashes from the panel.
  handles.borders = createLevelledBorderLayer(strokesByLevel, {
    project: projection.draped,
    split: projection.split,
    depthBias: DRAPED_DEPTH_BIAS,
    depthTest: !dev.political.borderOnTop,
    renderOrderBase: BORDER_RENDER_ORDER,
    dashSize: dev.political.borderDashSize,
    gapSize: dev.political.borderDashGap,
  })
  // Fat lines are sized in screen pixels, so give them the viewport before showing the layer.
  handles.borders.setResolution(window.innerWidth, window.innerHeight)
  scene.add(handles.borders.object)
}

/**
 * How the border strokes are dressed, gathered from the live tunables.
 * @param dev - the live tunables
 * @returns the stroke style
 */
function borderStrokeStyle(dev: DevState): Parameters<typeof buildBorderStrokes>[1] {
  return {
    coreColor: dev.political.borderColor,
    coreWidth: dev.political.borderWidth,
    edgeColor: dev.political.borderEdgeColor,
    edgeWidth: dev.political.borderEdgeWidth,
    opacity: dev.political.borderOpacity,
    showFrontier: dev.political.showFrontier,
    frontierColor: dev.political.frontierColor,
    frontierWidth: dev.political.frontierWidth,
    frontierOpacity: dev.political.frontierOpacity,
    parchmentColor: dev.political.borderParchmentColor,
    farWidth: dev.political.borderFarWidth,
    frontierFarWidth: dev.political.frontierFarWidth,
    frontierSideGap: dev.political.frontierSideGap,
    frontierSideWidth: dev.political.frontierSideWidth,
    frontierFadeShare: dev.political.frontierFadeShare,
    vassalColor: dev.political.vassalBorderColor,
    vassalWidth: dev.political.vassalBorderWidth,
    vassalDotSize: dev.political.vassalDotSize,
    vassalDotGap: dev.political.vassalDotGap,
    dashSize: dev.political.borderDashSize,
    gapSize: dev.political.borderDashGap,
    doubleGap: dev.political.borderDoubleGap,
  }
}
