/**
 * The line a name is written along, inside its space (ATLAS-301, `files/plans/atlas/country-names.md`,
 * « the line »).
 *
 * **Two kinds of line compete**, and `namePlacement` keeps the one that lets the name be largest:
 *
 * - **the horizontal**, through the space's most inner cell — the cell farthest from its edges, which is
 *   what polylabel computes on a vector outline (its « pole of inaccessibility ») — and spanning the run of
 *   the space on that row. A round space is named straight across;
 * - **the ridge**: the longest path through the middle of the space, smoothed into a gentle curve. It is the
 *   main branch of the space's skeleton, the support line of curved area labels in automated cartography
 *   (Barrault 2001; Krumpe & Mendel, *Computing Curved Area Labels in Near-Real Time*, 2020, which also fit
 *   it to a smooth curve). Found here without building the skeleton: the two ends of the space's longest
 *   inner walk, then the walk between them that stays where the space is thickest.
 *
 * **Coordinates are the space's crop**, a cell's centre at its integer column and row, `y` downward.
 */

import { readAt } from '../utils/math'

/** A line a name can be written along: points a fraction of a cell apart, and the length walked to each. */
export interface NameLine {
  /** The points, in order of reading, `[x, y]` in the crop's cells. */
  readonly points: readonly (readonly [number, number])[]
  /** The length walked from the first point to each, in cells; the last is the line's length. */
  readonly lengths: readonly number[]
}

/** How far apart the points of a line are, in cells: fine enough that the fit reads every cell it crosses. */
const STEP = 0.5

/**
 * The most a ridge may turn from one end to the other, in radians — 60°. A name bent further reads as a
 * lettering exercise, not a name: *A program for automatic name placement*, in the Auto-Carto 6 proceedings,
 * set the same bound on curved names (read from its summary only).
 */
export const MAX_BEND = Math.PI / 3

/**
 * The steepest a name is read going down the page, in radians — 80°. Steeper, it is read from the bottom up,
 * as a name standing on a map's left side is: a line near the vertical has no "left to right", and reading
 * it downward would set the letters on their backs to anyone used to maps. Claude's choice, 2026-10-28, to
 * confirm on sight.
 */
export const STEEPEST_DESCENT = (80 * Math.PI) / 180

/**
 * The cell farthest from the space's edges.
 * @param distances - each cell's distance to the outside, row-major over the crop
 * @returns its index, the first one on a tie
 */
export function innermostCell(distances: Float32Array): number {
  let best = 0
  for (let at = 1; at < distances.length; at += 1)
    if (readAt(distances, at) > readAt(distances, best)) best = at
  return best
}

/**
 * Points along a curve, about {@link STEP} apart, from one value of its parameter to another, with the
 * length walked to each.
 * @param curve - a point for each value of the parameter
 * @param from - where the parameter starts
 * @param to - where it ends
 * @returns the line
 */
export function sampled(
  curve: (s: number) => readonly [number, number],
  from: number,
  to: number
): NameLine {
  const count = Math.max(2, Math.ceil((to - from) / STEP) + 1)
  const points: (readonly [number, number])[] = []
  const lengths: number[] = []
  let walked = 0
  for (let i = 0; i < count; i += 1) {
    const point = curve(from + ((to - from) * i) / (count - 1))
    const previous = points[i - 1]
    if (previous !== undefined) walked += Math.hypot(point[0] - previous[0], point[1] - previous[1])
    points.push(point)
    lengths.push(walked)
  }
  return { points, lengths }
}

/**
 * The direction of one step of a line, as a unit vector.
 * @param from - the step's first point
 * @param to - its last
 * @returns the direction
 * @throws when the two points are one — `sampled` never sets two points on each other, so it is a line built wrong
 */
function stepDirection(
  from: readonly [number, number],
  to: readonly [number, number]
): readonly [number, number] {
  const length = Math.hypot(to[0] - from[0], to[1] - from[1])
  if (length === 0) throw new Error('[atlas] a name line has two points on each other')
  return [(to[0] - from[0]) / length, (to[1] - from[1]) / length]
}

