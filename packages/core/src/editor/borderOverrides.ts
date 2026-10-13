import type { YearDocument } from './yearDocument'
import type { RunBorder } from '../data/yearFormat'

/**
 * The author's hand on the borders (`s13`): which segments a run override covers, and the edits that set,
 * replace or clear one.
 *
 * **The unit is the segment, two consecutive anchors.** The dev's gesture is a marquee — *"même si ça
 * sélectionne les points, ça sélectionne les lignes"* — so a style dresses the segments between selected
 * anchors, and half a border may be dotted and the other half not. A run override is stored as a run of
 * anchors (`format.md`), and read here back into its segments.
 */

/** A segment: two anchor indices, unordered. */
export type Segment = readonly [number, number]

/**
 * The key a segment is matched by, whichever way it is walked.
 * @param a - one end
 * @param b - the other
 * @returns the key
 */
export function segmentKey(a: number, b: number): string {
  return a < b ? `${String(a)}:${String(b)}` : `${String(b)}:${String(a)}`
}

/**
 * The segments of a run, as keys.
 * @param run - anchors in order
 * @returns one key per consecutive pair
 */
function keysOf(run: readonly number[]): string[] {
  const keys: string[] = []
  for (let at = 0; at + 1 < run.length; at += 1) {
    const a = run[at]
    const b = run[at + 1]
    if (a !== undefined && b !== undefined) keys.push(segmentKey(a, b))
  }
  return keys
}

/**
 * Which run override covers a segment — the **last** one listed, so a later style wins over an earlier one.
 * @param doc - the document
 * @param a - one end
 * @param b - the other
 * @returns the override's index in `doc.runs`, or `-1`
 */
export function coveringRun(doc: YearDocument, a: number, b: number): number {
  const key = segmentKey(a, b)
  for (let index = doc.runs.length - 1; index >= 0; index -= 1) {
    const override = doc.runs[index]
    if (override !== undefined && keysOf(override.run).includes(key)) return index
  }
  return -1
}

/**
 * Each anchor's neighbours along some segments — a segment from an anchor to itself, or given twice,
 * counted once or not at all.
 * @param segments - the segments
 * @returns the neighbours of every anchor that ends one
 */
function linksOf(segments: readonly Segment[]): Map<number, number[]> {
  const links = new Map<number, number[]>()
  const seen = new Set<string>()
  for (const [a, b] of segments) {
    const key = segmentKey(a, b)
    if (a === b || seen.has(key)) continue
    seen.add(key)
    links.set(a, [...(links.get(a) ?? []), b])
    links.set(b, [...(links.get(b) ?? []), a])
  }
  return links
}

/**
 * Cut a run into stretches of consecutive segments that carry the same label.
 * @param run - the anchors, in order
 * @param labels - one label per segment, `run.length - 1` of them
 * @param same - whether two labels go together
 * @returns each stretch's anchors (sharing its ends with its neighbours) and its label
 */
export function stretchesBy<T>(
  run: readonly number[],
  labels: readonly T[],
  same: (a: T, b: T) => boolean
): { run: number[]; label: T }[] {
  const out: { run: number[]; label: T }[] = []
  let start = 0
  for (let at = 1; at <= labels.length; at += 1) {
    // `start` is always a valid index here: it only takes values below `labels.length`.
    const label = labels[start] as T
    const next = labels[at]
    if (at < labels.length && next !== undefined && same(label, next)) continue
    out.push({ run: run.slice(start, at + 1), label })
    start = at
  }
  return out
}

/**
 * Chain loose segments into runs: each maximal path of segments sharing an end becomes one run.
 *
 * A fork — three segments at one anchor — ends the chains there, so no run ever has to choose a branch.
 * @param segments - the segments, in any order and either way round
 * @returns the runs, each at least two anchors
 */
