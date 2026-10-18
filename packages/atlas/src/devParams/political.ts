/**
 * The historical political overlay, and how its borders are drawn.
 *
 * One group of the dev-panel declaration table: the param shape, its defaults, the range and label
 * of every control, and the display order — declared side by side so a default cannot drift outside its
 * own slider without failing type-check.
 */

import { AUTOMATIC_PALETTE } from '@europe-historical-atlas/core/data/regionPalette'

import type { ControlGroup, ControlTable } from '@europe-historical-atlas/core/utils/controlSpec'

/**
 * The historical political overlay: which year is shown, and how its borders are drawn. The tint
 * strength and blend mode live with the other texture layers, since that is where they are composited.
 */
export interface PoliticalDevParams {
  /** The year to show. The loader picks the nearest century the dataset actually provides. */
  year: number
  /** Draw the border lines on top of the tinted areas. */
  showBorders: boolean
  /**
   * Paint an authored year's polities as geometry cut from their outlines, so the colour meets the border
   * line at any zoom (2026-10-16); off, the colour goes through the grid and the texture as before. A
   * per-century payload year always takes the grid.
   */
  exactFills: boolean
  /**
   * How fine the political grid is, as a multiple of the DEM.
   *
   * This is the resolution of the staircase, and the only lever that flattens it without a trade-off:
   * the coloured areas and the border lines both come out of this one grid, so they stay together by
   * construction. A DEM cell is ~7.6 km at 45°N, so 2 halves the step and 4 quarters it — at four and
   * sixteen times the cells to rasterise, expand, colour and walk.
   *
   * The same number decides the Cartographer's painting grid (roadmap chapter 06): one grid, asked about
   * in two places, and a cell is the finest border either can express.
   */
  rasterScale: number
  /** Chaikin rounds applied to raster-derived borders — 0 shows the raw ~7 km cell staircase. */
  borderSmoothing: number
  /**
   * Draw the borders over the terrain instead of letting it occlude them. The relief is triangulated
   * while draped points are placed by bilinear interpolation between the same vertices, so on a ridge the
   * surface rises above the line and eats it — short cuts in mountains, none on plains. The price is that
   * a border behind a summit stays visible at an oblique angle, as on most strategy-game maps.
   */
  borderOnTop: boolean
  /** Border core colour (hex string) — the inner stroke of the composed line. */
  borderColor: string
  /** Border line opacity, applied to every stroke of the composed line. */
  borderOpacity: number
  /** Border core stroke width in CSS pixels. */
  borderWidth: number
  /**
   * Colour of the wider stroke drawn *under* the core, which shows as an edging either side of it — the
   * casing technique every map renderer uses, since it needs no offset geometry at all.
   */
  borderEdgeColor: string
  /** Width of that under-stroke in CSS pixels. Anything at or below the core width hides it. */
  borderEdgeWidth: number
  /** Draw the frontier between a polity and land nobody claims. */
  showFrontier: boolean
  /** Frontier line colour (hex string). */
  frontierColor: string
  /** Frontier line opacity — usually below the borders', since it is a limit rather than an agreement. */
  frontierOpacity: number
  /** Frontier stroke width in CSS pixels. */
  frontierWidth: number
  /**
   * Dash length in screen pixels for the borders `data/borderStyles` marks as broken — a personal union is
   * a border the map should admit is a fiction.
   */
  borderDashSize: number
  /** Gap length in screen pixels for those same broken borders. */
  borderDashGap: number
  /** Half the distance between the two runs of a doubled border, in normalized grid units. */
  borderDoubleGap: number
  /**
   * Width multiplier at full zoom-out. A weight that reads as a drawn border close up becomes a rope
   * across the continent from far away, so the whole line work thins as the camera pulls back.
   */
  borderWidthZoomOut: number
  /**
   * Opacity multiplier at full zoom-out. At continent scale a border at full strength competes with the
   * fills it is meant to divide; easing it back lets the colours carry the map and the line support it.
   */
  borderOpacityZoomOut: number
  /**
   * Zoom fraction below which the light inlay is gone entirely, fading in over the range above it. The
   * dark edge carries the border at every scale; the inlay is the refinement that appears close up,
   * because at continent scale a light core inside a dark edging reads as an alternation, not a line.
   */
  borderInlayZoom: number
  /** Colour areas by the power they answer to (`SUBJECTO`) rather than by polity. */
  colorBySuzerain: boolean
  /**
   * How far, in DEM cells, a polity's claim may grow to reach land its schematic outline missed. 0
   * leaves the raw polygons and their bare coastal strips.
   */
  snapToCoast: number
  /** Palette slot 1 — muted tints chosen to sit on parchment rather than fight it. */
  palette1: string
  /** Palette slot 2. */
  palette2: string
  /** Palette slot 3. */
  palette3: string
  /** Palette slot 4. */
  palette4: string
  /** Palette slot 5. */
  palette5: string
  /** Palette slot 6. */
  palette6: string
  /** Palette slot 7. */
  palette7: string
  /** Palette slot 8. */
  palette8: string
}

