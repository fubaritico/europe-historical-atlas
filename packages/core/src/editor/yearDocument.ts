/**
 * The Cartographer's document: one year, open for editing.
 *
 * **One invariant carries the whole model: the anchor table is append-only while a document is open.**
 * Nothing is ever spliced out of it, because an anchor's id *is* its index and every ring is a list of
 * those indices — removing one would shift thousands of references, and a single missed rewrite is a
 * border that quietly moved. An anchor no ring holds any more is simply unreferenced; it disappears when
 * the document is saved, where the renumbering happens once, in one function, with a test on it.
 *
 * What that buys, and it is the reason the invariant is written first: **deleting a polity removes its
 * claim and never a point.** Its coastline anchors are its neighbour's too, and deleting them would move a
 * border nobody touched — the sliver, arriving from the least suspicious gesture in the editor
 * (`files/plans/cartographer/scenarii/s05-derive-a-year.md`, the one blocking vulnerability).
 *
 * Mutable on purpose. The history manager takes a snapshot per gesture rather than replaying commands, so
 * the document is edited in place and copied whole — decided for the reason recorded in the glossary: a
 * command that knows how to undo itself corrupts the history silently when it is wrong.
 */

import type { YearFiles } from '../data/yearConsistency'
import type {
  AuthoredYear,
  DeliberateGap,
  PairBorder,
  RunBorder,
  YearClaim,
  YearPolity,
  YearProvenance,
} from '../data/yearFormat'
import type { GeoBounds } from '../geo/mercator'

/** A year being edited. Flat on purpose: the three files are a storage layout, not a working one. */
export interface YearDocument {
  /** The year being drawn. */
  year: number
  /** The window the author works in, distinct from the render frame. */
  editorialZone: GeoBounds
  /** Where geometry may be said to come from. */
  sources: YearProvenance[]
  /**
   * Every point, once. **An anchor's id is its index, and this array only ever grows while open.**
   */
  anchors: [number, number][]
  /** Which source each anchor came from. Parallel to {@link anchors}. */
  anchorSource: number[]
  /** Who exists this year. */
  polities: YearPolity[]
  /** What each of them holds, as rings of anchor indices. */
  claims: YearClaim[]
  /** Ground left unclaimed on purpose. */
  deliberateGaps: DeliberateGap[]
  /** Borders dressed by pair of polities. */
  pairs: PairBorder[]
  /** Borders dressed by run of anchors, which wins over a pair. */
  runs: RunBorder[]
}

/**
 * An empty document — a year with nothing in it, which is how a year authored from scratch starts.
 * @param year - the year being drawn
 * @param editorialZone - the window to work in
 * @param sources - where geometry may be said to come from
 * @returns the document
 */
export function createYearDocument(
  year: number,
  editorialZone: GeoBounds,
  sources: YearProvenance[] = []
): YearDocument {
  return {
    year,
    editorialZone,
    sources,
    anchors: [],
    anchorSource: [],
    polities: [],
    claims: [],
    deliberateGaps: [],
    pairs: [],
    runs: [],
  }
}

/**
 * Open a year that was read off disk.
 *
 * Everything is copied rather than aliased: a document is edited in place, and holding the parsed payload's
 * own arrays would mean an edit reaching back into what the reader returned.
 * @param authored - the year, already cross-checked
 * @returns the document, ready to edit
 */
export function openYearDocument(authored: AuthoredYear): YearDocument {
  return {
    year: authored.year,
    editorialZone: { ...authored.polities.editorialZone },
    sources: authored.polities.sources.map((provenance) => ({ ...provenance })),
    anchors: authored.polities.anchors.map(([lon, lat]) => [lon, lat]),
    anchorSource: [...authored.polities.anchorSource],
    polities: authored.registry.polities.map((polity) => ({ ...polity })),
    claims: authored.polities.claims.map((claim) => ({
      polity: claim.polity,
      rings: claim.rings.map((ring) => [...ring]),
    })),
    deliberateGaps: authored.polities.deliberateGaps.map((gap) => ({
      ring: [...gap.ring],
      reason: gap.reason,
    })),
    pairs: authored.borders.pairs.map((pair) => ({ ...pair, between: [...pair.between] })),
    runs: authored.borders.runs.map((run) => ({ ...run, run: [...run.run] })),
  }
}