/**
 * A line carried on past both its ends, straight along its first and last steps, with points about
 * {@link STEP} apart as on every line — the room a name that may spill over its borders takes beyond where its
 * space ends (`nameCandidates`).
 * @param line - the line
 * @param by - how far past each end, in cells; `0` or less leaves the line as it is
 * @returns the longer line
 * @throws when the line has fewer than two points, or two of them on each other at an end
 */
export function extendLine(line: NameLine, by: number): NameLine {
  if (by <= 0) return line
  const { points } = line
  const first = points[0]
  const second = points[1]
  const beforeLast = points[points.length - 2]
  const last = points[points.length - 1]
  if (first === undefined || second === undefined || beforeLast === undefined || last === undefined)
    throw new Error(`[atlas] a name line of ${String(points.length)} points cannot be carried on`)
  const back = stepDirection(second, first)
  const on = stepDirection(beforeLast, last)
  const count = Math.ceil(by / STEP)
  const before = Array.from({ length: count }, (_, i): readonly [number, number] => {
    const t = (by * (count - i)) / count
    return [first[0] + t * back[0], first[1] + t * back[1]]
  })
  const after = Array.from({ length: count }, (_, i): readonly [number, number] => {
    const t = (by * (i + 1)) / count
    return [last[0] + t * on[0], last[1] + t * on[1]]
  })
  const all = [...before, ...points, ...after]
  let walked = 0
  const lengths = all.map((point, i) => {
    const previous = all[i - 1]
    if (previous !== undefined) walked += Math.hypot(point[0] - previous[0], point[1] - previous[1])
    return walked
  })
  return { points: all, lengths }
}

/**
 * The space's centre of mass, when it lies inside the space.
 * @param mask - the space, row-major over the crop, non-zero inside
 * @param width - the crop's width
 * @returns the centre, `x` exact and `y` on its row; `null` when it falls outside — a crescent, an L
 */
export function centreOfMass(mask: Uint8Array, width: number): { x: number; y: number } | null {
  let sx = 0
  let sy = 0
  let cells = 0
  mask.forEach((inside, at) => {
    if (inside === 0) return
    sx += at % width
    sy += Math.floor(at / width)
    cells += 1
  })
  if (cells === 0) return null
  const x = sx / cells
  const y = Math.round(sy / cells)
  return mask[y * width + Math.round(x)] === 0 ? null : { x, y }
}

/**
 * The horizontal line a name is centred on: through the space's centre of mass, as far either side of it as the
 * space runs on that row — cut evenly, so the name sits on the centre (the dev, 2026-10-28: *« centrés par rapport
 * à la masse du pays […] le premier test »*). Through the space's most inner cell, across its whole run, when the
 * centre falls outside the space.
 * @param mask - the space, row-major over the crop, non-zero inside
 * @param distances - each cell's distance to the outside
 * @param width - the crop's width
 * @returns the line, read west to east
 */
export function horizontalLine(mask: Uint8Array, distances: Float32Array, width: number): NameLine {
  const centre = centreOfMass(mask, width)
  const pole = innermostCell(distances)
  const anchor = centre ?? { x: pole % width, y: Math.floor(pole / width) }
  const { y } = anchor
  const x = Math.round(anchor.x)
  let west = x
  while (west > 0 && mask[y * width + west - 1] !== 0) west -= 1
  let east = x
  while (east < width - 1 && mask[y * width + east + 1] !== 0) east += 1
  // To the edges of the run's end cells, half a cell past their centres — evenly either side of the centre.
  if (centre === null) return sampled((s) => [s, y], west - 0.5, east + 0.5)
  const reach = Math.min(centre.x - (west - 0.5), east + 0.5 - centre.x)
  return sampled((s) => [s, y], centre.x - reach, centre.x + reach)
}

/** A binary heap of cells, the cheapest on top. */
interface CellHeap {
  /** How many cells it holds. */
  readonly size: () => number
  /** Add a cell at a cost. */
  readonly push: (cell: number, cost: number) => void
  /** Take the cheapest cell out. */
  readonly pop: () => { cell: number; cost: number }
}

