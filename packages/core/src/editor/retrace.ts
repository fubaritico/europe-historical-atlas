import { addAnchor, declareSource } from './documentEdits'
import { MIN_RING_ANCHORS } from './yearDocument'

import type { OutlinePoint } from './documentEdits'
import type { YearDocument } from './yearDocument'

/**
 * Retracing a stretch of a ring — `H-46`, the first correction tool (the dev, 2026-10-14): two anchors of
 * one of a polity's rings, and the stretch between them replaced by a new run of points.
 *
 * **Every ring that runs over the whole replaced stretch takes the new run**, a neighbour's and a
 * deliberate gap's alike, so a border two polities share stays one border (`H-06`) — never a second
 * geometry. **A ring that only touches it keeps its points** (the dev, 2026-10-14: *"c'est les Obotrites
 * qui comptent"*): the retrace corrects the polity aimed at, and a neighbour meeting the stretch at one of
 * its anchors is not edited for it — what that leaves between the two is visible, said, and corrected by
 * retracing that neighbour. The stretch's own anchors stay in the table, as every anchor does while editing;
 * nothing holding them any more, they leave the file at save.
 *
 * **Everything is checked before anything is written**, so a refused retrace leaves the document as it
 * was and no step behind it.
 */

/**
 * The two ways round a ring between two of its anchors, each as the anchors strictly between them, in the
 * order walked from `from` to `to`.
 */
export interface RetraceArcs {
  /** The ring both anchors lie on — the polity's own, live. */
  ring: readonly number[]
  /** Walking the ring in its stored order from `from` to `to`. */
  forward: number[]
  /** Walking it the other way. */
  backward: number[]
}

/**
 * The two stretches a retrace may replace: the first of the polity's rings holding both anchors.
 * @param doc - the document to read
 * @param polityId - whose ring
 * @param from - the anchor the retrace starts on
 * @param to - the anchor it ends on
 * @returns both arcs, or `null` when the two are the same anchor or no ring of the polity holds both
 */
export function retraceArcs(
  doc: YearDocument,
  polityId: string,
  from: number,
  to: number
): RetraceArcs | null {
  if (from === to) return null
  const claim = doc.claims.find((held) => held.polity === polityId)
  const ring = claim?.rings.find((each) => each.includes(from) && each.includes(to))
  if (ring === undefined) return null
  return { ring, forward: walk(ring, from, to, 1), backward: walk(ring, from, to, -1) }
}

/**
 * The anchors strictly between two of a ring, walked one way.
 * @param ring - the ring, closure implied
 * @param from - where the walk starts
 * @param to - where it stops
 * @param step - `1` along the stored order, `-1` against it
 * @returns the anchors between them, in walking order
 */
function walk(ring: readonly number[], from: number, to: number, step: 1 | -1): number[] {
  const between: number[] = []
  const count = ring.length
  for (let at = ring.indexOf(from) + step, guard = 0; guard < count; at += step, guard += 1) {
    const index = ring[((at % count) + count) % count]
    if (index === undefined || index === to) break
    between.push(index)
  }
  return between
}

/** Why a retrace was refused — every case a gesture can reach, so the tool can say which. */
export type RetraceRefusal =
  /** The two anchors are not on one ring of the polity — or are the same anchor. */
  | { kind: 'no-ring' }
  /** The stretch named is neither way round between them: the tool and the document disagree. */
  | { kind: 'not-an-arc' }
  /** A point names an anchor the document does not hold: the tool and the document disagree. */
  | { kind: 'bad-anchor' }
  /** A border dressed by hand runs over the stretch: replacing it would undo that stroke (`s13`). */
  | { kind: 'dressed-run' }
  /** The new run passes again through an anchor the ring keeps — the ring would touch itself there. */
  | { kind: 'loop'; polity: string | null }
  /** A ring would be left with fewer anchors than enclose an area. */
  | { kind: 'too-short'; polity: string | null }

/** A ring that runs over the stretch, and which way. */
export interface Follower {
  /** The ring, live — splicing it edits the document. */
  ring: number[]
  /** The polity holding it, or `null` for a deliberate gap. */
  polity: string | null
  /** `1` when it walks the stretch from `from` to `to` in its stored order, `-1` the other way. */
  step: 1 | -1
}

/** What a retrace's stretch holds, once checked: the rings that take the new run, and those that do not. */
export interface RetraceCheck {
  /** The rings that run over the whole stretch — the polity's own among them. */
  followers: Follower[]
  /** The other polities among them, each once — the neighbours that follow. */
  neighbours: string[]
  /**
   * The holders of rings that touch the stretch without running over all of it, each once — a polity's
   * id, or `null` for a deliberate gap. They keep their points; the tool says so.
   */
  untouched: (string | null)[]
}