export function chainSegments(segments: readonly Segment[]): number[][] {
  const links = linksOf(segments)
  const used = new Set<string>()
  const walk = (start: number, first: number): number[] => {
    const run = [start]
    let from = start
    let at = first
    for (;;) {
      used.add(segmentKey(from, at))
      run.push(at)
      const here = at
      const onward = (links.get(here) ?? []).filter((other) => !used.has(segmentKey(here, other)))
      // A fork or an end stops the chain, as does a loop coming back to where it began.
      const next = onward[0]
      if ((links.get(here)?.length ?? 0) !== 2 || next === undefined) break
      from = here
      at = next
    }
    return run
  }
  const runs: number[][] = []
  // Ends and forks first, so an open path is walked from one end; what remains is a closed loop.
  for (const pass of ['open', 'loop'] as const)
    for (const [anchor, others] of links) {
      if (pass === 'open' && others.length === 2) continue
      for (const other of others)
        if (!used.has(segmentKey(anchor, other))) runs.push(walk(anchor, other))
    }
  return runs.filter((run) => run.length >= 2)
}

/**
 * Remove some segments from every run override, keeping the rest of each as its own runs — same hand,
 * same source, same note.
 * @param doc - the document, edited in place
 * @param keys - the segments to take out
 */
function withoutSegments(doc: YearDocument, keys: ReadonlySet<string>): void {
  const kept: RunBorder[] = []
  for (const override of doc.runs) {
    const remaining: Segment[] = []
    for (let at = 0; at + 1 < override.run.length; at += 1) {
      const a = override.run[at]
      const b = override.run[at + 1]
      if (a !== undefined && b !== undefined && !keys.has(segmentKey(a, b))) remaining.push([a, b])
    }
    for (const run of chainSegments(remaining)) kept.push({ ...override, run })
  }
  doc.runs = kept
}

/**
 * Dress some segments with a hand — or clear their hand with `null` — as one stretch override each chain.
 *
 * **What was there keeps the rest of itself**: a segment already dressed by an older run is taken out of
 * it, and the older run's other segments keep their hand. Nothing else in the document moves.
 * @param doc - the document, edited in place
 * @param segments - the segments chosen, from the marquee
 * @param hand - the pattern to set, or `null` to give the segments back to the pair and the rule
 * @returns `false` when there was no segment to dress — and nothing happened
 */
export function dressSegments(
  doc: YearDocument,
  segments: readonly Segment[],
  hand: string | null
): boolean {
  const runs = chainSegments(segments)
  if (runs.length === 0) return false
  withoutSegments(doc, new Set(runs.flatMap(keysOf)))
  if (hand !== null) for (const run of runs) doc.runs.push({ run, hand, source: null, note: null })
  return true
}

/**
 * Dress the whole limit between two polities — or clear its hand with `null`.
 *
 * A pair entry also states what the limit **is** (`type`); clearing the hand keeps that fact, and an entry
 * left with nothing at all is removed.
 * @param doc - the document, edited in place
 * @param between - the two polities, either order
 * @param hand - the pattern to set, or `null`
 * @returns `false` when the two are the same polity — and nothing happened
 */
export function dressPair(
  doc: YearDocument,
  between: readonly [string, string],
  hand: string | null
): boolean {
  const [a, b] = between
  if (a === b) return false
  const at = doc.pairs.findIndex(
    (pair) =>
      (pair.between[0] === a && pair.between[1] === b) ||
      (pair.between[0] === b && pair.between[1] === a)
  )
  const existing = at >= 0 ? doc.pairs[at] : undefined
  if (existing === undefined) {
    if (hand !== null)
      doc.pairs.push({ between: [a, b], type: 'indefinite', hand, source: null, note: null })
    return true
  }
  const updated = { ...existing, hand }
  const empty =
    hand === null &&
    updated.type === 'indefinite' &&
    updated.source === null &&
    updated.note === null
  doc.pairs = empty
    ? doc.pairs.filter((_, index) => index !== at)
    : doc.pairs.map((pair, index) => (index === at ? updated : pair))
  return true
}

/**
 * Clear one override — `{Overrides}`' `[Clear]`.
 * @param doc - the document, edited in place
 * @param kind - a run override or a pair override
 * @param index - its index in `doc.runs` or `doc.pairs`
 * @returns `false` when there is no such override — and nothing happened
 */
export function clearOverride(doc: YearDocument, kind: 'run' | 'pair', index: number): boolean {
  const list = kind === 'run' ? doc.runs : doc.pairs
  if (index < 0 || index >= list.length) return false
  if (kind === 'run') doc.runs = doc.runs.filter((_, at) => at !== index)
  else doc.pairs = doc.pairs.filter((_, at) => at !== index)
  return true
}
