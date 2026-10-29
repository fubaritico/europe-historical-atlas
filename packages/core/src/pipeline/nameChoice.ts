/**
 * How a name's place is chosen among its candidates (ATLAS-301): every candidate is measured on a few readable
 * criteria, and the best score wins — the dev's algorithm, 2026-10-28: *« on collecte, on teste, on compare et on
 * affiche (par label) »*. Size and the margin to the borders are criteria, not rules: a name may come close to a
 * border, as on the reference maps, and pays for it in its score.
 */

/** How much each criterion weighs in a candidate's score — tuned in the atlas's settings panel. */
export interface NameWeights {
  /** The reward for the size, relative to the largest any candidate of the piece reaches. */
  readonly size: number
  /** The penalty for the name's middle lying off the space's centre of mass, relative to the space's reach. */
  readonly centre: number
  /** The penalty for covering more or less of the space's length than {@link COVER_TARGET}. */
  readonly cover: number
  /** The penalty for the line's bend, relative to the most a line may bend. */
  readonly bend: number
  /** The penalty for the name's slant from the horizontal, a standing name the most. */
  readonly slant: number
  /** The penalty for a name that does not keep the margin — written up to the borders, or spilling over them. */
  readonly border: number
  /** The penalty for a name broken over two lines. */
  readonly twoLines: number
}

/**
 * The weights the atlas starts from — Claude's, 2026-10-28, to tune on the map: size and centring first, the
 * coverage next, the rest as tie-breakers. The border's lowered from 0.3 to 0.1 the same night, so a name spills over
 * its borders whenever that makes it larger (the dev: *« il faut qu'on arrive à afficher un maximum de choses »*).
 */
export const DEFAULT_NAME_WEIGHTS: NameWeights = {
  size: 1,
  centre: 1,
  cover: 0.5,
  bend: 0.2,
  slant: 0.3,
  border: 0.1,
  twoLines: 0.4,
}

/** The share of a space's length a name aims to cover — about two thirds, as on the dev's reference maps. */
export const COVER_TARGET = 2 / 3

/** What a candidate is judged on, each a plain number. */
export interface NameFeatures {
  /** Its size, in cells. */
  readonly size: number
  /** How far its middle lies from the space's centre of mass, over the space's reach — `0` on the centre. */
  readonly offCentre: number
  /** The share of the space's length it covers. */
  readonly cover: number
  /** Its line's bend, over the most a line may bend — `0` straight, `1` at the most. */
  readonly bend: number
  /** Its slant from the horizontal, over a quarter turn — `0` level, `1` standing. */
  readonly slant: number
  /** Whether it does not keep the margin — written up to the borders, or spilling over them. */
  readonly touchesBorder: boolean
  /** Whether it is broken over two lines. */
  readonly twoLines: boolean
}

/**
 * A candidate's score: the higher, the better.
 * @param features - what the candidate is judged on
 * @param largest - the largest size any candidate of the same piece reaches
 * @param weights - how much each criterion weighs
 * @returns the score
 */
export function scoreName(features: NameFeatures, largest: number, weights: NameWeights): number {
  return (
    weights.size * (largest > 0 ? features.size / largest : 0) -
    weights.centre * Math.min(1, features.offCentre) -
    weights.cover * Math.abs(features.cover - COVER_TARGET) -
    weights.bend * features.bend -
    weights.slant * features.slant -
    weights.border * (features.touchesBorder ? 1 : 0) -
    weights.twoLines * (features.twoLines ? 1 : 0)
  )
}

/**
 * A line's slant from the horizontal, over a quarter turn.
 * @param angle - its direction, radians
 * @returns `0` level, `1` standing
 */
export function slantOf(angle: number): number {
  const turned = ((angle % Math.PI) + Math.PI) % Math.PI
  return Math.min(turned, Math.PI - turned) / (Math.PI / 2)
}
