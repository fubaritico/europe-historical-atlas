/**
 * Cut each polity into triangles that lie flat on the relief — the geometry of an exact fill.
 *
 * The atlas used to colour polities through a 1.9 km grid baked into the terrain texture, so at close
 * zoom the colour missed the border line by a cell (2026-10-16). Cut from the same outlines as the
 * lines, a fill meets them exactly at any zoom.
 *
 * The relief is not flat across a cell: three's `PlaneGeometry` splits quad `(ix, iy)` into two planes
 * along the diagonal from `(ix, iy + 1)` to `(ix + 1, iy)`. A fill is therefore built plane by plane:
 *
 * - a cell **no ring edge crosses** is wholly in or wholly out; in, it is the relief's own two triangles;
 * - in a cell **edges cross**, each of its two planes is cut along the line of every edge crossing the
 *   cell, so no piece straddles an edge, and a piece is kept when the even-odd rule says its centroid is in.
 *
 * **The fill rule is even-odd, the Cartographer's**, and it holds exactly even where a ring crosses
 * itself or overlaps another of the same polity — 19 polities of 1100 did on 2026-10-16, and a
 * triangulator filled their overlaps wrong (the first version of this module, `earcut`, did).
 *
 * Works in **cell units** (`x = u · segX`, `y = v · segY`), where the grid lines are the integers, and
 * hands back normalized `(u, v)`. The many `?? 0` read indices the loops keep in range
 * (`noUncheckedIndexedAccess` asks for them); none stands in for a value that failed to arrive.
 */

import type { UvPoint } from '../data/coastlineSource'

/** The relief's subdivision: how many cells across and down. */
export interface FillGrid {
  /** Cells along X (west→east). */
  segX: number
  /** Cells along Y (north→south). */
  segY: number
}

/** A convex polygon in cell units, as a flat `x, y` list. */
type Convex = number[]

/** An edge of a ring in cell units: `x0, y0, x1, y1`. */
export type Edge = readonly [number, number, number, number]

/** Doubled area below which a cut piece is a sliver of rounding, not a surface (square cells). */
const MIN_DOUBLED_AREA = 1e-9

/**
 * Whether the edge from `(xi, yi)` to `(xj, yj)` crosses the ray going east from `(x, y)` — the one step
 * every even-odd test here is built on.
 * @param x - the point's x
 * @param y - the point's y
 * @param edge - the edge
 * @returns `true` when it crosses
 */
function crossesRay(x: number, y: number, edge: Edge): boolean {
  const [xi, yi, xj, yj] = edge
  return yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi
}

/**
 * A ring in cell units, without the closing vertex a ring may repeat.
 * @param ring - the ring in `(u, v)`
 * @param grid - the relief's subdivision
 * @returns the flat `x, y` list
 */
function toCells(ring: readonly UvPoint[], grid: FillGrid): number[] {
  const out: number[] = []
  for (const point of ring) out.push(point.u * grid.segX, point.v * grid.segY)
  const n = out.length
  if (n >= 4 && out[0] === out[n - 2] && out[1] === out[n - 1]) out.length = n - 2
  return out
}

/**
 * Every edge of a set of rings.
 * @param rings - the rings, flat `x, y`
 * @returns the edges
 */
export function edgesOf(rings: readonly (readonly number[])[]): Edge[] {
  const edges: Edge[] = []
  for (const ring of rings) {
    const n = ring.length / 2
    for (let i = 0, j = n - 1; i < n; j = i++)
      edges.push([ring[2 * j] ?? 0, ring[2 * j + 1] ?? 0, ring[2 * i] ?? 0, ring[2 * i + 1] ?? 0])
  }
  return edges
}

/**
 * The edges filed by the grid rows they span, so a test reads only the edges that can cross its row —
 * the rings of a large polity run to thousands of vertices. Clamped to the grid, so an aberrant coordinate
 * cannot file an edge under billions of rows (session review SEC-001).
 * @param edges - the edges
 * @param grid - the relief's subdivision
 * @returns the edges of each row
 */
