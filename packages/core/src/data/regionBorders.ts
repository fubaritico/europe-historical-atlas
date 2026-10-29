/**
 * Borders derived from the political raster — never authored beside it.
 *
 * A border is not an object, it is a relation: it is the boundary of the coloured areas, so it is read
 * off the very grid that paints them. Two source geometries for one object is what produced interrupted
 * borders before, and the interruption was structural rather than a tuning matter.
 *
 * Split out of `regionRaster` for size alone; the raster re-exports everything here, so no call site had
 * to move. The only link back is a **type** import, which is erased at compile time — there is no
 * runtime cycle between the two files.
 */

import type { UvPoint } from './coastlineSource'
import type { RegionRaster } from './regionRaster'

/** A border stretch between two polities, in normalized grid coordinates. */
export type RegionBorderSegment = readonly [UvPoint, UvPoint]

/**
 * Ceiling on Chaikin rounds. Each round roughly doubles the point count, so the cost is exponential and
 * an unclamped caller could allocate without bound. Four already turns a cell staircase into a curve.
 */
const MAX_SMOOTHING_ROUNDS = 4

/**
 * Ceiling on the points one kind of border may hold once smoothed.
 *
 * The raster's dimensions are bounded (they come from the DEM), but *how many* of its adjacent cell pairs
 * disagree is decided by the political payload, and the theoretical worst case — an interlocking
 * checkerboard — is about `2 × width × height`, some three million edges on the current grid. Chaikin
 * then multiplies that by up to sixteen, which is how a single JSON file could ask for gigabytes.
 *
 * The budget spends **smoothing rounds**, never edges. Dropping edges to fit would reintroduce exactly
 * the interrupted borders this whole derivation exists to abolish; a border that is merely more angular
 * is still a border. In practice the cap does not bite — 1700 derives ~7 000 edges, 2 % of the budget at
 * four rounds — but it will start to matter if the political raster is ever taken above the DEM's own
 * resolution to shorten the staircase.
 */
const MAX_SMOOTHED_POINTS = 400_000

/**
 * How to derive the border lines.
 */
export interface RegionBorderOptions {
  /** Chaikin rounds to apply (0 = raw cell edges; 2 reads as a drawn line). Capped at four. */
  smoothing?: number
  /**
   * Whether a normalized coordinate is land. Supplying it turns on the **frontier** line — the boundary
   * between a polity and land nobody claims. Without it only shared borders are traced, because a raster
   * of claims cannot tell unclaimed land from open sea, and drawing over the sea would double the
   * shoreline the map already renders from a better source.
   */
  isLand?: (u: number, v: number) => boolean
}

/**
 * A run of border, as a chain of points in normalized grid coordinates.
 *
 * Kept as a chain rather than exploded into segments because the two things a map wants to do with a
 * border need its continuity: a dash pattern must run *along* it instead of restarting on every cell
 * edge, and a parallel offset needs each vertex's neighbours to know which way is sideways.
 */
export type RegionBorderLine = UvPoint[]

/**
 * Every run of border shared by one pair of polities.
 */
export interface RegionBorderGroup {
  /** The two region indices it separates, lower index first. */
  pair: readonly [number, number]
  /** The runs themselves. */
  lines: RegionBorderLine[]
}

/**
 * The border lines, split by kind so each can be drawn in its own hand.
 */
export interface RegionBorders {
  /**
   * Runs separating two different polities, grouped by which pair they separate — which is what lets a
   * union be dashed while a contested line is doubled, without either becoming a second geometry.
   */
  between: RegionBorderGroup[]
  /**
   * Runs where a polity meets land nobody claims. Empty unless `isLand` was supplied. Drawing this is
   * what frees a map from having to declare nations all the way to its own edge. An authored year's runs
   * have their polity on their left, north up (`editor/atlasBorders`), so a line beside one can be laid on
   * the unclaimed side; a raster-derived year's are not oriented.
   */
  frontier: RegionBorderLine[]
}

/**
 * Radix packing two region indices into one map key. Indices come from an `Int16Array`, so they cannot
 * reach this.
 */
const PAIR_RADIX = 1 << 15

/**
 * One round of Chaikin corner cutting: every segment is replaced by its middle half, which rounds each
 * corner without moving the line off its own hull. Two rounds turn a staircase into a curve.
 * @param points - the polyline's vertices
 * @param closed - whether the polyline is a loop (the last vertex must not repeat the first)
 * @returns the subdivided polyline
 */
