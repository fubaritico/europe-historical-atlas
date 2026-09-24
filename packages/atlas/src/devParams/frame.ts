/**
 * The sheet the map is printed on, and the graduated border that frames it.
 *
 * One group of the dev-panel declaration table: the param shape, its defaults, the range and label
 * of every control, and the display order — declared side by side so a default cannot drift outside its
 * own slider without failing type-check.
 */

import type { ControlTable } from '@europe-historical-atlas/core/utils/controlSpec'

/**
 * The paper around the map, and the neatline between the two.
 *
 * There is no paper colour or grain here on purpose: both are the terrain's, read from its own options.
 * The margin continues the water it abuts and carries the very same fibre, sampled from the same field,
 * so the sheet reads as one surface with a map printed on part of it.
 */
export interface FrameDevParams {
  /** Draw the sheet and its border at all. */
  show: boolean
  /** How far the paper reaches beyond the map, in world units. */
  sheetMargin: number
  /** Thickness of the checkered band, in world units. */
  bandWidth: number
  /** Degrees per alternation — one dark block per this many degrees of longitude or latitude. */
  bandStepDeg: number
  /** The band's dark ink. */
  ink: string
  /** How opaque the dark blocks are. Below one the vellum reads through and the band settles into it. */
  bandOpacity: number
  /** Thickness of the fine rules closing the band on both sides. Zero draws none. */
  ruleWidth: number
  /** Width of the lane beyond the band where the degree labels sit. */
  labelLaneWidth: number
  /** Degrees between written numbers. Crowding is the risk: this map spans 124 degrees of longitude. */
  labelStepDeg: number
  /** The numbers' own ink, browner than the band's — they are written, not ruled. */
  labelInk: string
  /** How far the glyph outlines are eaten by the paper, in atlas pixels. Zero prints them clean. */
  labelRoughness: number
  /** How opaque the numbers are. */
  labelOpacity: number
  /** How far above the sea the whole frame sits, clear of the terrain it abuts. */
  lift: number
  /** Cut the map's edge into a wall, so it reads as a slab rather than a surface. */
  edgeShow: boolean
  /** How far below sea level the sheet's own thickness reaches, in world units. */
  edgeDepth: number
  /** The soil just under the land's surface. */
  edgeSoil: string
  /** The soil at sea level, deeper and darker. */
  edgeDeep: string
  /** The sheet's cut edge, below sea level. */
  edgeBase: string
  /** How many bands of strata show in the cut. Zero leaves a clean gradient. */
  edgeStrata: number
  /** Print the atlas's name in the margin below the map. */
  titleShow: boolean
  /** Height of the title's own block, in world units. The lettering fills about half of it. */
  titleSize: number
  /** How far below the border's outer rule the title's centre sits. */
  titleOffset: number
  /** The title's ink. */
  titleInk: string
  /** How opaque it is. */
  titleOpacity: number
  /** How far its outlines are eaten by the paper, in atlas pixels. Zero prints them clean. */
  titleRoughness: number
}

/**
 * A sober chart border, proportioned from Ortelius (1594): a thin band whose blocks are wider than it
 * is thick, closed by a hairline rule either side, and nothing protruding from it.
 */
export const DEFAULT_FRAME_PARAMS: FrameDevParams = {
  show: true,
  // Just past the extent the camera is clamped within, and no further: every extra unit of paper is
  // spread over the same texture, so the fibre coarsens for margin nobody can reach.
  sheetMargin: 1,
  // Thin, with long blocks: at two degrees each the longitude blocks are 0.194 wide against a band
  // 0.04 thick, so they run about five times longer than the band is deep. The reference's blocks are
  // elongated, and one degree came out too square on a map this wide.
  bandWidth: 0.04,
  bandStepDeg: 2,
  // Nearly black, as an engraving is, and **opaque**: the light blocks are the paper showing through,
  // so the band's whole reading rests on how far the dark ones are from it. Letting the fibre read
  // through the ink as well was tried and dropped on screen — it cost the contrast and bought nothing
  // the light blocks were not already giving.
  ink: '#1a120b',
  bandOpacity: 1,
  ruleWidth: 0.008,
  labelLaneWidth: 0.16,
  // Thirteen numbers across and seven down. Every ten degrees, as the reference does.
  labelStepDeg: 10,
  // The band's own ink. A browner number was tried — a ruled line and a written number are not the same
  // mark — and read as faded rather than as a different hand; the roughness below is what separates
  // them instead.
  labelInk: '#1a120b',
  labelRoughness: 1.1,
  labelOpacity: 0.88,
  lift: 0.004,
  edgeShow: true,
  // **Set on screen, and it is the knob to suspect if the band's light blocks stop being paper.**
  // `createMapEdge` builds two walls. The *section* — sea level up to the land's surface — exists only
  // where there is land at the map's boundary, which is where a thickness should read. The *board* is
  // this one: a uniform skirt below sea level running the whole way round, open ocean included. On
  // screen "downward" and "outward" are the same direction as soon as the camera tilts, so the board
  // projects across the margin; measured 2026-09-18, 0.06 of depth covered 23 px against a 17 px band
  // and turned its transparent blocks into a flat slab. The clean answer is to carry the thickness on
  // the *sheet's* outer edge instead of the map's, which is not built yet.
  edgeDepth: 0,
  // Dark. A cut through ground is in shadow by definition — it faces sideways, away from the light the
  // hillshade is baked from, and a section the same value as the parchment reads as a fold in the paper.
  edgeSoil: '#54402a',
  edgeDeep: '#1a120b',
  edgeBase: '#5f5342',
  edgeStrata: 3,
  titleShow: true,
  // The margin is about 0.78 deep between the outer rule and the sheet's edge; a block a third of that
  // leaves paper either side of the name rather than filling the margin with it.
  titleSize: 0.34,
  titleOffset: 0.22,
  // Darker than the numbers and darker than the band's brown was: a title is set, not ruled, and it is
  // the one thing in the margin that should read at a glance.
  titleInk: '#2a1d14',
  titleOpacity: 0.9,
  titleRoughness: 1.4,
}