export function edgesByRow(edges: readonly Edge[], grid: FillGrid): Map<number, Edge[]> {
  const rows = new Map<number, Edge[]>()
  for (const edge of edges) {
    const first = Math.max(0, Math.floor(Math.min(edge[1], edge[3])))
    const last = Math.min(grid.segY - 1, Math.floor(Math.max(edge[1], edge[3])))
    for (let row = first; row <= last; row++) {
      const bucket = rows.get(row) ?? []
      bucket.push(edge)
      rows.set(row, bucket)
    }
  }
  return rows
}

/**
 * The even-odd point test over edges filed by row.
 * @param rows - the edges of each row
 * @returns the test
 */
export function evenOddTest(
  rows: ReadonlyMap<number, readonly Edge[]>
): (x: number, y: number) => boolean {
  return (x: number, y: number): boolean => {
    let inside = false
    for (const edge of rows.get(Math.floor(y)) ?? []) if (crossesRay(x, y, edge)) inside = !inside
    return inside
  }
}

/**
 * The part of an edge inside the grid's box (Liang–Barsky), or `null` when it misses the grid.
 *
 * Only the walk is bounded, never the geometry: the part of an edge outside the grid touches no cell, so
 * dropping it moves no border — and an aberrant coordinate can no longer make the walk run for billions of
 * steps (session review SEC-001).
 * @param edge - the edge, in cells
 * @param grid - the relief's subdivision
 * @returns the clipped edge, or `null`
 */
export function clipEdgeToGrid(edge: Edge, grid: FillGrid): Edge | null {
  const [xa, ya, xb, yb] = edge
  const dx = xb - xa
  const dy = yb - ya
  let t0 = 0
  let t1 = 1
  const sides: [number, number][] = [
    [-dx, xa],
    [dx, grid.segX - xa],
    [-dy, ya],
    [dy, grid.segY - ya],
  ]
  for (const [p, q] of sides) {
    if (p === 0) {
      if (q < 0) return null
      continue
    }
    const t = q / p
    if (p < 0) t0 = Math.max(t0, t)
    else t1 = Math.min(t1, t)
    if (t0 > t1) return null
  }
  return [xa + dx * t0, ya + dy * t0, xa + dx * t1, ya + dy * t1]
}

/**
 * Every cell an edge passes through, with the edges that pass through it.
 *
 * Conservative by construction: each edge is walked in steps of at most half a cell, and every cell under
 * the box of each step is marked, so no cell an edge crosses can be missed. A few cells it only grazes are
 * marked too; they are cut exactly like the others, so marking one too many costs triangles, never
 * correctness.
 * @param edges - the edges
 * @param grid - the relief's subdivision
 * @returns the edges crossing each marked cell, by index `iy · segX + ix`
 */
export function boundaryCells(edges: readonly Edge[], grid: FillGrid): Map<number, Edge[]> {
  const cells = new Map<number, Edge[]>()
  for (const edge of edges) {
    const inGrid = clipEdgeToGrid(edge, grid)
    if (inGrid === null) continue
    const [xa, ya, xb, yb] = inGrid
    const steps = Math.max(1, Math.ceil(2 * Math.max(Math.abs(xb - xa), Math.abs(yb - ya))))
    for (let k = 0; k < steps; k++) {
      const t0 = k / steps
      const t1 = (k + 1) / steps
      const step: Edge = [
        xa + (xb - xa) * t0,
        ya + (yb - ya) * t0,
        xa + (xb - xa) * t1,
        ya + (yb - ya) * t1,
      ]
      markBox(cells, edge, grid, step)
    }
  }
  return cells
}

/**
 * File an edge under every cell of the box of one step along it, once per cell.
 * @param cells - the cells marked so far, with their edges
 * @param edge - the edge being walked
 * @param grid - the relief's subdivision
 * @param step - the step
 * @returns nothing; `cells` grows
 */
