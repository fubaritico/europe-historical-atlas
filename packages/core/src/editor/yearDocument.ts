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

/**
 * The fewest anchors a ring can have — closure implied, so a triangle.
 *
 * Two anchors close onto a line with no interior: it paints nothing, derives no border and claims no
 * cell. **The one floor for the whole editor** — closing, drawing, duplicating, removing a point, saving,
 * and the Pen's closing offer — so no two of them can disagree on what a ring is (QUAL-002).
 */
export const MIN_RING_ANCHORS = 3

/** A year being edited. Flat on purpose: the three files are a storage layout, not a working one. */
export interface YearDocument {
  /** The year being drawn. */
  year: number
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
 *
 * **The sources are copied in**, like everything else in this file: held by reference, two documents built
 * from one caller's list would share it. The same hazard {@link cloneYearDocument} exists to close, one step
 * earlier.
 * @param year - the year being drawn
 * @param sources - where geometry may be said to come from
 * @returns the document
 */
export function createYearDocument(year: number, sources: YearProvenance[] = []): YearDocument {
  return {
    year,
    sources: sources.map((provenance) => ({ ...provenance })),
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
 * Copy a document, sharing nothing with the original.
 *
 * **The one place that knows the document's shape**, which is why opening a file goes through it too: a
 * field added to {@link YearDocument} and forgotten here would be *aliased* between copies rather than
 * copied — two snapshots quietly editing each other, with nothing to see on screen. One function to forget
 * it in, and one test walking the keys to say so.
 *
 * **What it preserves without trying, and it is the whole point of the format**: the sharing. An anchor held
 * by two rings is the same *integer* in two lists, not a shared object, so any honest copy keeps it. The one
 * implementation that loses it is the one that resolves rings back to coordinates — which is exactly what
 * `RegionPayload` does, and why the guarantee is asserted rather than assumed.
 * @param doc - the document to copy
 * @returns a copy that can be mutated without touching the original
 */
export function cloneYearDocument(doc: YearDocument): YearDocument {
  return {
    year: doc.year,
    sources: doc.sources.map((provenance) => ({ ...provenance })),
    anchors: doc.anchors.map(([lon, lat]) => [lon, lat]),
    anchorSource: [...doc.anchorSource],
    polities: doc.polities.map((polity) => ({ ...polity })),
    claims: doc.claims.map((claim) => ({
      polity: claim.polity,
      rings: claim.rings.map((ring) => [...ring]),
    })),
    deliberateGaps: doc.deliberateGaps.map((gap) => ({
      ring: [...gap.ring],
      reason: gap.reason,
    })),
    pairs: doc.pairs.map((pair) => ({ ...pair, between: [...pair.between] })),
    runs: doc.runs.map((run) => ({ ...run, run: [...run.run] })),
  }
}

/**
 * Open a year that was read off disk.
 *
 * Everything is copied rather than aliased: a document is edited in place, and holding the parsed payload's
 * own arrays would mean an edit reaching back into what the reader returned. The copying is
 * {@link cloneYearDocument}'s — the three files are flattened into the working shape by reference, and one
 * function does the copying for both callers.
 * @param authored - the year, already cross-checked
 * @returns the document, ready to edit
 */
export function openYearDocument(authored: AuthoredYear): YearDocument {
  return cloneYearDocument({
    year: authored.year,
    sources: authored.polities.sources,
    anchors: authored.polities.anchors,
    anchorSource: authored.polities.anchorSource,
    polities: authored.registry.polities,
    claims: authored.polities.claims,
    deliberateGaps: authored.polities.deliberateGaps,
    pairs: authored.borders.pairs,
    runs: authored.borders.runs,
  })
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
      sources: doc.sources.map((provenance) => ({ ...provenance })),
      anchors,
      anchorSource,
      claims: doc.claims.map((claim) => ({
        polity: claim.polity,
        rings: claim.rings.map(rewrite).filter((ring) => ring.length >= MIN_RING_ANCHORS),
      })),
      deliberateGaps: doc.deliberateGaps
        .map((gap) => ({ ring: rewrite(gap.ring), reason: gap.reason }))
        .filter((gap) => gap.ring.length >= MIN_RING_ANCHORS),
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
