import { hexToRgb } from '../utils/color'

import { collectBorderEdges } from './borderGraph'
import { chooseColorSlots } from './regionRaster'
import { openYearDocument } from './yearDocument'
import { isUncoloured } from './yearFormat'

import type { HomageLevels } from './homageLevels'
import type { Region } from './regionSource'
import type { YearDocument } from './yearDocument'
import type { AuthoredYear } from './yearFormat'
import type { RgbColor } from '../utils/color'

/**
 * The colour each polity of a document is painted in — its own when the author pinned one, otherwise a
 * palette slot none of its neighbours uses (`s02`: *"explicit when given, palette-by-adjacency
 * otherwise"*), and none at all when the author chose `none` (CARTO-445).
 *
 * **Neighbours are read off the shared anchors, not off a raster.** The atlas finds adjacency by scanning
 * a rasterised grid, which costs about 825 ms a year (`H-08`); a document already says who touches whom,
 * exactly, through the edges two rings run over together. Same greedy choice as the atlas
 * (`chooseColorSlots`), so the two applications agree on what "automatic" means.
 *
 * **What it does not read**: the atlas's name rules (`REGION_COLOR_RULES`). An authored year carries its
 * pins in `colour`, which the polity form sets; a name matching "France" is not a pin here.
 */

/**
 * Who touches whom, by polity index: two polities are neighbours when their rings share an edge.
 * @param doc - the document to read
 * @returns one set of neighbour indices per polity, parallel to `doc.polities`
 */
export function polityNeighbours(doc: YearDocument): Set<number>[] {
  const indexOf = new Map(doc.polities.map((polity, index) => [polity.id, index]))
  const neighbours = doc.polities.map(() => new Set<number>())
  for (const edge of collectBorderEdges(doc).values()) {
    const owners = edge.owners.map((id) => indexOf.get(id)).filter((index) => index !== undefined)
    for (const a of owners) for (const b of owners) if (a !== b) neighbours[a]?.add(b)
  }
  return neighbours
}

/**
 * Every polity's colour, by id — **an uncoloured polity has none** (CARTO-445): it takes no palette slot, as a pinned
 * one does not, and every painter skips a polity the map leaves out.
 * @param doc - the document to read
 * @param palette - the automatic palette, in preference order; never empty, which the type holds
 * @returns the `#rrggbb` each coloured polity is painted in
 */
export function polityColours(
  doc: YearDocument,
  palette: readonly [string, ...string[]]
): Map<string, string> {
  const slots = chooseColorSlots(
    polityNeighbours(doc),
    // Any colour the author set takes no slot — a pin, and `none` too (CARTO-445), on purpose: an uncoloured polity
    // never pushes a neighbour off the slot it would have had.
    doc.polities.map((polity) => polity.colour !== null),
    palette.length
  )
  const coloured = doc.polities.flatMap((polity, index) =>
    isUncoloured(polity.colour) ? [] : [{ polity, index }]
  )
  // The two `??` are for the type checker, not for a case: `chooseColorSlots` fills every slot with an
  // index below `palette.length`, and the array is as long as the polities.
  return new Map(
    coloured.map(({ polity, index }) => [
      polity.id,
      polity.colour ?? palette[slots[index] ?? 0] ?? palette[0],
    ])
  )
}

/**
 * The polities drawn with no fill (CARTO-445), by id.
 * @param polities - a year's polities
 * @returns the ids of those whose colour is `none`
 */
export function uncolouredIds(
  polities: readonly { id: string; colour: string | null }[]
): Set<string> {
  return new Set(polities.filter((polity) => isUncoloured(polity.colour)).map(({ id }) => id))
}

/**
 * The colour of each region of an authored year as the atlas receives it — the Cartographer's, polity by
 * polity, so the map the author published is painted as the one they drew.
 * @param authored - the year's three files
 * @param regions - the regions the atlas draws, each carrying the id of its polity
 * @param palette - the automatic palette, never empty — the atlas's live one, whose defaults are the
 *   Cartographer's
 * @returns one colour per region, in the regions' order — `null` for an uncoloured polity's (CARTO-445)
 * @throws when a region names no polity of the year — the adapter gives every region its id, so a miss is a
 *   defect, and a colour guessed for it would paint a polity in a neighbour's
 */
export function authoredRegionColours(
  authored: AuthoredYear,
  regions: readonly Pick<Region, 'polityId'>[],
  palette: readonly [string, ...string[]]
): (RgbColor | null)[] {
  const byId = polityColours(openYearDocument(authored), palette)
  const uncoloured = uncolouredIds(authored.registry.polities)
  return regions.map((region, index) => colourOfRegion(byId, uncoloured, region.polityId, index))
}

/**
 * The colour of each region at every display level of homage (ATLAS-253) — level `k` paints a region in
 * the colour of its polity's ancestor at depth `min(k, depth)` (`homageLevels`), so from afar a vassal
 * wears its suzerain's colour, and a sub-vassal its direct suzerain's before its own.
 *
 * **It takes the colours, it does not derive them**: the atlas derives `polityColours` once per year and
 * hands the same map to this and to the tribes' colours, so the neighbour graph is not walked twice.
 *
 * **The last level is {@link authoredRegionColours}, exactly**, when handed `polityColours` of the same year
 * over the same palette — the atlas fully zoomed in shows what it showed before levels.
 * **An uncoloured polity leaves a region unpainted at every level it is worn** (CARTO-445): its own region close up,
 * and its vassals' from afar, while they wear its colour.
 * @param colours - every coloured polity's colour, by id — `polityColours` of the year
 * @param uncoloured - the polities drawn with no fill — `uncolouredIds` of the year
 * @param regions - the regions the atlas draws, each carrying the id of its polity
 * @param homage - the year's homage read as levels, shared with the borders so a loop is said once
 * @returns one list per level, level 0 first and `homage.deepest` last, each one colour per region, `null` unpainted
 * @throws when a region names no polity of the year, as {@link authoredRegionColours} does
 */
export function authoredTintLevels(
  colours: ReadonlyMap<string, string>,
  uncoloured: ReadonlySet<string>,
  regions: readonly Pick<Region, 'polityId'>[],
  homage: HomageLevels
): (RgbColor | null)[][] {
  const levels: (RgbColor | null)[][] = []
  for (let level = 0; level <= homage.deepest; level += 1)
    levels.push(
      regions.map((region, index) => {
        const own = region.polityId
        return colourOfRegion(
          colours,
          uncoloured,
          own === undefined ? own : homage.ancestorAt(own, level),
          index
        )
      })
    )
  return levels
}

/**
 * One region's colour, looked up by the polity it is painted as.
 * @param byId - every coloured polity's colour
 * @param uncoloured - the polities drawn with no fill
 * @param polity - the polity the region is painted as, `undefined` when it carries none
 * @param index - the region's index, for the message
 * @returns the colour, `null` for an uncoloured polity
 * @throws when the polity has no colour and is not uncoloured — a region naming no polity of the year
 */
function colourOfRegion(
  byId: ReadonlyMap<string, string>,
  uncoloured: ReadonlySet<string>,
  polity: string | undefined,
  index: number
): RgbColor | null {
  if (polity !== undefined && uncoloured.has(polity)) return null
  const colour = polity === undefined ? undefined : byId.get(polity)
  if (colour === undefined)
    throw new Error(
      `[atlas] region ${String(index)} names no polity of the year (${String(polity)})`
    )
  return hexToRgb(colour)
}