function markBox(cells: Map<number, Edge[]>, edge: Edge, grid: FillGrid, step: Edge): void {
  const [xa, ya, xb, yb] = step
  const x0 = Math.max(0, Math.floor(Math.min(xa, xb)))
  const x1 = Math.min(grid.segX - 1, Math.floor(Math.max(xa, xb)))
  const y0 = Math.max(0, Math.floor(Math.min(ya, yb)))
  const y1 = Math.min(grid.segY - 1, Math.floor(Math.max(ya, yb)))
  for (let iy = y0; iy <= y1; iy++) {
    for (let ix = x0; ix <= x1; ix++) {
      const key = iy * grid.segX + ix
      const filed = cells.get(key) ?? []
      if (filed[filed.length - 1] !== edge) filed.push(edge)
      cells.set(key, filed)
    }
  }
}

/**
 * Keep the part of a convex polygon where `a·x + b·y + c ≥ 0` (one Sutherland–Hodgman pass).
 * @param poly - the polygon, flat `x, y`
 * @param a - the half-plane's x coefficient
 * @param b - its y coefficient
 * @param c - its constant
 * @returns the clipped polygon, possibly empty
 */
export function clipHalfPlane(poly: Convex, a: number, b: number, c: number): Convex {
  const out: Convex = []
  const n = poly.length / 2
  for (let i = 0; i < n; i++) {
    const x1 = poly[2 * i] ?? 0
    const y1 = poly[2 * i + 1] ?? 0
    const j = (i + 1) % n
    const x2 = poly[2 * j] ?? 0
    const y2 = poly[2 * j + 1] ?? 0
    const d1 = a * x1 + b * y1 + c
    const d2 = a * x2 + b * y2 + c
    if (d1 >= 0) out.push(x1, y1)
    if (d1 >= 0 !== d2 >= 0) {
      const t = d1 / (d1 - d2)
      out.push(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t)
    }
  }
  return out
}

/**
 * Whether a piece is more than a sliver of rounding.
 * @param poly - flat `x, y`
 * @returns `true` when it has an area worth drawing
 */
function isSurface(poly: Convex): boolean {
  if (poly.length < 6) return false
  let sum = 0
  const n = poly.length / 2
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    sum += (poly[2 * i] ?? 0) * (poly[2 * j + 1] ?? 0) - (poly[2 * j] ?? 0) * (poly[2 * i + 1] ?? 0)
  }
  return Math.abs(sum) > MIN_DOUBLED_AREA
}

/**
 * The centroid of a convex polygon's vertices — inside it, which is all the fill rule needs.
 * @param poly - flat `x, y`
 * @returns the point
 */
function centroid(poly: Convex): [number, number] {
  let x = 0
  let y = 0
  const n = poly.length / 2
  for (let i = 0; i < n; i++) {
    x += poly[2 * i] ?? 0
    y += poly[2 * i + 1] ?? 0
  }
  return [x / n, y / n]
}

/**
 * The two planes of cell `(ix, iy)`, as triangles in cell units, split as three's `PlaneGeometry` splits
 * it: `a, b, d` then `b, c, d`, along the diagonal from `(ix, iy + 1)` to `(ix + 1, iy)`.
 * @param ix - the cell's column
 * @param iy - the cell's row
 * @returns the two triangles
 */
function cellPlanes(ix: number, iy: number): [Convex, Convex] {
  return [
    [ix, iy, ix, iy + 1, ix + 1, iy],
    [ix, iy + 1, ix + 1, iy + 1, ix + 1, iy],
  ]
}

/**
 * Cut a convex piece in two along the line of an edge.
 * @param piece - flat `x, y`
 * @param edge - the edge whose line cuts
 * @returns the pieces either side, slivers dropped — the piece itself when the line misses it
 */
function splitByEdge(piece: Convex, edge: Edge): Convex[] {
  const [xa, ya, xb, yb] = edge
  const a = yb - ya
  const b = xa - xb
  if (a === 0 && b === 0) return [piece]
  const c = -(a * xa + b * ya)
  return [clipHalfPlane(piece, a, b, c), clipHalfPlane(piece, -a, -b, -c)].filter(isSurface)
}

/**
 * Append, in `(u, v)`, the fan of a convex piece.
 * @param piece - flat `x, y` in cells
 * @param grid - the relief's subdivision
 * @param out - where the triangles go
 * @returns nothing; `out` grows
 */
