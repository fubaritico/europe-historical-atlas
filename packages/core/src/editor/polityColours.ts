import { chooseColorSlots } from '../data/regionRaster'

import { collectBorderEdges } from './borderGraph'

import type { YearDocument } from './yearDocument'

/**
 * The colour each polity of a document is painted in — its own when the author pinned one, otherwise a
 * palette slot none of its neighbours uses (`s02`: *"explicit when given, palette-by-adjacency
 * otherwise"*).
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
 * Every polity's colour, by id.
 * @param doc - the document to read
 * @param palette - the automatic palette, in preference order; never empty, which the type holds
 * @returns the `#rrggbb` each polity is painted in
 */
export function polityColours(
  doc: YearDocument,
  palette: readonly [string, ...string[]]
): Map<string, string> {
  const slots = chooseColorSlots(
    polityNeighbours(doc),
    doc.polities.map((polity) => polity.colour !== null),
    palette.length
  )
  // The two `??` are for the type checker, not for a case: `chooseColorSlots` fills every slot with an
  // index below `palette.length`, and the array is as long as the polities.
  return new Map(
    doc.polities.map((polity, index) => [
      polity.id,
      polity.colour ?? palette[slots[index] ?? 0] ?? palette[0],
    ])
  )
}
