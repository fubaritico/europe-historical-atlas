/**
 * An authored year written as its three files would hold it — France, its vassal Aquitaine drawn inside it, and a
 * square of four anchors they share. Shared by the suites that read a year without editing it (`toRegionPayload`, the
 * settling of `pipeline/settleYear`), so none keeps a copy that could drift.
 */

import type { AuthoredYear } from '../yearFormat'

/**
 * The year's registry: the Kingdom of France, and the Duchy of Aquitaine its vassal.
 * @returns the registry, a new object at each call
 */
function registry(): AuthoredYear['registry'] {
  return {
    version: 1,
    year: 1100,
    polities: [
      {
        id: 'fr-couronne',
        name: 'Reaume de France',
        rank: 'kingdom',
        status: 'country',
        suzerain: null,
        existsFrom: 987,
        existsTo: null,
        colour: null,
        wikidata: null,
      },
      {
        id: 'aquitaine',
        name: 'Duché d’Aquitaine',
        rank: 'duchy',
        status: null,
        suzerain: 'fr-couronne',
        existsFrom: 1058,
        existsTo: null,
        colour: null,
        wikidata: null,
      },
    ],
  }
}

/**
 * France and its vassal Aquitaine, in 1100 — a new object at each call, so a test may change it.
 * @returns the year
 */
export function franceAndAquitaine(): AuthoredYear {
  return {
    year: 1100,
    registry: registry(),
    polities: {
      version: 1,
      year: 1100,
      sources: [{ id: 0, name: 'Natural Earth 10m coastline', licence: 'public domain' }],
      anchors: [
        [0, 48],
        [2, 48],
        [2, 46],
        [0, 46],
      ],
      anchorSource: [0, 0, 0, 0],
      claims: [
        // The vassal first on purpose: a reader must reorder, not trust file order.
        { polity: 'aquitaine', rings: [[0, 1, 2]] },
        { polity: 'fr-couronne', rings: [[0, 1, 2, 3]] },
      ],
      deliberateGaps: [],
    },
    borders: { version: 1, year: 1100, pairs: [], runs: [] },
  }
}
