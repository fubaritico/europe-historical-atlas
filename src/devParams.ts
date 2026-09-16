/**
 * What the dev panel can tune: the param shapes, their defaults, and the range/label of each control —
 * all declared together.
 *
 * Deliberately free of any rendering-library import: `devPanel.ts` renders these declarations with
 * lil-gui, `main.ts` seeds its live objects from the defaults, and tests can check both without a DOM.
 * Keeping the three apart is what previously allowed a default to sit outside its own slider unnoticed.
 */

import type { ControlGroup, ControlTable } from './utils/controlSpec'

/**
 * Relief geometry / displacement tuning, exposed live through the dev panel.
 */
export interface ReliefDevParams {
  /** Vertical exaggeration of the relief at full zoom-out (applied via `mesh.scale.y`). */
  exaggeration: number
  /** Exaggeration multiplier at full zoom-in (relief flattens as you zoom in); 1 = no flattening. */
  exaggZoomIn: number
  /** Box-blur radius (grid cells); kills isolated DEM outliers. Keep low to stay crisp. */
  smoothing: number
  /** Elevations up to this (metres) stay 1:1 — plains keep their relief. */
  plainsCeiling: number
  /** Apparent height (metres) the highest peaks ease toward (e.g. 4441 m → ~700 m). Lower = flatter. */
  peakTarget: number
  /** Render the relief as a wireframe. */
  wireframe: boolean
}

/** Tuned relief defaults — a low exaggeration that flattens further as the camera comes in. */
export const DEFAULT_RELIEF_PARAMS: ReliefDevParams = {
  exaggeration: 0.75,
  exaggZoomIn: 0.35,
  smoothing: 0,
  plainsCeiling: 575,
  peakTarget: 1900,
  wireframe: false,
}

/** Range, step and label of every {@link ReliefDevParams} field. */
export const RELIEF_CONTROLS: ControlTable<ReliefDevParams> = {
  exaggeration: { kind: 'number', min: 0, max: 4, step: 0.05, label: 'exaggeration (zoom-out)' },
  exaggZoomIn: { kind: 'number', min: 0.1, max: 1, step: 0.05, label: 'exaggeration @ zoom-in' },
  smoothing: { kind: 'number', min: 0, max: 8, step: 1, label: 'smoothing (outliers)' },
  plainsCeiling: { kind: 'number', min: 0, max: 1000, step: 25, label: 'plains ceiling (m)' },
  peakTarget: { kind: 'number', min: 200, max: 3000, step: 25, label: 'peak target (m)' },
  wireframe: { kind: 'boolean', label: 'wireframe' },
}

/** Display order of the relief controls (a flat list — the relief sits at the panel root). */
export const RELIEF_CONTROL_ORDER: (keyof ReliefDevParams)[] = [
  'exaggeration',
  'exaggZoomIn',
  'smoothing',
  'plainsCeiling',
  'peakTarget',
  'wireframe',
]

/**
 * Coastline styling exposed through the dev panel (draped 3D lines; opacity is zoom-linked in the loop).
 */
export interface CoastlineDevParams {
  /** Line colour (hex string). */
  color: string
  /** Opacity at full zoom-out (`controls.zoom = 0`). */
  opacity: number
  /** Opacity at full zoom-in (`controls.zoom = 1`); lerped every frame. */
  opacityZoomIn: number
  /** World-space lift above the flat sea (avoids z-fighting). */
  yLift: number
  /** Hand-drawn wobble amplitude in world units (keep light). */
  jitter: number
  /** Number of overlaid strokes (overdraw → soft pencil band). */
  strokes: number
}

/** Soft pencil coastline: a light jitter over a few overlaid strokes at low opacity. */
export const DEFAULT_COASTLINE_PARAMS: CoastlineDevParams = {
  color: '#4a3424',
  opacity: 0.2,
  opacityZoomIn: 0.1,
  yLift: 0.002,
  jitter: 0.002,
  strokes: 5,
}

