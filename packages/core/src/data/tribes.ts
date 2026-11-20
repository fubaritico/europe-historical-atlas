import type { DerivedBorder } from './derivedBorders'
import type { YearPolity } from './yearFormat'

/**
 * A **tribe** is a people not yet sovereign — the Prussians, the Cumans, the Obotrites — and it is drawn as
 * one: **no fill and no border, its colour full at the heart of its ground and vanishing toward its limit**
 * (`tribeFeather`, ATLAS-258, the dev's option A of 2026-10-18: a people's limit is vague). It replaced the
 * dashed outline of 2026-10-15, which he judged *« ça fonctionne pas. C'est pas beau »*; the colour is still
 * the one a fill would have had (*« la couleur de remplissage sera plutôt la couleur des traits en
 * pointillés »*).
 *
 * **Read off the rank, a free text of the registry**: `confederation`, `tribe` or `tribe_outlined`, exactly — three ways
 * of drawing a people's limit ({@link tribeStyleOf}, CARTO-439 and CARTO-447). The rank is the author's word for
 * what a polity is, so it is also what decides how it is drawn; nothing else in the registry says it.
 *
 * **Its fading colour is its limit, except against a state**: a derived border between two tribes, or between
 * a tribe and the sea or unclaimed ground, is not drawn — a hard line along a limit drawn as vague would
 * contradict it. A border between a tribe and a polity that is not one **is** drawn — as that polity's
 * **frontier**, the one dark stroke it shows against ground no state holds, never as a border between two
 * states, whatever hand the pair would get (the dev, 2026-10-18: the state's border stays a solid line where a
 * tribe touches it, but *« on ne peut pas considérer une tribu comme un état »*). {@link asSeenAcrossTribes}.
 */

/**
 * The rank of a **tribe** — a small people, the Baltic ones (the dev, 2026-11-15, CARTO-447): drawn with a bare margin
 * along its limit, half its colour further in, full at its heart (`TRIBE_MARGIN_FEATHER`). Until that day it was the
 * band every tribe wore, which is the confederation's now.
 */
export const TRIBE_RANK = 'tribe'

/**
 * The rank of a **confederation of tribes** — several tribes, the great groups of Central Asia (the dev, 2026-11-15,
 * CARTO-447): half its colour along its limit, an undulating band, full deeper (`TRIBE_FEATHER`) — the look every tribe
 * had before.
 */
export const CONFEDERATION_RANK = 'confederation'

/**
 * The rank of a tribe drawn the other way round — **outlined** (the dev, 2026-11-13, CARTO-439: *« l'inverse de
 * tribu »*): its colour full along its limit, half further in, nothing at its heart (`TRIBE_OUTLINED_FEATHER`). A tribe
 * in every other respect: no fill, no border against another tribe.
 */
export const TRIBE_OUTLINED_RANK = 'tribe_outlined'

/**
 * The rank of a **distant country** — a state whose history the atlas does not tell, too far, with no direct dealings
 * with Europe: India, sub-Saharan Africa (the dev, 2026-11-15, CARTO-447). Drawn as an outlined tribe, its bands a little
 * wider (`TRIBE_DISTANT_FEATHER`); like a people, no fill and no border against another drawn so.
 */
export const DISTANT_RANK = 'distant'

/**
 * The rank of a **people known by its name alone** — the Sami, the Kvens (the dev, 2026-11-20, CARTO-487): a tribe in
 * every respect — no fill, no border against another people — whose colour is « none » (`yearFormat.NO_COLOUR`), so
 * nothing is drawn of it but its name. The Cartographer's form sets that colour when the rank is chosen.
 */
export const PEOPLE_RANK = 'people'

/**
 * How a people's limit is drawn, by its rank: `band` for a confederation, `outlined` for an outlined tribe, `margin` for
 * a tribe, `distant` for a distant country (CARTO-447).
 */
export type TribeStyle = 'band' | 'outlined' | 'margin' | 'distant'

/** A style a people is marked with across the worker — every one but the confederation's band, which is the default. */
export type MarkedTribeStyle = Exclude<TribeStyle, 'band'>

/** Each people's rank and the style it is drawn in — the one table both applications read. */
const STYLE_OF_RANK: Readonly<Record<string, TribeStyle>> = {
  [CONFEDERATION_RANK]: 'band',
  [TRIBE_OUTLINED_RANK]: 'outlined',
  [TRIBE_RANK]: 'margin',
  [DISTANT_RANK]: 'distant',
  // A tribe's margin, were it given a colour; it has none.
  [PEOPLE_RANK]: 'margin',
}

