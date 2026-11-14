/**
 * A religious community attested in a city at a date (CMS-433, the dev, 2026-11-13): a city has no single religion —
 * Toledo in 1100 is Castilian, with Mozarabs, Muslims and Jews; Palermo is Norman, mostly Muslim and Greek — so a sheet
 * lists the communities its sources attest, each with its weight. Held here because the CMS writes it and the atlas
 * reads it.
 *
 * **The presence is proved, the weight may be supposed** (the dev, 2026-11-13: allowed, and marked): every community
 * has a source line that names it, but « dominant » is often the contributor's reading rather than the source's words.
 * So the weight carries its own mark — attested, or supposed — and the map is to show a supposed one as uncertain.
 */
export const COMMUNITY_WEIGHTS = ['dominant', 'present'] as const

/** One of {@link COMMUNITY_WEIGHTS}: the larger part of the city, or a quarter, a minority. */
export type CommunityWeight = (typeof COMMUNITY_WEIGHTS)[number]
