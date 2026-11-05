/**
 * Buckets over a box of `[longitude, latitude]`, to find what lies within a distance of a point without reading
 * everything — the weld at paste reads thousands of points against tens of thousands (`editor/pasteWeld.ts`;
 * measured 2026-11-05: one polity of the backup took 4.8 s to paste without them, 66 ms with).
 *
 * **Each cell is at least `km` on a side at every latitude of the box**: its height is `km` in degrees of latitude,
 * its width `km` in degrees of longitude at the box's latitude farthest from the equator, where a degree is
 * shortest. So whatever lies within `km` of a point is filed in the point's cell or one of the eight around it.
 */

import { kmPerDegreeOfLatitude, kmPerDegreeOfLongitude } from './groundDistance'

/** A box in degrees: `[west, south, east, north]`. */
export type GeoBox = readonly [number, number, number, number]

/** The highest latitude a cell's width is measured at — a degree of longitude vanishes at the pole. */
const WIDEST_LATITUDE = 89

/**
 * The box around some points, padded by a distance on the ground.
 * @param points - `[longitude, latitude]` each, one at least
 * @param km - the padding
 * @returns the box
 */
export function paddedBox(points: readonly (readonly [number, number])[], km: number): GeoBox {
  let [west, south, east, north] = [Infinity, Infinity, -Infinity, -Infinity]
  for (const [longitude, latitude] of points) {
    west = Math.min(west, longitude)
    east = Math.max(east, longitude)
    south = Math.min(south, latitude)
    north = Math.max(north, latitude)
  }
  const widest = Math.min(Math.max(Math.abs(north), Math.abs(south)), WIDEST_LATITUDE)
  const lonPad = km / kmPerDegreeOfLongitude(widest)
  const latPad = km / kmPerDegreeOfLatitude()
  return [west - lonPad, south - latPad, east + lonPad, north + latPad]
}

/**
 * Whether a point lies in a box.
 * @param point - `[longitude, latitude]`
 * @param box - the box
 * @returns `true` inside, edges included
 */
export function inGeoBox(point: readonly [number, number], box: GeoBox): boolean {
  return point[0] >= box[0] && point[0] <= box[2] && point[1] >= box[1] && point[1] <= box[3]
}

/** Buckets of items over a box, each cell at least a distance on a side. */
export class SpatialCells<T> {
  /** What each cell holds, by its key. */
  private readonly held = new Map<string, T[]>()
  /** A cell's width, in degrees of longitude. */
  private readonly lonStep: number
  /** A cell's height, in degrees of latitude. */
  private readonly latStep: number

  /**
   * @param box - the box the cells cover
   * @param km - the least side of a cell, on the ground; above zero
   */
  constructor(box: GeoBox, km: number) {
    const widest = Math.min(Math.max(Math.abs(box[1]), Math.abs(box[3])), WIDEST_LATITUDE)
    this.lonStep = km / kmPerDegreeOfLongitude(widest)
    this.latStep = km / kmPerDegreeOfLatitude()
  }

  /**
   * File an item at a point.
   * @param item - the item
   * @param point - `[longitude, latitude]`
   */
  addPoint(item: T, point: readonly [number, number]): void {
    this.file(item, this.column(point[0]), this.row(point[1]))
  }

  /**
   * File an item along a segment: under every cell the segment crosses **and the eight around each**, so a point
   * within a cell's side of any place of the segment finds it in its own nine. Read every half cell, so no cell the
   * segment crosses is skipped — never the rectangle of its box, which a long diagonal border would fill.
   * @param item - the item
   * @param a - one end, `[longitude, latitude]`
   * @param b - the other
   */
  addSegment(item: T, a: readonly [number, number], b: readonly [number, number]): void {
    const steps = Math.ceil(
      2 * Math.max(Math.abs(b[0] - a[0]) / this.lonStep, Math.abs(b[1] - a[1]) / this.latStep)
    )
    const filed = new Set<string>()
    for (let step = 0; step <= steps; step += 1) {
      const t = steps === 0 ? 0 : step / steps
      const x = this.column(a[0] + t * (b[0] - a[0]))
      const y = this.row(a[1] + t * (b[1] - a[1]))
      for (let dx = -1; dx <= 1; dx += 1) {
        for (let dy = -1; dy <= 1; dy += 1) {
          const key = this.key(x + dx, y + dy)
          if (filed.has(key)) continue
          filed.add(key)
          this.file(item, x + dx, y + dy)
        }
      }
    }
  }

  /**
   * Every item filed in a point's cell and the eight around it, each once.
   * @param point - `[longitude, latitude]`
   * @returns the items
   */
  near(point: readonly [number, number]): T[] {
    const found = new Set<T>()
    const x = this.column(point[0])
    const y = this.row(point[1])
    for (let dx = -1; dx <= 1; dx += 1) {
      for (let dy = -1; dy <= 1; dy += 1) {
        // A cell nothing was filed under holds nothing: an empty answer, not a missing one.
        for (const item of this.held.get(this.key(x + dx, y + dy)) ?? []) found.add(item)
      }
    }
    return [...found]
  }

  /**
   * @param item - the item
   * @param x - its column
   * @param y - its row
   */
  private file(item: T, x: number, y: number): void {
    const key = this.key(x, y)
    const list = this.held.get(key)
    if (list) list.push(item)
    else this.held.set(key, [item])
  }

  /**
   * @param x - a column
   * @param y - a row
   * @returns the cell's key
   */
  private key(x: number, y: number): string {
    return `${String(x)}:${String(y)}`
  }

  /**
   * @param longitude - in degrees
   * @returns its column
   */
  private column(longitude: number): number {
    return Math.floor(longitude / this.lonStep)
  }

  /**
   * @param latitude - in degrees
   * @returns its row
   */
  private row(latitude: number): number {
    return Math.floor(latitude / this.latStep)
  }
}
