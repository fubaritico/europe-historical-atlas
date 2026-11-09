/**
 * **The vassals' band** (ATLAS-398, the dev, 2026-11-09): a vassal's fill is drawn as a tribe's band is — Illustrator's
 * offset path inwards, half its colour from its outline to an inner offset, its full colour deeper — but **regular**
 * (no undulation) and **thinner** than a tribe's. Its purpose, in his words: *"that will make the white border stand
 * out"*; *"the detachment will be done by the combination of the white dashed border and the colour in
 * transparency"* — the day a vassal wears its suzerain's colour, which he sets in the data himself, not the code.
 *
 * **Only the fill changes**: a vassal keeps its borders, its name and its picking — it is not a tribe, and nothing here
 * reads `data/tribes` but to leave a tribe to its own look (a vassal that is also a tribe stays a tribe).
 *
 * **The one home of the look, read by both applications**: the atlas's fill shader (`scene/political/fills/fillShader`,
 * its CPU mirror tested against {@link vassalBandOpacity}) and the Cartographer's band image
 * (`canvas/paint/vassalBands`) ask the same question of the same signed distance (`geo/signedDistance`), with **one
 * width, a constant here** — no setting in the atlas's panel (the dev, 2026-11-09: *"we don't do settings like that any
 * more — that was for starting the project"*), so the two applications cannot differ.
 */

import { isTribe } from './tribes'

import type { HomageLevels } from './homageLevels'
import type { YearPolity } from './yearFormat'

/**
 * The band's share of the vassal's colour — half, the tribes' own (`editor/tribeFeather`'s `BAND_SHARE`, which `data/`
 * may not import: the editor reads the data, never the reverse). The vassals' test holds the two equal.
 */
export const VASSAL_BAND_SHARE = 0.5

/** The band's width, km — thinner than a tribe's 30 (the dev, 2026-11-09: *"thinner"*). Read by both applications. */
export const VASSAL_BAND_WIDTH_KM = 10

/**
 * How deep a vassal's signed distance is computed, km — twice the width: deeper than this every point reads
 * `-VASSAL_BAND_REACH_KM`, past the band and so at full colour. It must exceed the width, or no point would read deeper
 * than the band; the smaller, the cheaper the distance (its edges are filed in buckets the size of the reach).
 */
export const VASSAL_BAND_REACH_KM = 2 * VASSAL_BAND_WIDTH_KM

/**
 * Whether a polity's fill wears the vassals' band: it owes homage (`suzerain` set — the definition `homageLevels`
 * reads) and is not a tribe, which keeps its own band (`tribeFeather`).
 * @param polity - the polity, its suzerain and rank at least
 * @returns `true` for a vassal that is not a tribe
 */
export function isBandedVassal(polity: Pick<YearPolity, 'suzerain' | 'rank'>): boolean {
  return polity.suzerain !== null && !isTribe(polity)
}

/**
 * The ids of every polity of a registry whose fill wears the band.
 * @param polities - the registry's polities
 * @returns the ids of the vassals that are not tribes
 */
export function bandedVassalIds(
  polities: readonly Pick<YearPolity, 'id' | 'suzerain' | 'rank'>[]
): Set<string> {
  return new Set(polities.filter(isBandedVassal).map((polity) => polity.id))
}

/**
 * Each region's band depth: its polity's depth in the homage chain when it wears the band, `0` otherwise — the atlas
 * reveals a vassal's band as it reveals its colour, between the display levels `depth − 1` and `depth`.
 * @param regions - the year's regions, each with the id of its polity, in the order the fills are laid
 * @param banded - the ids of the polities wearing the band ({@link bandedVassalIds})
 * @param homage - the year's homage read as levels
 * @returns one depth per region; `0` for a region of no polity, of a sovereign or of a tribe
 */
export function regionBandDepths(
  regions: readonly { readonly polityId?: string | undefined }[],
  banded: ReadonlySet<string>,
  homage: Pick<HomageLevels, 'chainOf'>
): number[] {
  return regions.map(({ polityId }) =>
    polityId !== undefined && banded.has(polityId) ? homage.chainOf(polityId).length - 1 : 0
  )
}

/**
 * The share of a vassal's colour at a signed distance from its outline: {@link VASSAL_BAND_SHARE} from the outline to the
 * width inside it, the full colour deeper.
 *
 * **Not cut at the outline**, unlike a tribe's band: a vassal is a fill, whose own edge stops the colour — the band
 * asks only how deep a point lies, and a point on the outline, or a hair past it by rounding, is in the band.
 * **A width of zero or less is no band**: only the outline itself is at half, which no fill shows. A NaN distance or
 * width stays NaN, so a broken value shows rather than reading as a plausible share.
 * @param signedKm - the distance to the vassal's outline, km, negative inside (`geo/signedDistance`)
 * @param widthKm - the band's width, km
 * @returns the share of the colour, {@link VASSAL_BAND_SHARE} or `1`
 */
export function vassalBandOpacity(signedKm: number, widthKm: number): number {
  if (Number.isNaN(signedKm) || Number.isNaN(widthKm)) return Number.NaN
  return signedKm >= -widthKm ? VASSAL_BAND_SHARE : 1
}
