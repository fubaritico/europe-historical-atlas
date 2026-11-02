/**
 * A city's importance on the map at a date — the order it is shown in as the zoom closes in (ATLAS-295,
 * `files/plans/atlas/cities.md`, decisions 1 and 3): the capitals from afar, the large cities with the vassals, the
 * other cities close up. A judgement with its reasons and its sources, never computed from a population (decision 4).
 * Held here because the CMS writes it and the atlas reads it.
 */
export const CITY_IMPORTANCES = ['capital', 'large-city', 'city'] as const

/** One of {@link CITY_IMPORTANCES}. */
export type CityImportance = (typeof CITY_IMPORTANCES)[number]

/**
 * What a source line of a city-at-a-date speaks about, so the tool can tell two figures of one population apart and
 * say whether they agree (decision 5b) — and, since CMS-335, which polity held the city at that date (`holder`).
 */
export const TESTIMONY_SUBJECTS = ['population', 'importance', 'reason', 'holder'] as const

/** One of {@link TESTIMONY_SUBJECTS}. */
export type TestimonySubject = (typeof TESTIMONY_SUBJECTS)[number]