/** Range, step and label of every {@link CoastlineDevParams} field. */
export const COASTLINE_CONTROLS: ControlTable<CoastlineDevParams> = {
  color: { kind: 'hexColor', label: 'colour' },
  opacity: { kind: 'number', min: 0, max: 1, step: 0.05, label: 'opacity (zoom-out)' },
  opacityZoomIn: { kind: 'number', min: 0, max: 1, step: 0.05, label: 'opacity @ zoom-in' },
  jitter: { kind: 'number', min: 0, max: 0.02, step: 0.0005, label: 'jitter (light)' },
  strokes: { kind: 'number', min: 1, max: 6, step: 1, label: 'strokes (overdraw)' },
  yLift: { kind: 'number', min: 0, max: 0.02, step: 0.001, label: 'lift' },
}

/** Display order of the coastline controls. */
export const COASTLINE_CONTROL_ORDER: (keyof CoastlineDevParams)[] = [
  'color',
  'opacity',
  'opacityZoomIn',
  'jitter',
  'strokes',
  'yLift',
]

/**
 * Portolan rhumb-network styling + layout exposed through the dev panel (opacity is zoom-linked in the
 * loop; the network is regenerated when the layout changes).
 */
export interface RhumbDevParams {
  /** Rose centre — normalized U (west→east). */
  centerU: number
  /** Rose centre — normalized V (north→south). */
  centerV: number
  /** Radius (normalized) of the ring of secondary compass centres. */
  circleRadius: number
  /** Number of secondary centres on the ring. */
  nodeCount: number
  /** Compass directions per centre (unique lines = directions / 2). */
  directions: number
  /** Line colour (hex string). */
  color: string
  /** Opacity at full zoom-out. */
  opacity: number
  /** Opacity at full zoom-in (fades to reduce clutter). */
  opacityZoomIn: number
  /** Sampling step along each line for the sea-clip (smaller = finer at the coast, slower to build). */
  clipStep: number
}

/** Rhumb network centred on open ocean west of Iberia. */
export const DEFAULT_RHUMB_PARAMS: RhumbDevParams = {
  centerU: 0.2,
  centerV: 0.52,
  circleRadius: 0.34,
  nodeCount: 12,
  directions: 32,
  color: '#6a4a2b',
  opacity: 0.16,
  opacityZoomIn: 0.06,
  clipStep: 0.004,
}

/** Range, step and label of every {@link RhumbDevParams} field. */
export const RHUMB_CONTROLS: ControlTable<RhumbDevParams> = {
  color: { kind: 'hexColor', label: 'colour' },
  opacity: { kind: 'number', min: 0, max: 0.6, step: 0.02, label: 'opacity (zoom-out)' },
  opacityZoomIn: { kind: 'number', min: 0, max: 0.6, step: 0.02, label: 'opacity @ zoom-in' },
  centerU: { kind: 'number', min: 0, max: 1, step: 0.01, label: 'centre U (E–W)' },
  centerV: { kind: 'number', min: 0, max: 1, step: 0.01, label: 'centre V (N–S)' },
  circleRadius: { kind: 'number', min: 0, max: 0.8, step: 0.01, label: 'ring radius' },
  nodeCount: { kind: 'number', min: 1, max: 32, step: 1, label: 'centres' },
  directions: { kind: 'number', min: 4, max: 32, step: 4, label: 'directions' },
  clipStep: { kind: 'number', min: 0.001, max: 0.02, step: 0.001, label: 'sea-clip step' },
}

/** Display order of the rhumb-network controls. */
export const RHUMB_CONTROL_ORDER: (keyof RhumbDevParams)[] = [
  'color',
  'opacity',
  'opacityZoomIn',
  'centerU',
  'centerV',
  'circleRadius',
  'nodeCount',
  'directions',
  'clipStep',
]

/**
 * Compass-rose styling exposed through the dev panel (colours + labels are baked into the SVG, so any
 * change regenerates the rose; it is positioned at the rhumb-network centre).
 */