/**
 * Read the eight palette slots as a list.
 * @param params - the political params
 * @returns the palette, in preference order
 */
export function politicalPalette(params: PoliticalDevParams): [string, ...string[]] {
  return [
    params.palette1,
    params.palette2,
    params.palette3,
    params.palette4,
    params.palette5,
    params.palette6,
    params.palette7,
    params.palette8,
  ]
}

/** Opens on 1100, the year being drawn in the Cartographer — the dev's call, 2026-10-16. */
export const DEFAULT_POLITICAL_PARAMS: PoliticalDevParams = {
  year: 1100,
  showBorders: true,
  exactFills: true,
  // 4× the DEM: 1.9 km cells against the DEM's own 7.6 km, on a 5120×4656 grid of 23.8 million cells.
  // It was held at 2× only because it blocked the main thread for 825 ms; the compute runs in a worker
  // now, so the staircase — which is a *resolution* problem and nothing else — gets the one fix that has
  // no trade-off. Fills and lines come out of the same grid, so they cannot disagree.
  rasterScale: 4,
  // Two rounds is where the cell staircase stops reading as pixels and starts reading as a drawn line;
  // a third gains almost nothing and rounds real corners off.
  borderSmoothing: 2,
  borderOnTop: true,
  // A cream core inside a dark brown edging. The pairing is not decoration: **no single ink can contrast
  // with every fill**, because the palette spans a wide lightness range — an ink dark enough to read on
  // gold Spain (#d4b24a) is too dark to read on the blue slot (#54719b), and vice versa. A casing solves
  // it structurally: whichever fill the line crosses, one of its two strokes always separates from it.
  // That only works if the two sit at *opposite ends* of the lightness scale, which is exactly what an
  // earlier gold-core-in-brown failed to do — and it landed within four units of pinned Spain, drawing a
  // gold border on a gold country.
  borderColor: '#f3e7cd',
  // At 0.7 each stroke is 30 % of whatever lies under it, which collapses the casing back toward the
  // fill it is meant to separate from. 0.9 is what makes the line read as a border rather than a scratch.
  borderOpacity: 0.9,
  borderWidth: 2,
  borderEdgeColor: '#5c3a2e',
  borderEdgeWidth: 4,
  // Back on, having been switched off for a shoreline artefact it turned out not to cause: measured on
  // 1700, the frontier is 3429 inland points against 109 coastal ones — 97 % inland, which is exactly
  // where a limit between a claim and unclaimed ground belongs.
  showFrontier: true,
  frontierColor: '#5c3a2e',
  frontierOpacity: 0.75,
  // Thicker than a negotiated border: it is the edge of what the map knows, and reads as an outer limit
  // rather than as a line between two named things.
  frontierWidth: 2.75,
  // Screen pixels, the same size at every zoom: in world units (0.018, some 16 km) the dashes grew as the
  // camera came in, *« trop allongés »* (the dev, 2026-10-16). Retuned by the dev on 2026-10-18, with the
  // borders made more visible: short dashes, a gap half their length.
  borderDashSize: 4.5,
  borderDashGap: 2,
  // Normalized grid units, the slider's floor: about half a DEM cell — the dev, 2026-10-18, closing the two
  // strokes up so they read as one line.
  borderDoubleGap: 0.0002,
  borderWidthZoomOut: 0.45,
  borderOpacityZoomOut: 0.6,
  borderInlayZoom: 0.4,
  colorBySuzerain: false,
  snapToCoast: 12,
  // The shared automatic palette — the Cartographer previews with the same eight (see its JSDoc).
  palette1: AUTOMATIC_PALETTE[0],
  palette2: AUTOMATIC_PALETTE[1],
  palette3: AUTOMATIC_PALETTE[2],
  palette4: AUTOMATIC_PALETTE[3],
  palette5: AUTOMATIC_PALETTE[4],
  palette6: AUTOMATIC_PALETTE[5],
  palette7: AUTOMATIC_PALETTE[6],
  palette8: AUTOMATIC_PALETTE[7],
}