/** Range, step and label of every {@link FrameDevParams} field. */
export const FRAME_CONTROLS: ControlTable<FrameDevParams> = {
  show: { kind: 'boolean', label: 'show sheet + border' },
  sheetMargin: { kind: 'number', min: 0, max: 8, step: 0.1, label: 'paper margin' },
  bandWidth: { kind: 'number', min: 0.01, max: 0.4, step: 0.005, label: 'band thickness' },
  bandStepDeg: { kind: 'number', min: 0.5, max: 10, step: 0.5, label: 'degrees per block' },
  ink: { kind: 'color', label: 'band ink' },
  bandOpacity: { kind: 'number', min: 0.2, max: 1, step: 0.01, label: 'band opacity' },
  ruleWidth: { kind: 'number', min: 0, max: 0.05, step: 0.001, label: 'rule thickness' },
  labelLaneWidth: { kind: 'number', min: 0, max: 0.5, step: 0.01, label: 'label lane' },
  labelStepDeg: { kind: 'number', min: 1, max: 30, step: 1, label: 'degrees per number' },
  labelInk: { kind: 'color', label: 'number ink' },
  labelRoughness: { kind: 'number', min: 0, max: 4, step: 0.1, label: 'number roughness' },
  labelOpacity: { kind: 'number', min: 0.2, max: 1, step: 0.01, label: 'number opacity' },
  lift: { kind: 'number', min: 0, max: 0.05, step: 0.001, label: 'lift above sea' },
  edgeShow: { kind: 'boolean', label: 'cut the edge' },
  edgeDepth: {
    kind: 'number',
    min: 0,
    max: 0.4,
    step: 0.005,
    label: 'board thickness (eats the band)',
  },
  edgeSoil: { kind: 'color', label: 'soil (surface)' },
  edgeDeep: { kind: 'color', label: 'soil (deep)' },
  edgeBase: { kind: 'color', label: 'board edge' },
  edgeStrata: { kind: 'number', min: 0, max: 16, step: 1, label: 'strata' },
  titleShow: { kind: 'boolean', label: 'print the title' },
  titleSize: { kind: 'number', min: 0.05, max: 1.2, step: 0.01, label: 'title size' },
  titleOffset: { kind: 'number', min: 0, max: 2, step: 0.01, label: 'title offset' },
  titleInk: { kind: 'color', label: 'title ink' },
  titleOpacity: { kind: 'number', min: 0.2, max: 1, step: 0.01, label: 'title opacity' },
  titleRoughness: { kind: 'number', min: 0, max: 6, step: 0.1, label: 'title roughness' },
}

/** Display order of the frame controls. */
export const FRAME_CONTROL_ORDER: (keyof FrameDevParams)[] = [
  'show',
  'sheetMargin',
  'bandWidth',
  'bandStepDeg',
  'ink',
  'bandOpacity',
  'ruleWidth',
  'labelLaneWidth',
  'labelStepDeg',
  'labelInk',
  'labelRoughness',
  'labelOpacity',
  'lift',
  'edgeShow',
  'edgeDepth',
  'edgeSoil',
  'edgeDeep',
  'edgeBase',
  'edgeStrata',
  'titleShow',
  'titleSize',
  'titleOffset',
  'titleInk',
  'titleOpacity',
  'titleRoughness',
]