export interface RoseDevParams {
  /** Rose centre — normalized U (west→east). */
  centerU: number
  /** Rose centre — normalized V (north→south). */
  centerV: number
  /** Side length of the rose quad in world units. */
  size: number
  /** Overall opacity `[0, 1]`. */
  opacity: number
  /** Draw the French 8-wind labels. */
  showLabels: boolean
  /** Principal winds / rings / labels colour (sepia ink). */
  ink: string
  /** Half-wind colour (vert anglais). */
  halfWind: string
  /** Quarter-wind colour (rouge bordeaux). */
  quarterWind: string
  /** World-space lift above the sea. */
  lift: number
}

/** Compass rose in the Atlantic, portolan colour code (principal ink, half-winds green, quarters red). */
export const DEFAULT_ROSE_PARAMS: RoseDevParams = {
  centerU: 0.2,
  centerV: 0.64,
  size: 1.9,
  opacity: 0.65,
  showLabels: true,
  ink: '#4a3424',
  halfWind: '#3f5e3a',
  quarterWind: '#7a2230',
  lift: 0.01,
}

/** Range, step and label of every {@link RoseDevParams} field. */
export const ROSE_CONTROLS: ControlTable<RoseDevParams> = {
  centerU: { kind: 'number', min: 0, max: 1, step: 0.01, label: 'centre U (E–W)' },
  centerV: { kind: 'number', min: 0, max: 1, step: 0.01, label: 'centre V (N–S)' },
  size: { kind: 'number', min: 0.5, max: 6, step: 0.1, label: 'size' },
  opacity: { kind: 'number', min: 0, max: 1, step: 0.05, label: 'opacity' },
  showLabels: { kind: 'boolean', label: 'labels (N · NE · …)' },
  ink: { kind: 'hexColor', label: 'ink (principal)' },
  halfWind: { kind: 'hexColor', label: 'half-winds (green)' },
  quarterWind: { kind: 'hexColor', label: 'quarter-winds (red)' },
  lift: { kind: 'number', min: 0, max: 0.05, step: 0.002, label: 'lift' },
}

/** Display order of the compass-rose controls. */
export const ROSE_CONTROL_ORDER: (keyof RoseDevParams)[] = [
  'centerU',
  'centerV',
  'size',
  'opacity',
  'showLabels',
  'ink',
  'halfWind',
  'quarterWind',
  'lift',
]

/**
 * River-network styling and level of detail. The reveal thresholds are zoom values: minor tributaries
 * only appear once the camera is close enough for them to read as lines rather than noise.
 */
export interface RiverDevParams {
  /** Line colour (hex string). */
  color: string
  /** Opacity of a fully revealed river. */
  opacity: number
  /** Zoom `[0, 1]` at which the major rivers (rank 1) are fully drawn. */
  revealStart: number
  /** Zoom `[0, 1]` at which the minor rivers (rank 9) are fully drawn. */
  revealEnd: number
  /** Zoom span over which a rank fades in, so ranks appear gradually rather than popping. */
  fade: number
  /** Draw the centrelines traced through lakes, not just the rivers proper. */
  includeLakeCenterlines: boolean
  /** Hand-drawn wobble amplitude in world units (0 = crisp). */
  jitter: number
  /** Stroke width in CSS pixels for a major river (rank 1). */
  widthMajor: number
  /** Stroke width in CSS pixels for the finest tributaries (rank 9). */
  widthMinor: number
}

/** Same sepia ink as the coastline — one hand drew the whole map. Minor tributaries appear on zoom-in. */
export const DEFAULT_RIVER_PARAMS: RiverDevParams = {
  color: DEFAULT_COASTLINE_PARAMS.color,
  opacity: 0.3,
  revealStart: 0,
  revealEnd: 0.8,
  fade: 0.25,
  includeLakeCenterlines: false,
  jitter: 0,
  widthMajor: 1.25,
  widthMinor: 0.95,
}