/** Range, step and label of every {@link PoliticalDevParams} field. */
export const POLITICAL_CONTROLS: ControlTable<PoliticalDevParams> = {
  year: { kind: 'number', min: 100, max: 2000, step: 100, label: 'year (CE)' },
  showBorders: { kind: 'boolean', label: 'draw borders' },
  exactFills: { kind: 'boolean', label: 'exact fills (authored year)' },
  rasterScale: { kind: 'number', min: 1, max: 4, step: 1, label: 'raster scale (× DEM)' },
  borderSmoothing: { kind: 'number', min: 0, max: 4, step: 1, label: 'border smoothing' },
  borderOnTop: { kind: 'boolean', label: 'borders over relief' },
  borderColor: { kind: 'hexColor', label: 'border core colour' },
  borderOpacity: { kind: 'number', min: 0, max: 1, step: 0.05, label: 'border opacity' },
  borderWidth: { kind: 'number', min: 0.5, max: 5, step: 0.05, label: 'border core width (px)' },
  borderEdgeColor: { kind: 'hexColor', label: 'border edging colour' },
  borderEdgeWidth: {
    kind: 'number',
    min: 0,
    max: 8,
    step: 0.05,
    label: 'border edging width (px)',
  },
  showFrontier: { kind: 'boolean', label: 'draw frontier (unclaimed land)' },
  frontierColor: { kind: 'hexColor', label: 'frontier colour' },
  frontierOpacity: { kind: 'number', min: 0, max: 1, step: 0.05, label: 'frontier opacity' },
  frontierWidth: { kind: 'number', min: 0.5, max: 5, step: 0.05, label: 'frontier width (px)' },
  borderDashSize: { kind: 'number', min: 1, max: 40, step: 0.5, label: 'dash length (px)' },
  borderDashGap: { kind: 'number', min: 1, max: 40, step: 0.5, label: 'dash gap (px)' },
  borderDoubleGap: {
    kind: 'number',
    min: 0.0002,
    max: 0.01,
    step: 0.0002,
    label: 'double-line spacing',
  },
  borderWidthZoomOut: { kind: 'number', min: 0.1, max: 1, step: 0.05, label: 'width @ zoom-out' },
  borderOpacityZoomOut: {
    kind: 'number',
    min: 0.1,
    max: 1,
    step: 0.05,
    label: 'opacity @ zoom-out',
  },
  borderInlayZoom: {
    kind: 'number',
    min: 0,
    max: 1,
    step: 0.05,
    label: 'cream inlay appears at zoom',
  },
  colorBySuzerain: { kind: 'boolean', label: 'colour by suzerain' },
  snapToCoast: { kind: 'number', min: 0, max: 40, step: 1, label: 'snap to coast (cells)' },
  palette1: { kind: 'hexColor', label: 'palette 1' },
  palette2: { kind: 'hexColor', label: 'palette 2' },
  palette3: { kind: 'hexColor', label: 'palette 3' },
  palette4: { kind: 'hexColor', label: 'palette 4' },
  palette5: { kind: 'hexColor', label: 'palette 5' },
  palette6: { kind: 'hexColor', label: 'palette 6' },
  palette7: { kind: 'hexColor', label: 'palette 7' },
  palette8: { kind: 'hexColor', label: 'palette 8' },
}

/**
 * The political controls, split the way the texture folder is — because a flat list of twenty-odd
 * tunables stops being a panel and becomes a haystack. Grouped by *what you are trying to change*
 * rather than by which module reads the value.
 */
