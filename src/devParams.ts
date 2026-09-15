/**
 * What the dev panel can tune: the param shapes, their defaults, and the range/label of each control —
 * all declared together.
 *
 * Deliberately free of any rendering-library import: `devPanel.ts` renders these declarations with
 * lil-gui, `main.ts` seeds its live objects from the defaults, and tests can check both without a DOM.
 * Keeping the three apart is what previously allowed a default to sit outside its own slider unnoticed.
 */

import type { ControlTable } from './utils/controlSpec'

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
  edgeScrollSpeed: 8,
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

/** A flat control list rendered as one group — the shape the grouping check expects. */
export function asGroup(
  title: string,
  keys: readonly PropertyKey[]
): { title: string; keys: PropertyKey[] } {
  return { title, keys: [...keys] }
}