/**
 * Whether a ring runs over exactly this stretch, and which way round.
 * @param ring - the ring, closure implied
 * @param from - one end
 * @param between - the anchors strictly between, from `from`
 * @param to - the other end
 * @returns the direction it walks the stretch, or `null` when it does not run over it
 */
function stretchStep(
  ring: readonly number[],
  from: number,
  between: readonly number[],
  to: number
): 1 | -1 | null {
  const start = ring.indexOf(from)
  if (start < 0) return null
  const count = ring.length
  const at = (offset: number) => ring[(((start + offset) % count) + count) % count]
  for (const step of [1, -1] as const) {
    const runs = between.every((index, k) => at(step * (k + 1)) === index)
    if (runs && at(step * (between.length + 1)) === to) return step
  }
  return null
}

/**
 * Every ring that borders something, with its holder: each claim's, then each deliberate gap's.
 * @param doc - the document to read
 * @returns the rings, live, each with its polity (`null` for a gap)
 */
function everyHeldRing(doc: YearDocument): { ring: number[]; polity: string | null }[] {
  return [
    ...doc.claims.flatMap((claim) => claim.rings.map((ring) => ({ ring, polity: claim.polity }))),
    ...doc.deliberateGaps.map((gap) => ({ ring: gap.ring, polity: null })),
  ]
}

/**
 * Check the stretch a retrace would replace, without writing: is it one way round between the two anchors,
 * and which rings run over it. What the tool's preview reads before the click, and the edit before it
 * writes — one rule for both.
 * @param doc - the document to read
 * @param polityId - whose ring is retraced
 * @param from - the anchor the retrace starts on
 * @param to - the anchor it ends on
 * @param replaced - the anchors strictly between them that go, from `from` — one of {@link retraceArcs}
 * @returns the rings that follow, or why the retrace is refused
 */
export function checkRetrace(
  doc: YearDocument,
  polityId: string,
  from: number,
  to: number,
  replaced: readonly number[]
): RetraceCheck | RetraceRefusal {
  const arcs = retraceArcs(doc, polityId, from, to)
  if (arcs === null) return { kind: 'no-ring' }
  if (!sameRun(replaced, arcs.forward) && !sameRun(replaced, arcs.backward)) {
    return { kind: 'not-an-arc' }
  }
  const followers: Follower[] = []
  for (const held of everyHeldRing(doc)) {
    const step = stretchStep(held.ring, from, replaced, to)
    if (step !== null) followers.push({ ...held, step })
  }
  const gone = new Set(replaced)
  const untouched = new Set<string | null>()
  for (const held of everyHeldRing(doc)) {
    const touches = held.ring.some((index) => gone.has(index))
    if (touches && !followers.some((follower) => follower.ring === held.ring)) {
      untouched.add(held.polity)
    }
  }
  if (doc.runs.some((dressed) => dressed.run.some((index) => gone.has(index)))) {
    return { kind: 'dressed-run' }
  }
  const neighbours = [
    ...new Set(
      followers.flatMap((follower) =>
        follower.polity === null || follower.polity === polityId ? [] : [follower.polity]
      )
    ),
  ]
  return { followers, neighbours, untouched: [...untouched] }
}

/**
 * Whether two runs hold the same anchors in the same order.
 * @param a - one run
 * @param b - the other
 * @returns `true` when they are equal
 */
function sameRun(a: readonly number[], b: readonly number[]): boolean {
  return a.length === b.length && a.every((index, at) => b[at] === index)
}

/** What a retrace did, for the status bar. */
export interface RetraceDone {
  /** How many anchors the stretch held, now gone from every ring over it. */
  removed: number
  /** How many points the new run laid. */
  added: number
  /** The other polities whose rings took the new run too, each once. */
  neighbours: string[]
  /** The holders of rings that touched the stretch and kept their points (`RetraceCheck.untouched`). */
  untouched: (string | null)[]
}

/**
 * Whether a retrace — its check or its edit — was refused.
 * @param answer - what {@link checkRetrace} or {@link retraceStretch} answered
 * @returns `true` for a refusal
 */
export function isRetraceRefusal(
  answer: RetraceCheck | RetraceDone | RetraceRefusal
): answer is RetraceRefusal {
  return 'kind' in answer
}