/**
 * Whether a polity is a **people** — a confederation, a tribe, an outlined tribe or a people known by its name alone:
 * no fill, **no border against another
 * people**, its name inverted. A distant country is not one: it keeps its borders (the dev, 2026-11-15, CARTO-447).
 * @param polity - the polity, its rank at least
 * @returns `true` when its rank is one of the four
 */
export function isTribe(polity: Pick<YearPolity, 'rank'>): boolean {
  const style = tribeStyleOf(polity)
  // The peoples' three styles by name — a people known by its name alone wears the tribe's — never « every style but
  // the distant country's »: a style added later is no people
  // until it is said to be one (review ARCH-002).
  return style === 'band' || style === 'outlined' || style === 'margin'
}

/**
 * Whether a polity is **drawn with no fill**, by a band at its limit — a people, or a distant country (CARTO-447).
 * @param polity - the polity, its rank at least
 * @returns `true` when its rank gives it a style
 */
export function isUnfilled(polity: Pick<YearPolity, 'rank'>): boolean {
  return tribeStyleOf(polity) !== null
}

/**
 * The ids of every distant country of a registry (CARTO-447) — whose names the atlas writes faint.
 * @param polities - the registry's polities
 * @returns their ids
 */
export function distantIds(polities: readonly Pick<YearPolity, 'id' | 'rank'>[]): Set<string> {
  return new Set(
    polities.filter((polity) => tribeStyleOf(polity) === 'distant').map((polity) => polity.id)
  )
}

/**
 * The ids of every polity of a registry drawn with no fill — the peoples and the distant countries.
 * @param polities - the registry's polities
 * @returns their ids
 */
export function unfilledIds(polities: readonly Pick<YearPolity, 'id' | 'rank'>[]): Set<string> {
  return new Set(polities.filter(isUnfilled).map((polity) => polity.id))
}

/**
 * How a people's limit is drawn.
 * @param polity - the polity, its rank at least
 * @returns its style, or `null` for a polity that is no people
 */
export function tribeStyleOf(polity: Pick<YearPolity, 'rank'>): TribeStyle | null {
  // A rank is free text: read the table's own keys only, never a name it inherits (`constructor`).
  const { rank } = polity
  return rank !== null && Object.hasOwn(STYLE_OF_RANK, rank) ? (STYLE_OF_RANK[rank] ?? null) : null
}

/**
 * The ids of every tribe of a registry.
 * @param polities - the registry's polities
 * @returns the ids of those that are tribes
 */
export function tribeIds(polities: readonly Pick<YearPolity, 'id' | 'rank'>[]): Set<string> {
  return new Set(polities.filter(isTribe).map((polity) => polity.id))
}

/**
 * Whether a derived border is a tribe's edge alone — tribes on every side it has, so no state's border runs
 * there and nothing is drawn: two tribes side by side, or a tribe against the sea or unclaimed ground.
 * @param border - the border, who it separates at least
 * @param tribes - the ids of the year's tribes
 * @returns `true` when one of the polities it separates is a tribe and none is anything else
 */
export function isTribeEdge(
  border: Pick<DerivedBorder, 'between'>,
  tribes: ReadonlySet<string>
): boolean {
  return border.between.length > 0 && border.between.every((id) => tribes.has(id))
}

/**
 * A border as both applications draw it once tribes are read: across a tribe, a state shows its frontier.
 *
 * A border with a tribe on one side and a state on the other is read as a frontier against unclaimed ground
 * — one dark stroke, at every zoom — and an authored hand on it is set aside: a tribe is not a state, so no
 * hand meant for a limit between two states applies there. Any other border comes back as it was. Tribes on
 * every side ({@link isTribeEdge}) are the caller's to drop before.
 * @param border - the derived border, who it separates, its relation and any authored hand
 * @param tribes - the ids of the year's tribes
 * @returns the border unchanged, or read as a frontier against unclaimed ground
 */
export function asSeenAcrossTribes<T extends Pick<DerivedBorder, 'between' | 'relation' | 'hand'>>(
  border: T,
  tribes: ReadonlySet<string>
): T {
  if (!border.between.some((id) => tribes.has(id))) return border
  return { ...border, relation: 'unclaimed', hand: null }
}