function chaikin(points: readonly UvPoint[], closed: boolean): UvPoint[] {
  const count = points.length
  if (count < 3) return points.slice()
  const first = points[0]
  const last = points[count - 1]
  if (!first || !last) return points.slice()
  const out: UvPoint[] = []
  // An open line keeps its ends pinned, or the border would retract from the tripoints it must reach.
  if (!closed) out.push(first)
  const limit = closed ? count : count - 1
  for (let i = 0; i < limit; i++) {
    const a = points[i]
    const b = points[(i + 1) % count]
    if (!a || !b) continue
    out.push(
      { u: a.u * 0.75 + b.u * 0.25, v: a.v * 0.75 + b.v * 0.25 },
      { u: a.u * 0.25 + b.u * 0.75, v: a.v * 0.25 + b.v * 0.75 }
    )
  }
  if (!closed) out.push(last)
  return out
}

/**
 * The endpoint keys of every cell edge shared by two different polities, as two parallel lists.
 */
interface SharedEdges {
  /** One endpoint key per edge. */
  from: number[]
  /** The other endpoint key of the same edge, at the matching position. */
  to: number[]
}

/**
 * Row length of the doubled integer lattice endpoints are keyed on.
 *
 * Endpoints live on a doubled lattice so two edges meeting at a grid corner produce the *identical* key
 * and chain together exactly — no epsilon, no welding tolerance. A cell centre sits at `(2col, 2row)`;
 * the boundary between two cells falls on the odd coordinate between them, and a corner can reach −1,
 * hence the `+ 2` of headroom.
 * @param width - the raster's width in cells
 * @returns the lattice row length
 */
function latticeStride(width: number): number {
  return 2 * width + 2
}

/**
 * Turn a lattice key back into a normalized coordinate.
 * @param key - the endpoint key
 * @param stride - the lattice row length
 * @param width - the raster's width in cells
 * @param height - the raster's height in cells
 * @returns the grid coordinate, clamped to the frame so a border never runs off the map
 */
function decodeLatticeKey(key: number, stride: number, width: number, height: number): UvPoint {
  return {
    u: Math.min(1, Math.max(0, ((key % stride) - 1) / 2 / (width - 1))),
    v: Math.min(1, Math.max(0, (Math.floor(key / stride) - 1) / 2 / (height - 1))),
  }
}

/** The shared edges, split by what lies on either side of them. */
interface ClassifiedEdges {
  /**
   * Edges with a different polity on each side, bucketed by which pair — keyed `low * PAIR_RADIX + high`.
   * Bucketing here rather than later is what keeps a chain from ever spanning two different borders.
   */
  between: Map<number, SharedEdges>
  /** Edges where a polity meets land nobody claims — the edge of the mapped world. */
  frontier: SharedEdges
}

/**
 * File one shared edge under the kind its two sides call for.
 *
 * A border is a relation, not an object: what decides where this edge goes is which polities sit either
 * side of it, never anything authored about the edge itself.
 * @param between - buckets keyed by the pair of polities an edge separates
 * @param frontier - the line against unclaimed land
 * @param isLandCell - whether a cell is land, when a mask is available
 * @param here - the polity on this side, `-1` when unclaimed
 * @param other - the polity on the far side, `-1` when unclaimed
 * @param bare - the unclaimed cell's column and row, when exactly one side is unclaimed
 * @param a - one endpoint key of the shared edge
 * @param b - the other endpoint key
 * @returns nothing; the buckets are written in place
 */
function fileSharedEdge(
  between: Map<number, SharedEdges>,
  frontier: SharedEdges,
  isLandCell: ((col: number, row: number) => boolean) | undefined,
  here: number,
  other: number,
  bare: readonly [number, number],
  a: number,
  b: number
): void {
  if (here === other) return // same polity, or unclaimed on both sides
  let target: SharedEdges | null = null
  if (here >= 0 && other >= 0) {
    // Keyed low-index-first, so the France|Spain border is one bucket however the scan met it.
    const key = Math.min(here, other) * PAIR_RADIX + Math.max(here, other)
    target = between.get(key) ?? { from: [], to: [] }
    between.set(key, target)
  } else if (isLandCell?.(bare[0], bare[1]) === true) {
    // Against the sea there is nothing to mark; against unclaimed land there is.
    target = frontier
  }
  if (!target) return
  target.from.push(a)
  target.to.push(b)
}

