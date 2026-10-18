/**
 * Finding the borders in a document by counting who holds each edge.
 *
 * **The dev's derivation, 2026-09-27**: two paths running over the same anchors are two owners of one
 * limit, so the border *is* that shared run. The primitive is not the run but the **edge** — one pair of
 * consecutive anchors — because a run is what you get by chaining edges that have the same owners, and a
 * tripoint ends a chain by itself when the owner set changes there.
 *
 * Why this beats deriving from the rasterised fills, which is what the atlas has to do: the shared run is
 * the authored geometry itself, so the line comes out **exact**, at the anchors' own precision, instead of
 * on cell edges one 1.9 km step high. It also takes the ~825 ms rasterise out of the path between closing a
 * ring and seeing its border.
 *
 * Pure combinatorics over integers — no coordinates are read here at all, which is why it can be exercised
 * entirely with literals. What an edge *separates* is a different question, answered in `derivedBorders.ts`
 * with the land mask and an inclusion test.
 */

import { MIN_RING_ANCHORS } from './yearDocument'

import type { YearDocument } from './yearDocument'

/** One boundary edge: a pair of consecutive anchors, and every path holding it. */
export interface BorderEdge {
  /** The lower anchor index — the pair is unordered, so it is stored sorted. */
  low: number
  /** The higher anchor index. */
  high: number
  /**
   * The polities whose rings run over this edge, each once, in the order the document lists them.
   *
   * One owner is a limit against something that is not a claim — the sea, unclaimed ground, or a polity
   * whose ring merely *encloses* it without sharing a point. Two is the peer case, named with no further
   * question. Three or more is a vassal whose own limit coincides with its lord's.
   */
  owners: string[]
}

/** A maximal chain of edges with the same owners: one border, as a run of anchor indices. */
export interface BorderRun {
  /** The anchors it runs over, in order along the line. */
  run: number[]
  /** Who holds it. Same contract as {@link BorderEdge.owners}. */
  owners: string[]
}

/**
 * The key an edge is grouped by. Sorted, so a ring walked either way yields the same edge.
 * @param a - one end's anchor index
 * @param b - the other end's anchor index
 * @returns `low:high`, the same whichever end comes first
 */
function edgeKey(a: number, b: number): string {
  return a < b ? `${String(a)}:${String(b)}` : `${String(b)}:${String(a)}`
}

/**
 * The key an owner set is grouped by, so two edges of the same border chain together.
 * @param owners - the ids of the polities holding an edge, in any order
 * @returns the ids sorted and joined with `|`, the same whatever their order
 */
function ownersKey(owners: readonly string[]): string {
  return [...owners].sort().join('|')
}

/**
 * Every edge of every claim, with the polities holding it.
 *
 * A ring's closure is implied, so the last vertex joins back to the first and that edge counts like any
 * other — a boundary that stopped one segment short of closing would leave a gap nobody drew.
 *
 * **Declared gaps and dressed runs are not owners.** A `deliberateGaps` ring is unclaimed ground by
 * definition, and a run override is dress rather than a claim; counting either as an owner would invent a
 * border with a polity that does not exist.
 * @param doc - the document to read
 * @returns the edges, keyed so callers can look one up
 */
export function collectBorderEdges(doc: YearDocument): Map<string, BorderEdge> {
  const edges = new Map<string, BorderEdge>()
  for (const claim of doc.claims) {
    for (const ring of claim.rings) {
      if (ring.length < MIN_RING_ANCHORS) continue
      for (let i = 0; i < ring.length; i += 1) {
        const a = ring[i]
        const b = ring[(i + 1) % ring.length]
        if (a === undefined || b === undefined || a === b) continue
        const key = edgeKey(a, b)
        const found = edges.get(key)
        if (found === undefined)
          edges.set(key, { low: Math.min(a, b), high: Math.max(a, b), owners: [claim.polity] })
        else if (!found.owners.includes(claim.polity)) found.owners.push(claim.polity)
      }
    }
  }
  return edges
}

/** Where each anchor's edges of one owner set can be found. */
type Adjacency = Map<number, string[]>

/**
 * Build the vertex-to-edges index for one owner set.
 * @param edges - the edges sharing one owner set
 * @returns for each anchor index touched, the keys of the edges meeting there
 */
function adjacencyOf(edges: readonly BorderEdge[]): Adjacency {
  const at: Adjacency = new Map()
  for (const edge of edges) {
    for (const vertex of [edge.low, edge.high]) {
      const list = at.get(vertex)
      if (list) list.push(edgeKey(edge.low, edge.high))
      else at.set(vertex, [edgeKey(edge.low, edge.high)])
    }
  }
  return at
}

/**
 * Walk one direction from a vertex, consuming edges, until the chain has nowhere unambiguous to go.
 * @param from - the vertex to walk away from
 * @param at - the vertex-to-edges index for this owner set
 * @param byKey - the edges of this owner set, by key
 * @param used - the keys already taken, mutated
 * @returns the anchors walked through, `from` excluded
 */
function walkFrom(
  from: number,
  at: Adjacency,
  byKey: Map<string, BorderEdge>,
  used: Set<string>
): number[] {
  const walked: number[] = []
  let vertex = from
  for (;;) {
    const here = at.get(vertex) ?? []
    // More than two edges of the same owners meeting at one point is a pinch, and there is no
    // non-arbitrary way to continue through it. Stopping makes two runs rather than one wrong one.
    if (here.length > 2) return walked
    const nextKey = here.find((key) => !used.has(key))
    if (nextKey === undefined) return walked
    const edge = byKey.get(nextKey)
    if (edge === undefined) return walked
    used.add(nextKey)
    vertex = edge.low === vertex ? edge.high : edge.low
    walked.push(vertex)
  }
}

/**
 * Chain the edges into maximal runs, one per stretch of border with the same owners.
 *
 * A tripoint needs no special case: the owner set changes there, so the chain simply ends. That is the
 * property that makes edges the right primitive.
 * @param edges - the edges, as {@link collectBorderEdges} returns them
 * @returns one run per border stretch
 */
export function chainBorderRuns(edges: ReadonlyMap<string, BorderEdge>): BorderRun[] {
  const groups = new Map<string, BorderEdge[]>()
  for (const edge of edges.values()) {
    const key = ownersKey(edge.owners)
    const group = groups.get(key)
    if (group) group.push(edge)
    else groups.set(key, [edge])
  }

  const runs: BorderRun[] = []
  for (const group of groups.values()) {
    const byKey = new Map(group.map((edge) => [edgeKey(edge.low, edge.high), edge]))
    const at = adjacencyOf(group)
    const used = new Set<string>()
    for (const edge of group) {
      const key = edgeKey(edge.low, edge.high)
      if (used.has(key)) continue
      used.add(key)
      const forward = walkFrom(edge.high, at, byKey, used)
      const backward = walkFrom(edge.low, at, byKey, used)
      runs.push({
        run: [...backward.reverse(), edge.low, edge.high, ...forward],
        owners: [...edge.owners],
      })
    }
  }
  return runs
}

/**
 * Every border stretch in a document, as runs of anchors with their owners.
 * @param doc - the document to read
 * @returns the runs
 */
export function borderRunsOf(doc: YearDocument): BorderRun[] {
  return chainBorderRuns(collectBorderEdges(doc))
}
