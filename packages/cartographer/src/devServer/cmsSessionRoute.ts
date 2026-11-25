/**
 * The route the dev server's session endpoint is mounted on (CARTO-535) — the one contract the browser and the server
 * share. Under it: `GET /` who is signed in, `POST /login`, `POST /logout`, `POST /refresh`. **503** when the CMS does
 * not answer, **401** when it refuses the address and the password. A module of its own, importing nothing, as the
 * year endpoint's route is.
 */
export const CMS_SESSION_ROUTE = '/__cms/session'
