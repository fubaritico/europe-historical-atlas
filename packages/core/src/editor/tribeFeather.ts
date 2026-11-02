/**
 * A tribe's **limit** — how its colour meets the edge of its ground, with no stroke (ATLAS-258, the dev's option A of
 * 2026-10-18: the dashed outline *« ça fonctionne pas. C'est pas beau »*; a people's limit is vague).
 *
 * **The default since 2026-11-02 is the band** (ATLAS-344): Illustrator's offset path inwards — half the colour from the
 * outline to an inner offset whose width undulates ({@link bandWidthKm}), the full colour deeper, no fade. The dev: *"we
 * have created a cartographic language — the notion of uncertainty is well represented"*. It stays inside the outline,
 * so no neighbour's ground is measured for it.
 *
 * **Before it, one ramp in two placements**, the dev's *« Essayons les deux »*, kept as choices:
 * - **inset** — full colour `widthKm` inside the outline, nothing at the outline: it fades out before the edge;
 * - **outset** — full colour at the outline, nothing `widthKm` outside: it spills past the edge and fades.
 *
 * **The one home of the look, read by both applications** — the atlas's shader and the Cartographer's alpha
 * image ask this module the same question with the same signed distance (`geo/signedDistance`), so the two
 * cannot drift — as long as both read the default. **The trial is the atlas's alone** (ARCH-004): its dev
 * panel overrides mode and width live, and the Cartographer, which has no such panel, keeps following
 * {@link TRIBE_FEATHER}. While a trial value differs, the two applications differ; **the value the dev
 * chooses is copied into `TRIBE_FEATHER`**, which is what restores the parity.
 *
 * **Written as one formula**: `ease((shift − d) / w)`, the shift `0` for inset and `w` for outset, the ease a
 * smoothstep — so a shader gets the same curve from GLSL's own `smoothstep(0, 1, t)` and a `shift` uniform
 * computed here, never a second copy of the mode's meaning.
 */

/**
 * How a tribe meets its limit: a fade inside or outside the outline — or, since 2026-11-02, **the band**: Illustrator's
 * offset path drawn inwards (the dev: *"the shape drawn, and inside it an inner offset; the full colour, and the
 * offset band at half"*), two flat tones and no fade. Nothing spills past the outline in `inset` or `band`, so no
 * neighbour's ground is ever measured — what made the Kimek-Kipchak cost 5 s on the dev's 1100.
 */
export type FeatherMode = 'band' | 'inset' | 'outset'

/** The placements, in the order a dev-panel dropdown lists them — the band, the default, first. */
export const FEATHER_MODES: readonly FeatherMode[] = ['band', 'inset', 'outset']

/** The band's share of the full colour, between the outline and the inner offset (the dev, 2026-11-02: "half"). */
export const BAND_SHARE = 0.5

/** How a tribe's edge dissolves. */
export interface TribeFeather {
  /** Inside or outside the outline. */
  mode: FeatherMode
  /** How wide the fade is, in kilometres on the ground — the band's mean width. */
  widthKm: number
  /**
   * How much the band's width undulates along the outline, `0` even, `1` from nothing to twice the mean (the dev,
   * 2026-11-02: *"sometimes wider, sometimes thicker, to show the variation"*). The band only; a fade ignores it.
   * **Absent, the band is even** — what it means, not a value standing in for one that failed to arrive.
   */
  irregularity?: number
  /** The undulation's wavelength, in kilometres on the ground — roughly; a decoration. Absent: {@link BAND_WAVE_KM}. */
  waveKm?: number
}

/** The undulation's wavelength when a feather names none, km — and the default's. */
export const BAND_WAVE_KM = 150

/**
 * **The default: the band, 30 km on average, undulating by half over about 150 km** (the dev, 2026-11-02). **Before it,
 * inset at 30 km — the dev's call of 2026-10-18**, on seeing the first fade in the atlas, and what follows measured it:
 * *« il faudrait que le dégradé du flou soit deux fois plus étalé »*, twice Claude's 15 km.
 *
 * What it costs, measured on the thirteen tribes of 1100 by their deepest point (the farthest any of their
 * ground lies from their outline): 22 km for the Semigallians and 26 for the Curonians, the two narrowest,
 * 44 to 89 for the other Baltic peoples, 51 to 148 for the Vlachs, the Pechenegs, the Cumans and the Khazars.
 * In inset a tribe is at full colour only deeper than the width, so at 30 km those two never reach it — they
 * peak at 0.83 and 0.95 — while the others keep 12 % (the Obotrites) to 69 % (the Khazars) of their ground at full colour. Claude's 15 km, the first default, kept every
 * tribe at full colour somewhere; the dev chose the softer edge. Inset first because then a tribe's colour
 * never lies on a neighbour's; outset is the trial's other half.
 *
 * At 30 km the fade spans about five DEM cells at the Baltic's latitude (6 km a cell) and four at 45°N — the
 * atlas has several vertices across it, and the Cartographer several backdrop pixels.
 */