/**
 * An empty heap of cells.
 * @returns the heap
 */
function cellHeap(): CellHeap {
  const cells: number[] = []
  const costs: number[] = []
  const place = (at: number, cell: number, cost: number): void => {
    cells[at] = cell
    costs[at] = cost
  }
  const up = (start: number, cell: number, cost: number): void => {
    let at = start
    while (at > 0) {
      const parent = (at - 1) >> 1
      if (readAt(costs, parent) <= cost) break
      place(at, readAt(cells, parent), readAt(costs, parent))
      at = parent
    }
    place(at, cell, cost)
  }
  const down = (cell: number, cost: number): void => {
    let at = 0
    for (let left = 1; left < cells.length; left = 2 * at + 1) {
      const right = left + 1
      const child =
        right < cells.length && readAt(costs, right) < readAt(costs, left) ? right : left
      if (readAt(costs, child) >= cost) break
      place(at, readAt(cells, child), readAt(costs, child))
      at = child
    }
    place(at, cell, cost)
  }
  return {
    size: () => cells.length,
    push: (cell, cost) => {
      up(cells.length, cell, cost)
    },
    pop: () => {
      const top = { cell: readAt(cells, 0), cost: readAt(costs, 0) }
      const lastCell = cells.pop() ?? Number.NaN
      const lastCost = costs.pop() ?? Number.NaN
      if (cells.length > 0) down(lastCell, lastCost)
      return top
    },
  }
}

/** The eight neighbours of a cell, as column and row offsets. */
const NEIGHBOURS: readonly (readonly [number, number])[] = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [-1, 0],
  [1, 0],
  [-1, 1],
  [0, 1],
  [1, 1],
]

/** A walk's world: the crop, which cells may be walked on, and what a step costs. */
interface WalkGround {
  /** The crop's width. */
  readonly width: number
  /** The crop's height. */
  readonly height: number
  /** Whether a cell may be walked on. */
  readonly open: (cell: number) => boolean
  /** What one step costs, from its length in cells and the cell it lands on. */
  readonly cost: (length: number, to: number) => number
}

/**
 * The cells a step from a cell reaches, and how long each step is.
 * @param cell - where the step starts
 * @param ground - the walk's world
 * @returns each open neighbour and the step's length
 */
function steps(cell: number, ground: WalkGround): { to: number; length: number }[] {
  const x = cell % ground.width
  const y = (cell - x) / ground.width
  const reached: { to: number; length: number }[] = []
  for (const [dx, dy] of NEIGHBOURS) {
    const nx = x + dx
    const ny = y + dy
    if (nx < 0 || ny < 0 || nx >= ground.width || ny >= ground.height) continue
    const to = ny * ground.width + nx
    if (ground.open(to)) reached.push({ to, length: dx !== 0 && dy !== 0 ? Math.SQRT2 : 1 })
  }
  return reached
}

/**
 * The cheapest walks from one cell to every cell it can reach — Dijkstra's, over the eight neighbours.
 * @param start - the cell to walk from
 * @param ground - the walk's world
 * @returns the cost of reaching each cell (`Infinity` where none reaches), and the cell each is reached from
 */
function cheapestWalks(
  start: number,
  ground: WalkGround
): { reached: Float64Array; from: Int32Array } {
  const reached = new Float64Array(ground.width * ground.height).fill(Infinity)
  const from = new Int32Array(ground.width * ground.height).fill(-1)
  const heap = cellHeap()
  reached[start] = 0
  heap.push(start, 0)
  while (heap.size() > 0) {
    const { cell, cost } = heap.pop()
    if (cost > readAt(reached, cell)) continue // reached more cheaply since it was pushed
    for (const { to, length } of steps(cell, ground)) {
      const through = cost + ground.cost(length, to)
      if (through >= readAt(reached, to)) continue
      reached[to] = through
      from[to] = cell
      heap.push(to, through)
    }
  }
  return { reached, from }
}

/**
 * The cell a walk reaches at the greatest cost.
 * @param reached - what reaching each cell cost, `Infinity` where none reaches
 * @returns its index
 */
