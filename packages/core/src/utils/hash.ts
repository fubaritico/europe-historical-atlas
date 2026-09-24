/**
 * Deterministic 32-bit integer bit-mixing hash of its integer arguments, returned in `[0, 1)`. Uses an
 * FNV-style fold + a final avalanche — no `Math.random`/`Math.sin`, so results are stable across frames
 * and reloads (essential for procedural noise / jitter that must not shimmer). Handles negative inputs
 * (`Math.imul` operates on 32-bit integers).
 * @param ints - integer coordinates / seeds to mix
 * @returns a pseudo-random value in `[0, 1)`
 */
export function hashInts(...ints: number[]): number {
  let h = 2166136261
  for (const n of ints) {
    h = Math.imul(h ^ n, 16777619)
  }
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  h ^= h >>> 16
  return (h >>> 0) / 4294967296
}
