/**
 * The face the countries' names are written in: Fondamento (SIL Open Font License 1.1, `face/fondamento-OFL.txt`),
 * chosen by the dev on the bench, 2026-10-28. The Latin subset Google Fonts serves; cut to the names' own letters at
 * build later (step 5 of `files/plans/atlas/country-names.md`).
 */

/** The family the face is registered under — the atlas's own, so no page style can stand in for it. */
export const NAME_FAMILY = 'atlas-names'

/** Where the face's file is served from — rewritten by the bundler to the built asset. */
export const NAME_FACE_URL = new URL('./face/fondamento.woff2', import.meta.url).href