function farthest(reached: Float64Array): number {
  let best = 0
  let bestCost = -1
  for (let at = 0; at < reached.length; at += 1) {
    const cost = readAt(reached, at)
    if (cost !== Infinity && cost > bestCost) {
      best = at
      bestCost = cost
    }
  }
  return best
}

/**
 * The longest walk through the middle of a space, cell by cell.
 * @param distances - each cell's distance to the outside, row-major over the crop
 * @param width - the crop's width
 * @param height - the crop's height
 * @param threshold - the least distance to the outside a walked cell keeps
 * @returns the cells' `[x, y]`, from one end to the other; empty when the most inner cell is under the threshold
 */
function ridgeWalk(
  distances: Float32Array,
  width: number,
  height: number,
  threshold: number
): (readonly [number, number])[] {
  const pole = innermostCell(distances)
  const open = (cell: number): boolean => readAt(distances, cell) >= threshold
  if (!open(pole)) return []
  const byLength: WalkGround = { width, height, open, cost: (length) => length }
  // The two ends of the longest walk: the farthest cell from the middle, then the farthest from that one.
  const first = farthest(cheapestWalks(pole, byLength).reached)
  const second = farthest(cheapestWalks(first, byLength).reached)
  // Between them, the walk that keeps to the thickest cells: a step costs less where the space is wider.
  const byThickness: WalkGround = {
    width,
    height,
    open,
    cost: (length, to) => length / readAt(distances, to),
  }
  const { from } = cheapestWalks(first, byThickness)
  const path: (readonly [number, number])[] = []
  for (let cell = second; cell !== -1; cell = readAt(from, cell)) {
    const x = cell % width
    path.push([x, (cell - x) / width])
  }
  return path
}

/** Where a walk is read from: its mean, its reading direction and the letters' up. */
export interface ReadingFrame {
  /** The walk's mean point. */
  readonly origin: readonly [number, number]
  /** The reading direction, a unit vector pointing right — or upward, when the walk descends steeper than {@link STEEPEST_DESCENT}. */
  readonly along: readonly [number, number]
  /** The letters' up: the reading direction turned a quarter towards the top of the page. */
  readonly up: readonly [number, number]
}

/**
 * The frame a walk is read in: its main direction, by the spread of its points, read left to right.
 * @param path - the walk's points
 * @returns its frame
 */
export function readingFrame(path: readonly (readonly [number, number])[]): ReadingFrame {
  let mx = 0
  let my = 0
  for (const [x, y] of path) {
    mx += x / path.length
    my += y / path.length
  }
  let sxx = 0
  let sxy = 0
  let syy = 0
  for (const [x, y] of path) {
    sxx += (x - mx) * (x - mx)
    sxy += (x - mx) * (y - my)
    syy += (y - my) * (y - my)
  }
  // Half the angle of the spread's main axis, in (-π/2, π/2]: its cosine is never negative, so it reads right.
  const axis = 0.5 * Math.atan2(2 * sxy, sxx - syy)
  // `y` runs down the page: a positive angle descends. Steeper than STEEPEST_DESCENT, it is read upward.
  const angle = axis > STEEPEST_DESCENT ? axis - Math.PI : axis
  const along: readonly [number, number] = [Math.cos(angle), Math.sin(angle)]
  return { origin: [mx, my], along, up: [along[1], -along[0]] }
}

/**
 * The determinant of a 3 × 3 matrix.
 * @param m - its nine entries, row by row
 * @returns the determinant
 */
function det(m: readonly number[]): number {
  return (
    readAt(m, 0) * (readAt(m, 4) * readAt(m, 8) - readAt(m, 5) * readAt(m, 7)) -
    readAt(m, 1) * (readAt(m, 3) * readAt(m, 8) - readAt(m, 5) * readAt(m, 6)) +
    readAt(m, 2) * (readAt(m, 3) * readAt(m, 7) - readAt(m, 4) * readAt(m, 6))
  )
}

/**
 * The parabola `t = a s² + b s + k` closest to points, by least squares.
 * @param points - the points, as `[s, t]`
 * @returns its three coefficients; a straight line through their mean where the points cannot tell a bend
 */