/**
 * Collect the cell edge shared by every pair of adjacent cells that are not held by the same polity, and
 * sort those edges into the two kinds a map draws differently.
 *
 * A claim facing an *unclaimed* neighbour is the interesting case, and it is two situations at once: the
 * neighbour may be open sea, or it may be land nobody has claimed. Only `isLand` can tell them apart — a
 * raster of claims cannot. The sea side is left silent, because the shoreline is already drawn once from
 * a far better source; the land side becomes a frontier, which is what lets a map stop declaring nations
 * before it runs out of paper.
 * @param raster - the rasterised claims, after any expansion
 * @param stride - the lattice row length
 * @param isLand - whether a normalized coordinate is land; omit to trace shared borders only
 * @returns the edges of each kind, as parallel endpoint-key lists
 */
function sharedEdges(
  raster: RegionRaster,
  stride: number,
  isLand?: (u: number, v: number) => boolean
): ClassifiedEdges {
  const { width, height, cells } = raster
  const keyOf = (doubledX: number, doubledY: number): number =>
    (doubledY + 1) * stride + (doubledX + 1)
  const isLandCell = isLand
    ? (col: number, row: number): boolean =>
        isLand(width > 1 ? col / (width - 1) : 0, height > 1 ? row / (height - 1) : 0)
    : undefined
  const between = new Map<number, SharedEdges>()
  const frontier: SharedEdges = { from: [], to: [] }

  const file = (
    here: number,
    other: number,
    bare: readonly [number, number],
    a: number,
    b: number
  ): void => {
    fileSharedEdge(between, frontier, isLandCell, here, other, bare, a, b)
  }

  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const here = cells[row * width + col] ?? -1
      // Right and down only: every adjacent pair is still seen once, at half the work.
      // Whichever of the two cells is unclaimed is the one the land test must be asked about.
      const bare = (here: number, other: readonly [number, number]): readonly [number, number] =>
        here < 0 ? [col, row] : other
      if (col + 1 < width) {
        file(
          here,
          cells[row * width + col + 1] ?? -1,
          bare(here, [col + 1, row]),
          keyOf(2 * col + 1, 2 * row - 1),
          keyOf(2 * col + 1, 2 * row + 1)
        )
      }
      if (row + 1 < height) {
        file(
          here,
          cells[(row + 1) * width + col] ?? -1,
          bare(here, [col, row + 1]),
          keyOf(2 * col - 1, 2 * row + 1),
          keyOf(2 * col + 1, 2 * row + 1)
        )
      }
    }
  }
  return { between, frontier }
}

/**
 * Chain the shared edges into polylines, walking corner to corner until the line ends or branches.
 *
 * Every edge lands in exactly one polyline, which is what makes the result gapless: a stretch can only
 * be split, never dropped.
 * @param edges - the shared edges
 * @returns one list of endpoint keys per polyline
 */
function chainPolylines(edges: SharedEdges): number[][] {
  const { from, to } = edges
  const count = from.length
  const adjacency = new Map<number, number[]>()
  for (let i = 0; i < count; i++) {
    for (const key of [from[i] ?? 0, to[i] ?? 0]) {
      const bucket = adjacency.get(key)
      if (bucket) bucket.push(i)
      else adjacency.set(key, [i])
    }
  }

  const used = new Uint8Array(count)
  /**
   * Follow unused edges from an endpoint, appending each one's far end.
   * @param start - the endpoint key to leave from
   * @param into - the key list to append to
   * @returns nothing
   */
  const walk = (start: number, into: number[]): void => {
    let key = start
    for (;;) {
      const bucket = adjacency.get(key)
      // Degree 1 is an open end; 3 or 4 is a tripoint, where a border legitimately branches and the
      // polyline must stop rather than pick an arbitrary continuation.
      if (bucket?.length !== 2) return
      const next = bucket.find((edge) => used[edge] === 0)
      if (next === undefined) return
      used[next] = 1
      const other = (from[next] ?? 0) === key ? (to[next] ?? 0) : (from[next] ?? 0)
      into.push(other)
      key = other
    }
  }

  const polylines: number[][] = []
  for (let seed = 0; seed < count; seed++) {
    if (used[seed] === 1) continue
    used[seed] = 1
    const a = from[seed] ?? 0
    const b = to[seed] ?? 0
    const forward: number[] = []
    walk(b, forward)
    const backward: number[] = []
    walk(a, backward)
    backward.reverse()
    polylines.push([...backward, a, b, ...forward])
  }
  return polylines
}