function emitFan(piece: Convex, grid: FillGrid, out: number[]): void {
  const n = piece.length / 2
  for (let k = 1; k + 1 < n; k++) {
    for (const v of [0, k, k + 1])
      out.push((piece[2 * v] ?? 0) / grid.segX, (piece[2 * v + 1] ?? 0) / grid.segY)
  }
}

/** What a border cell is filled against. */
interface BorderCellContext {
  /** The even-odd test. */
  inside: (x: number, y: number) => boolean
  /** The relief's subdivision. */
  grid: FillGrid
  /** Where the triangles' `u, v` go. */
  out: number[]
}

/**
 * Fill the part of one border cell the rings enclose: each plane cut along every edge through the cell,
 * each piece kept when the even-odd rule says it is in.
 * @param ix - the cell's column
 * @param iy - the cell's row
 * @param edges - the edges crossing it
 * @param context - the test, the grid and where the triangles go
 * @returns nothing; `context.out` grows
 */
function fillBorderCell(
  ix: number,
  iy: number,
  edges: readonly Edge[],
  context: BorderCellContext
): void {
  for (const plane of cellPlanes(ix, iy)) {
    let pieces: Convex[] = [plane]
    for (const edge of edges) pieces = pieces.flatMap((piece) => splitByEdge(piece, edge))
    for (const piece of pieces)
      if (context.inside(...centroid(piece))) emitFan(piece, context.grid, context.out)
  }
}

/**
 * Where the edges of one row cross the row's centre line, sorted — the spans between pairs are inside.
 * @param edges - the row's edges
 * @param y - the centre line
 * @returns the crossings' x
 */
function centreCrossings(edges: readonly Edge[], y: number): number[] {
  const xs: number[] = []
  for (const [xi, yi, xj, yj] of edges)
    if (yi > y !== yj > y) xs.push(xi + ((y - yi) * (xj - xi)) / (yj - yi))
  return xs.sort((a, b) => a - b)
}

/**
 * Append the two relief planes of every cell wholly inside the rings — the cells no edge crosses, whose
 * centre lies in a span between two crossings of its row's centre line.
 * @param rows - the edges of each row
 * @param boundary - the cells an edge crosses, which are cut elsewhere
 * @param grid - the relief's subdivision
 * @param out - where the triangles' `u, v` go
 * @returns nothing; `out` grows
 */
function fillInteriorCells(
  rows: ReadonlyMap<number, readonly Edge[]>,
  boundary: ReadonlyMap<number, unknown>,
  grid: FillGrid,
  out: number[]
): void {
  for (const [iy, edges] of rows) {
    const crossings = centreCrossings(edges, iy + 0.5)
    for (let k = 0; k + 1 < crossings.length; k += 2) {
      const from = Math.max(0, Math.ceil((crossings[k] ?? 0) - 0.5))
      const to = Math.min(grid.segX - 1, Math.floor((crossings[k + 1] ?? 0) - 0.5))
      for (let ix = from; ix <= to; ix++) {
        if (boundary.has(iy * grid.segX + ix)) continue
        for (const plane of cellPlanes(ix, iy)) emitFan(plane, grid, out)
      }
    }
  }
}

/**
 * Every polity's fill, as triangles lying flat on the relief.
 * @param regions - the polities, each with its rings in `(u, v)`, outer and holes alike
 * @param grid - the relief's subdivision
 * @returns one flat `u, v` list per polity, three vertices per triangle, in the order given
 */
export function fillTriangles(
  regions: readonly { rings: readonly (readonly UvPoint[])[] }[],
  grid: FillGrid
): Float32Array[] {
  return regions.map((region) => {
    const rings = region.rings.map((ring) => toCells(ring, grid)).filter((ring) => ring.length >= 6)
    const edges = edgesOf(rings)
    const rows = edgesByRow(edges, grid)
    const boundary = boundaryCells(edges, grid)
    const out: number[] = []
    fillInteriorCells(rows, boundary, grid, out)
    const context: BorderCellContext = { inside: evenOddTest(rows), grid, out }
    for (const [key, crossing] of boundary)
      fillBorderCell(key % grid.segX, Math.floor(key / grid.segX), crossing, context)
    return Float32Array.from(out)
  })
}