/** Range, step and label of every {@link RiverDevParams} field. */
export const RIVER_CONTROLS: ControlTable<RiverDevParams> = {
  color: { kind: 'hexColor', label: 'colour' },
  opacity: { kind: 'number', min: 0, max: 1, step: 0.05, label: 'opacity' },
  revealStart: { kind: 'number', min: 0, max: 1, step: 0.05, label: 'majors visible from' },
  revealEnd: { kind: 'number', min: 0, max: 1, step: 0.05, label: 'minors visible from' },
  fade: { kind: 'number', min: 0.05, max: 1, step: 0.05, label: 'fade-in span' },
  includeLakeCenterlines: { kind: 'boolean', label: 'trace through lakes' },
  jitter: { kind: 'number', min: 0, max: 0.02, step: 0.0005, label: 'jitter (light)' },
  // 0.5..5 at a 0.05 step: the useful band is 1..3 px, and the old 0..8 range put it in a sliver at
  // the far left of the slider — the same mistake the zoom speed had.
  widthMajor: { kind: 'number', min: 0.5, max: 5, step: 0.05, label: 'width — majors (px)' },
  widthMinor: { kind: 'number', min: 0.5, max: 5, step: 0.05, label: 'width — minors (px)' },
}

/** Display order of the river controls. */
export const RIVER_CONTROL_ORDER: (keyof RiverDevParams)[] = [
  'color',
  'opacity',
  'widthMajor',
  'widthMinor',
  'revealStart',
  'revealEnd',
  'fade',
  'includeLakeCenterlines',
  'jitter',
]

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
   * Where the border lines come from. `raster` derives them from the boundary between filled cells, so
   * they follow the colours exactly and cannot be interrupted; `rings` traces the source polygons, which
   * is smoother but drops every stretch the claim expansion moved away from its own outline. Kept as a
   * switch only long enough to compare the two on screen.
   */
  borderSource: 'raster' | 'rings'
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
   * Dash length in world units for the borders `data/borderStyles` marks as broken — a personal union is
   * a border the map should admit is a fiction.
   */
  borderDashSize: number
  /** Gap length in world units for those same broken borders. */
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
export function politicalPalette(params: PoliticalDevParams): string[] {
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

/** Opens on 1500 — a Europe recognisable enough to judge the rendering against. */
export const DEFAULT_POLITICAL_PARAMS: PoliticalDevParams = {
  year: 1500,
  showBorders: true,
  borderSource: 'raster',
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
  borderWidth: 1.4,
  borderEdgeColor: '#5c3a2e',
  borderEdgeWidth: 3.2,
  // Back on, having been switched off for a shoreline artefact it turned out not to cause: measured on
  // 1700, the frontier is 3429 inland points against 109 coastal ones — 97 % inland, which is exactly
  // where a limit between a claim and unclaimed ground belongs.
  showFrontier: true,
  frontierColor: '#5c3a2e',
  frontierOpacity: 0.3,
  // Thicker than a negotiated border: it is the edge of what the map knows, and reads as an outer limit
  // rather than as a line between two named things.
  frontierWidth: 2.4,
  // World units: the map plane is 12 across, so 0.03 is roughly a 30 km dash — long enough to read as a
  // deliberate break rather than a dotted line at any zoom the camera allows.
  // Tight enough to read as one broken line rather than as a row of marks.
  borderDashSize: 0.018,
  borderDashGap: 0.009,
  // Normalized grid units: about two DEM cells apart, which separates without reading as two borders.
  borderDoubleGap: 0.0016,
  borderWidthZoomOut: 0.3,
  borderOpacityZoomOut: 0.55,
  borderInlayZoom: 0.35,
  colorBySuzerain: false,
  snapToCoast: 12,
  // Eight is comfortably above what a political map of Europe needs: four colours suffice in theory,
  // and the surplus keeps neighbours-of-neighbours from echoing each other.
  palette1: '#b8554a',
  palette2: '#6f8a52',
  palette3: '#54719b',
  palette4: '#c29646',
  palette5: '#8f6a9c',
  palette6: '#468a83',
  palette7: '#c46b42',
  palette8: '#87825c',
}

/** Range, step and label of every {@link PoliticalDevParams} field. */
export const POLITICAL_CONTROLS: ControlTable<PoliticalDevParams> = {
  year: { kind: 'number', min: 100, max: 2000, step: 100, label: 'year (CE)' },
  showBorders: { kind: 'boolean', label: 'draw borders' },
  borderSource: { kind: 'choice', options: ['raster', 'rings'], label: 'border source' },
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
  borderDashSize: { kind: 'number', min: 0.005, max: 0.2, step: 0.005, label: 'dash length' },
  borderDashGap: { kind: 'number', min: 0.005, max: 0.2, step: 0.005, label: 'dash gap' },
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
  { title: '1 \u00b7 what is shown', keys: ['year', 'snapToCoast', 'colorBySuzerain'] },
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
    keys: ['borderSource', 'borderSmoothing'],
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
  'showBorders',
  'borderSource',
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
 * The world rectangle the camera view is clamped within, tuned by centre + half-size.
 */
export interface ExtentDevParams {
  /** Extent centre X. */
  centerX: number
  /** Extent centre Z. */
  centerZ: number
  /** Extent half-width (X). */
  halfWidth: number
  /** Extent half-depth (Z). */
  halfDepth: number
}

/** The framed default extent — the map plane plus a little margin. */
export const DEFAULT_EXTENT_PARAMS: ExtentDevParams = {
  centerX: 0,
  centerZ: 0,
  halfWidth: 5.8,
  halfDepth: 5.2,
}

/** Range, step and label of every {@link ExtentDevParams} field. */
export const EXTENT_CONTROLS: ControlTable<ExtentDevParams> = {
  centerX: { kind: 'number', min: -6, max: 6, step: 0.05, label: 'centre X' },
  centerZ: { kind: 'number', min: -6, max: 6, step: 0.05, label: 'centre Z' },
  halfWidth: { kind: 'number', min: 0.5, max: 6, step: 0.05, label: 'half-width (X)' },
  halfDepth: { kind: 'number', min: 0.5, max: 6, step: 0.05, label: 'half-depth (Z)' },
}

/** Display order of the extent controls. */
export const EXTENT_CONTROL_ORDER: (keyof ExtentDevParams)[] = [
  'centerX',
  'centerZ',
  'halfWidth',
  'halfDepth',
]

/** The subset of the map-controls options the camera folder tunes live. */
export interface CameraTuningParams {
  /** Arrow/edge pan speed in world units per second. */
  panSpeed: number
  /** Wheel zoom increment per notch. */
  zoomSpeed: number
  /** Inertia time constant in seconds. */
  smoothingTau: number
  /** Whether dragging the map pans it. */
  enableDrag: boolean
  /** Whether the pointer near a screen edge pans the map. */
  enableEdgeScroll: boolean
  /** Edge-scroll speed in world units per second. */
  edgeScrollSpeed: number
  /** Camera distance at full zoom-in. */
  minDistance: number
  /** Camera distance at full zoom-out. */
  maxDistance: number
  /** Pitch in degrees at full zoom-in (oblique). */
  minPitchDeg: number
  /** Pitch in degrees at full zoom-out (top-down). */
  maxPitchDeg: number
}

/** Range, step and label of every {@link CameraTuningParams} field. */
export const CAMERA_CONTROLS: ControlTable<CameraTuningParams> = {
  panSpeed: { kind: 'number', min: 1, max: 30, step: 0.5, label: 'pan speed' },
  zoomSpeed: { kind: 'number', min: 0.005, max: 0.02, step: 0.001, label: 'zoom speed' },
  smoothingTau: { kind: 'number', min: 0.02, max: 0.5, step: 0.01, label: 'inertia (s)' },
  enableDrag: { kind: 'boolean', label: 'drag-pan' },
  enableEdgeScroll: { kind: 'boolean', label: 'edge-scroll' },
  edgeScrollSpeed: { kind: 'number', min: 1, max: 30, step: 0.5, label: 'edge speed' },
  minDistance: { kind: 'number', min: 0.5, max: 8, step: 0.25, label: 'min distance (in)' },
  maxDistance: { kind: 'number', min: 2, max: 15, step: 0.25, label: 'max distance (out)' },
  minPitchDeg: { kind: 'number', min: 20, max: 89, step: 1, label: 'pitch in (oblique)' },
  maxPitchDeg: { kind: 'number', min: 20, max: 89, step: 1, label: 'pitch out (top-down)' },
}

/** Display order of the camera-feel controls. */
export const CAMERA_CONTROL_ORDER: (keyof CameraTuningParams)[] = [
  'panSpeed',
  'zoomSpeed',
  'smoothingTau',
  'enableDrag',
  'enableEdgeScroll',
  'edgeScrollSpeed',
  'minDistance',
  'maxDistance',
  'minPitchDeg',
  'maxPitchDeg',
]

/** Camera-feel defaults (the inertia is overridden to near-zero under `prefers-reduced-motion`). */
export const DEFAULT_CAMERA_TUNING: CameraTuningParams = {
  panSpeed: 8,
  zoomSpeed: 0.01,
  smoothingTau: 0.12,
  enableDrag: true,
  enableEdgeScroll: true,
  // World units per second at full zoom-out, scaled down as the camera comes in. The map plane is 12
  // across, so 8 crossed the whole of Europe in a second and a half — faster than the eye can follow a
  // coastline. 4 takes three seconds, which is about the pace of a deliberate look around.
  edgeScrollSpeed: 4,
  minDistance: 1,
  maxDistance: 6,
  minPitchDeg: 30,
  maxPitchDeg: 55,
}

/** Every declared control table, paired with its defaults and display order — used by the guard tests. */
export const ALL_CONTROL_TABLES = [
  {
    name: 'relief',
    controls: RELIEF_CONTROLS,
    defaults: DEFAULT_RELIEF_PARAMS,
    order: RELIEF_CONTROL_ORDER,
  },
  {
    name: 'coastline',
    controls: COASTLINE_CONTROLS,
    defaults: DEFAULT_COASTLINE_PARAMS,
    order: COASTLINE_CONTROL_ORDER,
  },
  {
    name: 'rhumb',
    controls: RHUMB_CONTROLS,
    defaults: DEFAULT_RHUMB_PARAMS,
    order: RHUMB_CONTROL_ORDER,
  },
  {
    name: 'rose',
    controls: ROSE_CONTROLS,
    defaults: DEFAULT_ROSE_PARAMS,
    order: ROSE_CONTROL_ORDER,
  },
  {
    name: 'river',
    controls: RIVER_CONTROLS,
    defaults: DEFAULT_RIVER_PARAMS,
    order: RIVER_CONTROL_ORDER,
  },
  {
    name: 'political',
    controls: POLITICAL_CONTROLS,
    defaults: DEFAULT_POLITICAL_PARAMS,
    order: POLITICAL_CONTROL_ORDER,
  },
  {
    name: 'extent',
    controls: EXTENT_CONTROLS,
    defaults: DEFAULT_EXTENT_PARAMS,
    order: EXTENT_CONTROL_ORDER,
  },
  {
    name: 'camera',
    controls: CAMERA_CONTROLS,
    defaults: DEFAULT_CAMERA_TUNING,
    order: CAMERA_CONTROL_ORDER,
  },
] as const

/**
 * A flat control list rendered as one group — the shape the grouping check expects.
 * @param title - the group's heading
 * @param keys - the fields it contains, in display order
 * @returns the group
 */
export function asGroup(
  title: string,
  keys: readonly PropertyKey[]
): { title: string; keys: PropertyKey[] } {
  return { title, keys: [...keys] }
}