export const TRIBE_FEATHER: Readonly<Required<TribeFeather>> = {
  mode: 'band',
  widthKm: 30,
  irregularity: 0.5,
  waveKm: BAND_WAVE_KM,
}

/**
 * The farthest a fade may reach, in kilometres — the most the dev panel's width slider allows, and so how
 * far from its outline a tribe's signed distance is worth computing and how far past it the atlas's mesh and
 * the Cartographer's image extend.
 */
export const TRIBE_FEATHER_REACH_KM = 60

/**
 * Kilometres across one unit of the frame's `u` and `v` — about the width of the atlas's frame at 50° N (124° of
 * longitude). **Only the undulation reads it**, a decoration: being a little off moves where the band widens, never
 * whether the drawing is right.
 */
export const BAND_KM_PER_UNIT = 8000

/**
 * The band's undulation at a point of the frame, `-1..1`: three waves of three directions and lengths around
 * `waveKm`, summed — smooth, fixed (the same map at each opening), and with no visible repeat. **Written again in GLSL**
 * by the atlas's tribe shader, term for term (`BAND_WAVE_GLSL`); the atlas's test compares the two at fixed points.
 * @param u - across the frame, `0..1`
 * @param v - down the frame, `0..1`
 * @param waveKm - the wavelength, km
 * @returns the undulation
 */
export function bandWave(u: number, v: number, waveKm: number): number {
  const k = (2 * Math.PI) / Math.max(1, waveKm)
  const x = u * BAND_KM_PER_UNIT
  const y = v * BAND_KM_PER_UNIT
  return (
    (Math.sin(k * (0.83 * x + 0.56 * y) + 1.3) +
      Math.sin(1.37 * k * (-0.41 * x + 0.91 * y) + 4.1) +
      Math.sin(0.71 * k * (0.97 * x - 0.24 * y) + 2.7)) /
    3
  )
}

/**
 * The band's width at a point: the mean width, undulating by the irregularity, never below nought nor past the reach
 * the distances are computed to.
 * @param feather - the width, the irregularity and the wavelength
 * @param u - across the frame, `0..1`
 * @param v - down the frame, `0..1`
 * @returns the width there, km
 */
export function bandWidthKm(feather: TribeFeather, u: number, v: number): number {
  const irregularity = feather.irregularity ?? 0
  if (irregularity === 0) return Math.min(TRIBE_FEATHER_REACH_KM, Math.max(0, feather.widthKm))
  const width =
    feather.widthKm * (1 + irregularity * bandWave(u, v, feather.waveKm ?? BAND_WAVE_KM))
  return Math.min(TRIBE_FEATHER_REACH_KM, Math.max(0, width))
}

/**
 * How deep a tribe's signed distance must be computed for its limit to be drawn right: the band's widest where it
 * undulates, the fade's width otherwise — never past {@link TRIBE_FEATHER_REACH_KM}. **The one place this is worked
 * out**: {@link bandWidthKm} never returns more (its test holds the two together).
 * @param feather - the mode, the width and the undulation
 * @returns the depth, km
 */
export function featherReachKm(feather: TribeFeather): number {
  const widest =
    feather.mode === 'band' ? feather.widthKm * (1 + (feather.irregularity ?? 0)) : feather.widthKm
  return Math.min(TRIBE_FEATHER_REACH_KM, Math.max(0, widest))
}

/**
 * The shift of a mode: how far outside the outline the ramp is full, in kilometres.
 * @param mode - inside or outside the outline
 * @param widthKm - the fade's width
 * @returns `widthKm` for outset, `0` for inset and the band, which stay inside
 */
export function featherShiftKm(mode: FeatherMode, widthKm: number): number {
  return mode === 'outset' ? widthKm : 0
}

/**
 * The colour's opacity at a signed distance from a tribe's outline.
 *
 * **A width of zero or less is a hard edge**: full inside (and on the outline in outset), nothing outside.
 * A NaN distance or width stays NaN, so a broken value shows rather than reading as a plausible opacity. **The band**
 * is no fade: {@link BAND_SHARE} from the outline to the width inside it, `1` deeper, `0` on the outline and past it.
 * @param signedKm - the distance to the outline in km, negative inside (`geo/signedDistance`)
 * @param widthKm - the fade's width in km
 * @param mode - inside or outside the outline
 * @returns the opacity, `0..1`
 */