export function fitParabola(
  points: readonly (readonly [number, number])[]
): readonly [number, number, number] {
  let s0 = 0
  let s1 = 0
  let s2 = 0
  let s3 = 0
  let s4 = 0
  let t0 = 0
  let t1 = 0
  let t2 = 0
  for (const [s, t] of points) {
    s0 += 1
    s1 += s
    s2 += s * s
    s3 += s * s * s
    s4 += s * s * s * s
    t0 += t
    t1 += s * t
    t2 += s * s * t
  }
  const whole = det([s4, s3, s2, s3, s2, s1, s2, s1, s0])
  // Fewer than three distinct abscissas: no parabola is determined, and the points lie on a line.
  if (Math.abs(whole) < 1e-9) return [0, 0, t0 / s0]
  return [
    det([t2, s3, s2, t1, s2, s1, t0, s1, s0]) / whole,
    det([s4, t2, s2, s3, t1, s1, s2, t0, s0]) / whole,
    det([s4, s3, t2, s3, s2, t1, s2, s1, t0]) / whole,
  ]
}

/** How many halvings the search for the bend makes — far past what a letter's angle can show. */
const BEND_HALVINGS = 40

/**
 * A parabola's bend, straightened until it turns {@link MAX_BEND} at most between two abscissas.
 *
 * With the line's middle between its two ends (`from ≤ 0 ≤ to`), the turn grows with `|a|`: with
 * `u = 2a·to + b` and `v = 2a·from + b`, its derivative in `a`, `2·to / (1 + u²) − 2·from / (1 + v²)`, is never
 * negative whatever the slope `b` — so halving the gap converges on the largest `a` allowed.
 * @param a - the bend
 * @param b - the slope at the mean
 * @param from - the first abscissa
 * @param to - the last
 * @returns the bend, `a` itself when it turns little enough
 */
export function limitedBend(a: number, b: number, from: number, to: number): number {
  const turn = (bend: number): number =>
    Math.abs(Math.atan(2 * bend * to + b) - Math.atan(2 * bend * from + b))
  if (turn(a) <= MAX_BEND) return a
  let low = 0
  let high = 1
  for (let i = 0; i < BEND_HALVINGS; i += 1) {
    const middle = (low + high) / 2
    if (turn(a * middle) > MAX_BEND) high = middle
    else low = middle
  }
  return a * low
}

/**
 * The ridge of a space: its longest walk through the middle, smoothed into a curve bent {@link MAX_BEND}
 * at most and read left to right.
 *
 * **Only cells at least `threshold` from the outside are walked**, so the walk cannot wander into a thin
 * arm of the space where no name could stand; `namePlacement` asks several thresholds and keeps the best.
 * @param distances - each cell's distance to the outside, row-major over the crop
 * @param width - the crop's width
 * @param height - the crop's height
 * @param threshold - the least distance to the outside a walked cell keeps, in cells, above `0`
 * @returns the line, or `null` when the walk is a single cell or none
 */
export function ridgeLine(
  distances: Float32Array,
  width: number,
  height: number,
  threshold: number
): NameLine | null {
  const path = ridgeWalk(distances, width, height, threshold)
  if (path.length < 2) return null
  const { origin, along, up } = readingFrame(path)
  const projected = path.map(([x, y]): readonly [number, number] => {
    const dx = x - origin[0]
    const dy = y - origin[1]
    return [dx * along[0] + dy * along[1], dx * up[0] + dy * up[1]]
  })
  const abscissas = projected.map(([s]) => s)
  const from = Math.min(...abscissas)
  const to = Math.max(...abscissas)
  const [bend, b, k] = fitParabola(projected)
  // Half a cell past the walk's end centres, to the edges of its end cells — and the bend limited over the
  // whole of it.
  const a = limitedBend(bend, b, from - 0.5, to + 0.5)
  return sampled(
    (s) => {
      const t = a * s * s + b * s + k
      return [origin[0] + s * along[0] + t * up[0], origin[1] + s * along[1] + t * up[1]]
    },
    from - 0.5,
    to + 0.5
  )
}