/**
 * Every anchor index something still points at.
 *
 * A **run override counts as a reference**, deliberately: a hand-set stroke is a decision, and dropping the
 * points under it on save would undo that decision without telling anyone — which
 * [s13](../../../files/plans/cartographer/scenarii/s13-overrides.md) forbids. An override left over a
 * deleted border shows in its panel as orphaned, and is cleared by hand.
 * @param doc - the document
 * @returns the set of live indices
 */
export function referencedAnchors(doc: YearDocument): Set<number> {
  const live = new Set<number>()
  for (const claim of doc.claims) for (const ring of claim.rings) for (const i of ring) live.add(i)
  for (const gap of doc.deliberateGaps) for (const i of gap.ring) live.add(i)
  for (const run of doc.runs) for (const i of run.run) live.add(i)
  return live
}

/** A dense anchor table and the mapping from the open document's indices onto it. */
interface CompactedAnchors {
  /** The points, in their original order, minus the ones nothing holds. */
  anchors: [number, number][]
  /** Their provenances, parallel. */
  anchorSource: number[]
  /** Old index to new. An index absent from it was unreferenced and is gone. */
  remap: Map<number, number>
}

/**
 * Renumber the anchor table so it is dense again, keeping the original order.
 *
 * **The one place an index changes.** Order is preserved so a saved file diffs readably against the one
 * before it, which matters because a year is corrected by hand over months.
 * @param doc - the document being saved
 * @returns the dense table and the mapping onto it
 */
function compactAnchors(doc: YearDocument): CompactedAnchors {
  const live = referencedAnchors(doc)
  const remap = new Map<number, number>()
  const anchors: [number, number][] = []
  const anchorSource: number[] = []
  for (let index = 0; index < doc.anchors.length; index += 1) {
    if (!live.has(index)) continue
    const anchor = doc.anchors[index]
    if (anchor === undefined) continue
    remap.set(index, anchors.length)
    anchors.push([anchor[0], anchor[1]])
    anchorSource.push(doc.anchorSource[index] ?? 0)
  }
  return { anchors, anchorSource, remap }
}

/**
 * Save a document, with every reference rewritten through one mapping.
 * @param doc - the document to save
 * @returns the three files, ready to write
 */
export function saveYearDocument(doc: YearDocument): YearFiles {
  const { anchors, anchorSource, remap } = compactAnchors(doc)

  /** Rewrite a list of indices, dropping any the mapping does not know. */
  const rewrite = (indices: readonly number[]): number[] => {
    const out: number[] = []
    for (const index of indices) {
      const moved = remap.get(index)
      if (moved !== undefined) out.push(moved)
    }
    return out
  }

  return {
    registry: {
      version: 1,
      year: doc.year,
      polities: doc.polities.map((polity) => ({ ...polity })),
    },
    polities: {
      version: 1,
      year: doc.year,
      editorialZone: { ...doc.editorialZone },
      sources: doc.sources.map((provenance) => ({ ...provenance })),
      anchors,
      anchorSource,
      claims: doc.claims.map((claim) => ({
        polity: claim.polity,
        rings: claim.rings.map(rewrite).filter((ring) => ring.length >= 3),
      })),
      deliberateGaps: doc.deliberateGaps
        .map((gap) => ({ ring: rewrite(gap.ring), reason: gap.reason }))
        .filter((gap) => gap.ring.length >= 3),
    },
    borders: {
      version: 1,
      year: doc.year,
      pairs: doc.pairs.map((pair) => ({ ...pair, between: [...pair.between] })),
      runs: doc.runs
        .map((run) => ({ ...run, run: rewrite(run.run) }))
        .filter((run) => run.run.length >= 2),
    },
  }
}