/**
 * How many smoothing rounds a bucket can afford.
 *
 * The budget is spent in rounds, never in edges: a rougher line is still a line, whereas a dropped edge
 * is the interrupted border this whole derivation exists to abolish. Each round roughly doubles the
 * point count, so the cost is exponential and an unclamped caller could allocate without bound.
 * @param edgeCount - how many edges the bucket holds
 * @param rounds - how many rounds were asked for
 * @returns the rounds that fit under {@link MAX_SMOOTHED_POINTS}
 */
export function affordableRounds(edgeCount: number, rounds: number): number {
  let affordable = rounds
  while (affordable > 0 && edgeCount * 2 ** affordable > MAX_SMOOTHED_POINTS) affordable--
  return affordable
}

/**
 * Turn one chain of lattice keys into a smoothed chain of points.
 *
 * A loop repeats its first key at the end; the repeat is dropped so smoothing wraps cleanly and restored
 * afterwards, so the ring closes on itself rather than showing a seam where it was cut.
 * @param line - the chain, as lattice keys
 * @param stride - the lattice's row stride
 * @param width - grid width in cells
 * @param height - grid height in cells
 * @param rounds - corner-cutting rounds to apply
 * @returns the chain, in normalized grid coordinates
 */
export function smoothChain(
  line: readonly number[],
  stride: number,
  width: number,
  height: number,
  rounds: number
): RegionBorderLine {
  const closed = line.length > 3 && line[0] === line[line.length - 1]
  let points = (closed ? line.slice(0, -1) : line).map((key) =>
    decodeLatticeKey(key, stride, width, height)
  )
  for (let i = 0; i < rounds; i++) points = chaikin(points, closed)
  if (closed) {
    const head = points[0]
    if (head) points.push(head)
  }
  return points
}

/**
 * Derive the border lines from the raster itself: emit the shared edge of any two adjacent cells held by
 * different polities, chain those edges into polylines, and round the staircase away.
 *
 * **Why this rather than tracing the source polygons.** The fills come from the raster, so taking the
 * borders from the polygon rings means drawing geometry A while the eye compares it to geometry B — and
 * {@link expandRegionsOverLand} guarantees the two differ, since it deliberately grows each claim past its
 * ring to reach our coastline. A ring segment then sits *inside* the grown territory, a fixed-distance
 * probe reads the same polity on both sides, and the stretch is dropped: interrupted borders, worst
 * wherever the expansion moved the frontier furthest. Deriving the line from the fills makes it the
 * boundary of what is drawn, so it is gapless by construction and can never disagree with the colour.
 *
 * The cost is that the raw line follows cell edges — a ~7 km staircase at the DEM's grid — which is what
 * `smoothing` is for.
 * @param raster - the rasterised claims, after any expansion
 * @param options - smoothing, and the land test that enables the frontier line
 * @returns the border stretches of each kind, in normalized grid coordinates
 */
export function extractRegionBorders(
  raster: RegionRaster,
  options: RegionBorderOptions = {}
): RegionBorders {
  const { width, height } = raster
  if (width < 2 || height < 2) return { between: [], frontier: [] }
  const stride = latticeStride(width)
  const edges = sharedEdges(raster, stride, options.isLand)
  // Each round roughly doubles the point count, so an unbounded value allocates exponentially. The dev
  // panel's slider stops at 4, but a port must be safe on its own rather than trusting a widget to clamp
  // its input — a caller can hold the params object and set anything.
  const rounds = Math.min(MAX_SMOOTHING_ROUNDS, Math.max(0, Math.floor(options.smoothing ?? 0)))

  /**
   * Chain and smooth one bucket of edges into drawable chains.
   *
   * Chains, not segments: a dash pattern has to run *along* a border rather than restart on every cell
   * edge, and a parallel offset needs each vertex's neighbours to work out which way is sideways. Both
   * are impossible once the line has been exploded into unrelated pairs of points.
   * @param kind - the edges of a single bucket
   * @returns the chains, in normalized grid coordinates
   */
  const trace = (kind: SharedEdges): RegionBorderLine[] => {
    const traced: RegionBorderLine[] = []
    if (kind.from.length === 0) return traced
    const affordable = affordableRounds(kind.from.length, rounds)
    for (const line of chainPolylines(kind)) {
      const points = smoothChain(line, stride, width, height, affordable)
      if (points.length >= 2) traced.push(points)
    }
    return traced
  }

  const between: RegionBorderGroup[] = []
  for (const [key, kind] of edges.between) {
    const lines = trace(kind)
    if (lines.length === 0) continue
    between.push({ pair: [Math.floor(key / PAIR_RADIX), key % PAIR_RADIX], lines })
  }
  return { between, frontier: trace(edges.frontier) }
}
