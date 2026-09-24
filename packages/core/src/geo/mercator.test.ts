import { describe, expect, it } from 'vitest'

import {
  MERCATOR_MAX_LATITUDE,
  horizontalToLongitude,
  latitudeToMercatorY,
  latitudeToVertical,
  longitudeToHorizontal,
  mercatorYToLatitude,
  verticalToLatitude,
} from './mercator'

import type { GeoBounds } from './mercator'

/** The DEM's real bounds — the frame every conversion in the app is relative to. */
const DEM: GeoBounds = {
  west: -45,
  south: 11.178401873711783,
  east: 78.75,
  north: 76.84081641443098,
}

describe('mercator', () => {
  describe('happy path', () => {
    it('projects the equator to zero', () => {
      expect(latitudeToMercatorY(0)).toBeCloseTo(0, 12)
      expect(mercatorYToLatitude(0)).toBeCloseTo(0, 12)
    })

    it('puts the bounds at the edges of the normalized range', () => {
      expect(verticalToLatitude(0, DEM)).toBeCloseTo(DEM.north, 9)
      expect(verticalToLatitude(1, DEM)).toBeCloseTo(DEM.south, 9)
      expect(longitudeToHorizontal(DEM.west, DEM)).toBe(0)
      expect(longitudeToHorizontal(DEM.east, DEM)).toBe(1)
    })
  })

  describe('variants', () => {
    it('round-trips latitude through the projection', () => {
      for (const latitude of [-80, -45, -10, 0, 12.5, 46, 60, 76.8]) {
        expect(mercatorYToLatitude(latitudeToMercatorY(latitude))).toBeCloseTo(latitude, 9)
      }
    })

    it('round-trips latitude through the normalized vertical coordinate', () => {
      for (const latitude of [15, 30, 46, 60, 75]) {
        expect(verticalToLatitude(latitudeToVertical(latitude, DEM), DEM)).toBeCloseTo(latitude, 9)
      }
    })

    it('round-trips longitude through the normalized horizontal coordinate', () => {
      for (const longitude of [-45, -10, 0, 30, 78.75]) {
        expect(horizontalToLongitude(longitudeToHorizontal(longitude, DEM), DEM)).toBeCloseTo(
          longitude,
          9
        )
      }
    })

    it('keeps longitude linear but latitude non-linear across the frame', () => {
      // Mercator stretches high latitudes, so the northern half of this box eats more than half the
      // rows — the middle row lands well NORTH of the arithmetic mid-latitude (~56° vs ~44°). This is
      // exactly why a plain degree lerp would misplace anything geographic.
      const midLatitude = (DEM.north + DEM.south) / 2
      expect(verticalToLatitude(0.5, DEM)).toBeGreaterThan(midLatitude)
      expect(horizontalToLongitude(0.5, DEM)).toBeCloseTo((DEM.west + DEM.east) / 2, 9)
    })

    it('increases monotonically northward as the row index decreases', () => {
      const rows = [0, 0.25, 0.5, 0.75, 1].map((v) => verticalToLatitude(v, DEM))
      for (let i = 1; i < rows.length; i++) expect(rows[i]).toBeLessThan(rows[i - 1] ?? 0)
    })
  })

  describe('managed errors', () => {
    it('clamps latitudes beyond the Mercator limit instead of diverging', () => {
      const atLimit = latitudeToMercatorY(MERCATOR_MAX_LATITUDE)
      expect(latitudeToMercatorY(89.9)).toBe(atLimit)
      expect(latitudeToMercatorY(-89.9)).toBeCloseTo(-atLimit, 12)
      expect(Number.isFinite(latitudeToMercatorY(90))).toBe(true)
      expect(Number.isFinite(latitudeToMercatorY(-90))).toBe(true)
    })

    it('returns zero rather than dividing by a null span', () => {
      const degenerate: GeoBounds = { west: 10, south: 40, east: 10, north: 40 }
      expect(longitudeToHorizontal(10, degenerate)).toBe(0)
      expect(latitudeToVertical(40, degenerate)).toBe(0)
    })
  })

  // L4 (unmanaged errors): N/A — pure synchronous maths, no I/O, no external asset, no async path.
  // The only divergent input the projection could receive (a latitude at or beyond the pole) is a
  // managed case, covered by the clamp above. Vitest fails on an empty suite, hence a note, not a block.

  describe('edge cases', () => {
    it('extrapolates outside the bounds rather than clamping the normalized coordinates', () => {
      // Callers reprojecting vector data need to know a feature fell outside the frame, not have it
      // silently snapped to the edge.
      expect(latitudeToVertical(DEM.north + 5, DEM)).toBeLessThan(0)
      expect(latitudeToVertical(DEM.south - 5, DEM)).toBeGreaterThan(1)
      expect(longitudeToHorizontal(DEM.west - 5, DEM)).toBeLessThan(0)
      expect(longitudeToHorizontal(DEM.east + 5, DEM)).toBeGreaterThan(1)
    })

    it('handles a bounding box that straddles the equator', () => {
      const straddling: GeoBounds = { west: -10, south: -20, east: 10, north: 20 }
      expect(verticalToLatitude(0.5, straddling)).toBeCloseTo(0, 9)
    })
  })
})