export function featherOpacity(signedKm: number, widthKm: number, mode: FeatherMode): number {
  if (Number.isNaN(signedKm) || Number.isNaN(widthKm)) return Number.NaN
  // The band: nothing on or past the outline, half the colour within the width, the full colour deeper.
  if (mode === 'band') return signedKm >= 0 ? 0 : -signedKm < widthKm ? BAND_SHARE : 1
  if (widthKm <= 0) return (mode === 'outset' ? signedKm <= 0 : signedKm < 0) ? 1 : 0
  const t = Math.min(1, Math.max(0, (featherShiftKm(mode, widthKm) - signedKm) / widthKm))
  return t * t * (3 - 2 * t)
}

/**
 * How far from the other polities' ground the cut needs their signed distance, in km — a little over a DEM
 * cell's diagonal at the map's south edge, so a triangle or a pixel straddling a neighbour's outline has its
 * true distance at both ends and the cut falls on the outline, not a cell off it.
 */
export const CLAIM_CUT_REACH_KM = 20

/** What decides a tribe's opacity at one point. */
export interface TribePoint {
  /** The signed distance to the tribe's own outline, km, negative inside (`geo/signedDistance`). */
  signedKm: number
  /** The signed distance to every other polity's ground, km, negative inside any of it (`unionDistanceField`). */
  claimedKm: number
  /** Whether the point is land. */
  land: boolean
}

/**
 * How far past its outline a point must lie to count as beyond it, in km — a millimetre: the atlas's shader
 * cuts at the same threshold (`step(BEYOND_OUTLINE_KM, d)`, its GLSL written from this constant), so a vertex
 * on the outline whose interpolated distance drifts a hair above zero is still read as on it, and the two
 * applications cut at the same place.
 */
export const BEYOND_OUTLINE_KM = 1e-6

/**
 * A tribe's opacity at a point: the ramp, **cut beyond its outline wherever the ground is another polity's
 * or the sea** (the dev, 2026-10-18: *« si ça déborde, c'est pas bon »* — a tribe's colour never covers
 * another polity's territory, sovereign or not).
 *
 * Inside its own outline the tribe is coloured as a fill would be — lakes included, as a fill paints them;
 * beyond it, an outset fade lies only on land nobody claims, as a fill never paints the sea. Inset never
 * reaches beyond the outline, so the cut changes nothing there.
 * @param at - the distances and the land at the point
 * @param feather - inset or outset, and the width
 * @returns the opacity, `0..1`; NaN when the distance or the width is NaN, or a neighbour's distance is NaN
 *   where it is read
 */
export function tribeOpacity(at: TribePoint, feather: TribeFeather): number {
  return tribeOpacityAt(at.signedKm, feather, () => at)
}

/**
 * {@link tribeOpacity}, asking for the neighbours' distance and the land **only where they decide**: beyond
 * the outline, where the ramp is not already nothing — so in inset never, and in outset only within the
 * width past the outline (QUAL-003: a raster measures them once per pixel, and most pixels do not need them).
 * @param signedKm - the distance to the tribe's own outline, km, negative inside
 * @param feather - inset or outset, and the width
 * @param beyond - the neighbours' distance and the land at the point, asked for at most once
 * @param at - where the point is in the frame, for the band's undulating width; without it, the mean width
 * @param at.u - across the frame, `0..1`
 * @param at.v - down the frame, `0..1`
 * @param at.u
 * @param at.v
 * @returns the opacity, as {@link tribeOpacity}'s
 */
export function tribeOpacityAt(
  signedKm: number,
  feather: TribeFeather,
  beyond: () => Pick<TribePoint, 'claimedKm' | 'land'>,
  at?: { readonly u: number; readonly v: number }
): number {
  // The band's width undulates with the point; a fade, or a point not given, keeps the mean width.
  const width =
    feather.mode === 'band' && at !== undefined ? bandWidthKm(feather, at.u, at.v) : feather.widthKm
  const ramp = featherOpacity(signedKm, width, feather.mode)
  if (Number.isNaN(ramp) || !(signedKm >= BEYOND_OUTLINE_KM) || ramp === 0) return ramp
  const { claimedKm, land } = beyond()
  if (Number.isNaN(claimedKm)) return Number.NaN
  return claimedKm < 0 || !land ? 0 : ramp
}