export const POLITICAL_CONTROL_GROUPS: ControlGroup<PoliticalDevParams>[] = [
  {
    title: '1 \u00b7 what is shown',
    keys: ['year', 'snapToCoast', 'colorBySuzerain', 'exactFills'],
  },
  {
    title: '2 \u00b7 border line',
    keys: [
      'showBorders',
      'borderOnTop',
      'borderColor',
      'borderWidth',
      'borderEdgeColor',
      'borderEdgeWidth',
      'borderOpacity',
    ],
  },
  {
    title: '3 \u00b7 border at distance',
    keys: ['borderWidthZoomOut', 'borderOpacityZoomOut', 'borderInlayZoom'],
  },
  {
    title: '4 \u00b7 border types',
    keys: ['borderDashSize', 'borderDashGap', 'borderDoubleGap'],
  },
  {
    title: '5 \u00b7 frontier (unclaimed land)',
    keys: ['showFrontier', 'frontierColor', 'frontierWidth', 'frontierOpacity'],
  },
  {
    title: '6 \u00b7 geometry',
    keys: ['rasterScale', 'borderSmoothing'],
  },
  {
    title: '7 \u00b7 palette',
    keys: [
      'palette1',
      'palette2',
      'palette3',
      'palette4',
      'palette5',
      'palette6',
      'palette7',
      'palette8',
    ],
  },
]

/** Display order of the political controls (flat — the grouping above is what the panel renders). */
export const POLITICAL_CONTROL_ORDER: (keyof PoliticalDevParams)[] = [
  'year',
  'snapToCoast',
  'colorBySuzerain',
  'exactFills',
  'showBorders',
  'rasterScale',
  'borderSmoothing',
  'borderOnTop',
  'borderColor',
  'borderWidth',
  'borderEdgeColor',
  'borderEdgeWidth',
  'borderOpacity',
  'showFrontier',
  'frontierColor',
  'frontierWidth',
  'frontierOpacity',
  'borderWidthZoomOut',
  'borderOpacityZoomOut',
  'borderInlayZoom',
  'borderDashSize',
  'borderDashGap',
  'borderDoubleGap',
  'palette1',
  'palette2',
  'palette3',
  'palette4',
  'palette5',
  'palette6',
  'palette7',
  'palette8',
]
/**
 * What changing a political tunable actually costs.
 *
 * - `redraw` — the lines are rebuilt from geometry already traced. Paint only.
 * - `trace` — the lines are traced again from the political grid already held. No year is refetched.
 * - `full`  — the year is fetched, rasterised, grown, coloured and baked again.
 */
export type PoliticalRebuild = 'redraw' | 'trace' | 'full'

/**
 * Tunables that only change how the border lines are *painted*.
 *
 * Written as what may take the cheap path rather than what must not, so a tunable added later defaults
 * to correct-but-slower instead of silently doing nothing. That default is not theoretical: this table
 * has failed twice — once leaving the river sliders inert, once routing `snapToCoast` and the palette
 * slots to a rebuild that re-rasterises nothing.
 */
const POLITICAL_REDRAW_ONLY: readonly (keyof PoliticalDevParams)[] = [
  'showBorders',
  'borderOnTop',
  'borderColor',
  'borderOpacity',
  'borderWidth',
  'borderEdgeColor',
  'borderEdgeWidth',
  'showFrontier',
  'frontierColor',
  'frontierOpacity',
  'frontierWidth',
  'borderDashSize',
  'borderDashGap',
  'borderDoubleGap',
  'borderWidthZoomOut',
  'borderOpacityZoomOut',
  'borderInlayZoom',
]

/** Tunables that change the border *geometry*, but not the grid it is traced from. */
const POLITICAL_TRACE_ONLY: readonly (keyof PoliticalDevParams)[] = ['borderSmoothing']

/**
 * The rebuild a political tunable needs.
 *
 * A pure lookup rather than a dispatch buried in the panel, so a test can walk every key of
 * {@link PoliticalDevParams} and see where each one lands — which is the check that was missing both
 * times this routing broke.
 * @param key - the tunable that changed
 * @returns the cheapest rebuild that is still correct for it
 */
export function politicalRebuildFor(key: keyof PoliticalDevParams): PoliticalRebuild {
  if (POLITICAL_TRACE_ONLY.includes(key)) return 'trace'
  return POLITICAL_REDRAW_ONLY.includes(key) ? 'redraw' : 'full'
}
