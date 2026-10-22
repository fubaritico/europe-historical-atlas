/**
 * Every zone of the Cartographer that stands behind its own `ErrorBoundary` (the dev's call, 2026-10-21) — the
 * name its console line gives, and what `?break=` in the address names in development. **Stable, never
 * translated**: a panel's title changes with the language, its zone does not.
 */
export const ZONES = [
  'cartographer',
  'app-bar',
  'document-bar',
  'tool-rail',
  'map',
  'dock',
  'status-bar',
  'polities-panel',
  'layers-panel',
  'overrides-panel',
  'line-panel',
  'stacking-menu',
  'tool-menu',
] as const

/** One zone of the Cartographer. */
export type Zone = (typeof ZONES)[number]
