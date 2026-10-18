/**
 * A tribe's **vanishing edge** — its colour full at the heart of its ground, dissolving toward its limit,
 * with no stroke (ATLAS-258, the dev's option A of 2026-10-18: the dashed outline *« ça fonctionne pas.
 * C'est pas beau »*; a people's limit is vague).
 *
 * **One ramp, two placements**, the dev's *« Essayons les deux »*:
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

/** Where the fade sits against the outline. */
export type FeatherMode = 'inset' | 'outset'

/** The two placements, in the order a dev-panel dropdown lists them. */
export const FEATHER_MODES: readonly FeatherMode[] = ['inset', 'outset']

/** How a tribe's edge dissolves. */
export interface TribeFeather {
  /** Inside or outside the outline. */
  mode: FeatherMode
  /** How wide the fade is, in kilometres on the ground. */
  widthKm: number
}

/**
 * **The default: inset, 30 km — the dev's call of 2026-10-18**, on seeing the first fade in the atlas:
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
export const TRIBE_FEATHER: Readonly<TribeFeather> = { mode: 'inset', widthKm: 30 }

/**
 * The farthest a fade may reach, in kilometres — the most the dev panel's width slider allows, and so how
 * far from its outline a tribe's signed distance is worth computing and how far past it the atlas's mesh and
 * the Cartographer's image extend.
 */
export const TRIBE_FEATHER_REACH_KM = 60

/**
 * The shift of a mode: how far outside the outline the ramp is full, in kilometres.
 * @param mode - inside or outside the outline
 * @param widthKm - the fade's width
 * @returns `0` for inset, `widthKm` for outset
 */
export function featherShiftKm(mode: FeatherMode, widthKm: number): number {
  return mode === 'outset' ? widthKm : 0
}

/**
 * The colour's opacity at a signed distance from a tribe's outline.
 *
 * **A width of zero or less is a hard edge**: full inside (and on the outline in outset), nothing outside.
 * A NaN distance or width stays NaN, so a broken value shows rather than reading as a plausible opacity.
 * @param signedKm - the distance to the outline in km, negative inside (`geo/signedDistance`)
 * @param widthKm - the fade's width in km
 * @param mode - inside or outside the outline
 * @returns the opacity, `0..1`
 */
export function featherOpacity(signedKm: number, widthKm: number, mode: FeatherMode): number {
  if (Number.isNaN(signedKm) || Number.isNaN(widthKm)) return Number.NaN
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
 * @returns the opacity, as {@link tribeOpacity}'s
 */
export function tribeOpacityAt(
  signedKm: number,
  feather: TribeFeather,
  beyond: () => Pick<TribePoint, 'claimedKm' | 'land'>
): number {
  const ramp = featherOpacity(signedKm, feather.widthKm, feather.mode)
  if (Number.isNaN(ramp) || !(signedKm >= BEYOND_OUTLINE_KM) || ramp === 0) return ramp
  const { claimedKm, land } = beyond()
  if (Number.isNaN(claimedKm)) return Number.NaN
  return claimedKm < 0 || !land ? 0 : ramp
}
