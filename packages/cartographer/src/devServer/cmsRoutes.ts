/**
 * The routes of the dev server's two CMS endpoints — the one contract the browser and the server share. A module of its
 * own, importing nothing, as the year endpoint's route is, so the application can name them without pulling the
 * endpoints into its bundle.
 */

/**
 * The session's endpoint (CARTO-535). Under it: `GET /` who is signed in, `POST /login`, `POST /logout`,
 * `POST /refresh`. **503** when the CMS does not answer, **401** when it refuses the address and the password.
 */
export const CMS_SESSION_ROUTE = '/__cms/session'

/**
 * « Ajouter au CMS » (CARTO-498): `POST` creates a polity's territory with the session of whoever is signed in. The two
 * statuses the page acts on: **503** when the CMS does not answer (the page asks to start it and try again), **401**
 * when nobody is signed in or the CMS refuses the session (the page opens the session's dialogue).
 */
export const CMS_TERRITORY_ROUTE = '/__cms/territories'