/**
 * Replace a stretch of a polity's ring by a new run, in every ring that runs over it — the retrace, as one
 * edit.
 *
 * The new run's points are those strictly between `from` and `to`, in that order; a point that names an
 * existing anchor (a neighbour's, met along its border) is that anchor, never a copy (`H-06`). An empty run
 * straightens the stretch into one segment.
 * @param doc - the document to edit
 * @param polityId - whose ring is retraced
 * @param from - the anchor the retrace starts on
 * @param to - the anchor it ends on
 * @param replaced - the anchors strictly between them that go, from `from` — one of {@link retraceArcs}
 * @param points - the new run, strictly between `from` and `to`
 * @returns what it did, or why it was refused — and then nothing was written
 */
export function retraceStretch(
  doc: YearDocument,
  polityId: string,
  from: number,
  to: number,
  replaced: readonly number[],
  points: readonly OutlinePoint[]
): RetraceDone | RetraceRefusal {
  const check = checkRetraceRun(doc, polityId, from, to, replaced, points)
  if (isRetraceRefusal(check)) return check
  const laid = points.map((point) =>
    typeof point.anchor === 'number'
      ? point.anchor
      : addAnchor(doc, [point.at[0], point.at[1]], declareSource(doc, point.provenance))
  )
  for (const follower of check.followers) {
    const rebuilt = spliced(follower.ring, from, replaced.length, laid, follower.step)
    follower.ring.splice(0, follower.ring.length, ...rebuilt)
  }
  return {
    removed: replaced.length,
    added: laid.length,
    neighbours: check.neighbours,
    untouched: check.untouched,
  }
}

/**
 * Check a retrace with its new run, without writing: the stretch ({@link checkRetrace}), then what the run
 * does to each ring taking it — an anchor visited twice, too few anchors left. What the tool's preview reads
 * before the last click, so the bar never promises a replacement the click would refuse.
 * @param doc - the document to read
 * @param polityId - whose ring is retraced
 * @param from - the anchor the retrace starts on
 * @param to - the anchor it ends on
 * @param replaced - the anchors strictly between them that go, from `from`
 * @param points - the new run, strictly between `from` and `to`
 * @returns the rings that follow and those left untouched, or why the retrace is refused
 */
export function checkRetraceRun(
  doc: YearDocument,
  polityId: string,
  from: number,
  to: number,
  replaced: readonly number[],
  points: readonly OutlinePoint[]
): RetraceCheck | RetraceRefusal {
  const check = checkRetrace(doc, polityId, from, to, replaced)
  if (isRetraceRefusal(check)) return check
  const count = doc.anchors.length
  const reused = points.flatMap((point) => (typeof point.anchor === 'number' ? [point.anchor] : []))
  if (reused.some((index) => !(index >= 0 && index < count))) return { kind: 'bad-anchor' }
  return refuseOnRings(check.followers, replaced, reused, points.length) ?? check
}

/**
 * What each ring taking the new run would refuse: an anchor visited twice, or too few anchors left.
 * @param followers - the rings that take the run
 * @param replaced - the anchors that leave them
 * @param reused - the existing anchors the new run lands on
 * @param added - how many points the new run has
 * @returns the first refusal, or `null`
 */
function refuseOnRings(
  followers: readonly Follower[],
  replaced: readonly number[],
  reused: readonly number[],
  added: number
): RetraceRefusal | null {
  const gone = new Set(replaced)
  const twice = new Set(reused).size !== reused.length
  for (const follower of followers) {
    const kept = follower.ring.filter((index) => !gone.has(index))
    if (twice || reused.some((index) => kept.includes(index))) {
      return { kind: 'loop', polity: follower.polity }
    }
    if (kept.length + added < MIN_RING_ANCHORS)
      return { kind: 'too-short', polity: follower.polity }
  }
  return null
}

/**
 * A ring with its stretch replaced, rotated to start on `from`.
 * @param ring - the ring, closure implied
 * @param from - where the stretch starts
 * @param length - how many anchors the stretch holds between its ends
 * @param laid - the new run, from `from` towards `to`
 * @param step - which way the ring walks the stretch
 * @returns the rebuilt ring
 */
function spliced(
  ring: readonly number[],
  from: number,
  length: number,
  laid: readonly number[],
  step: 1 | -1
): number[] {
  const start = ring.indexOf(from)
  const rotated = [...ring.slice(start), ...ring.slice(0, start)]
  if (step === 1) return [from, ...laid, ...rotated.slice(1 + length)]
  // Walked against its order, the stretch sits at the end of the rotation: `to`, then the stretch back to
  // `from`. The new run goes there, reversed, so the ring still walks `to` → run → `from`.
  return [...rotated.slice(0, rotated.length - length), ...[...laid].reverse()]
}
