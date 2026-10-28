/**
 * How far each cell of a mask lies from the nearest cell outside it — the exact Euclidean distance
 * transform the countries' names are fitted by (ATLAS-301, `files/plans/atlas/country-names.md`).
 *
 * Felzenszwalb & Huttenlocher, *Distance Transforms of Sampled Functions*, Theory of Computing 8 (2012),
 * 415–428: the squared distance is the lower envelope of parabolas rooted at the outside cells, computed one
 * column and then one row at a time, each in linear time. Exact, where a chamfer pass (3-4, 5-7-11) is not:
 * a name's size is read straight from these distances, so an error of a few percent along a diagonal would
 * be a name a few percent too large, touching its border.
 */

import { readAt } from '../utils/math'

/**
 * Stands for "no outside cell yet" in the squared distances: large enough to lose to any real distance,
 * small enough that the envelope's differences stay finite where `Infinity - Infinity` would be `NaN`.
 */
const FAR = 1e20

/** The buffers one line's transform works in, allocated once for the longest side. */
interface LineBuffers {
  /** The samples: `0` at a source, the squared distance so far elsewhere. */
  readonly f: Float64Array
  /** The squared distances computed. */
  readonly out: Float64Array
  /** The roots of the parabolas of the envelope. */
  readonly v: Int32Array
  /** The boundaries between them, one more than the samples. */
  readonly z: Float64Array
}

/**
 * Where the parabolas rooted at `q` and at `root` cross.
 * @param f - the samples
 * @param q - one root
 * @param root - the other
 * @returns the abscissa of their crossing
 */
function crossing(f: Float64Array, q: number, root: number): number {
  return (readAt(f, q) + q * q - (readAt(f, root) + root * root)) / (2 * q - 2 * root)
}

/**
 * The lower envelope of the parabolas rooted at every sample, into `v` and `z`.
 * @param buffers - the samples in, the envelope out
 * @param n - how many samples
 */
function envelope(buffers: LineBuffers, n: number): void {
  const { f, v, z } = buffers
  let k = 0
  v[0] = 0
  z[0] = -Infinity
  z[1] = Infinity
  for (let q = 1; q < n; q += 1) {
    let s = crossing(f, q, readAt(v, k))
    while (s <= readAt(z, k)) {
      k -= 1
      s = crossing(f, q, readAt(v, k))
    }
    k += 1
    v[k] = q
    z[k] = s
    z[k + 1] = Infinity
  }
}

/**
 * The 1D squared distance transform of the samples in `buffers.f`, into `buffers.out`.
 * @param buffers - the samples in, the squared distances out
 * @param n - how many samples
 */
function transform1d(buffers: LineBuffers, n: number): void {
  const { f, out, v, z } = buffers
  envelope(buffers, n)
  let k = 0
  for (let q = 0; q < n; q += 1) {
    while (readAt(z, k + 1) < q) k += 1
    const root = readAt(v, k)
    out[q] = (q - root) * (q - root) + readAt(f, root)
  }
}

/**
 * The distance from every cell to the nearest cell outside a mask, in cells, centre to centre.
 *
 * **Outside the grid counts as nothing**: only the mask's own `0` cells are sources. A caller that wants the
 * grid's frame to count as outside pads the mask with a ring of `0` — `pipeline/nameSpace` does, because a
 * name must keep its margin from the edge of the map as from a border. A mask with no `0` cell at all has no
 * answer and is refused.
 *
 * The distance to the **edge** of the mask, where its cells end, is half a cell less: a cell's centre is
 * half a cell inside its own side.
 * @param mask - row-major, non-zero inside
 * @param width - the grid's width in cells
 * @param height - the grid's height in cells
 * @returns the distances, row-major; `0` on every outside cell
 * @throws when the mask's size is not `width × height`, or when it has no outside cell
 */
export function distanceToOutside(mask: Uint8Array, width: number, height: number): Float32Array {
  if (mask.length !== width * height)
    throw new Error(
      `[atlas] a mask of ${String(mask.length)} cells is not ${String(width)} × ${String(height)}`
    )
  if (!mask.includes(0))
    throw new Error('[atlas] a mask with no outside cell has no distance to measure')

  const longest = Math.max(width, height)
  const buffers: LineBuffers = {
    f: new Float64Array(longest),
    out: new Float64Array(longest),
    v: new Int32Array(longest),
    z: new Float64Array(longest + 1),
  }

  const squared = new Float64Array(width * height)
  for (let x = 0; x < width; x += 1) {
    for (let y = 0; y < height; y += 1) buffers.f[y] = mask[y * width + x] === 0 ? 0 : FAR
    transform1d(buffers, height)
    for (let y = 0; y < height; y += 1) squared[y * width + x] = readAt(buffers.out, y)
  }

  const distances = new Float32Array(width * height)
  for (let y = 0; y < height; y += 1) {
    const row = y * width
    for (let x = 0; x < width; x += 1) buffers.f[x] = readAt(squared, row + x)
    transform1d(buffers, width)
    for (let x = 0; x < width; x += 1) distances[row + x] = Math.sqrt(readAt(buffers.out, x))
  }
  return distances
}
