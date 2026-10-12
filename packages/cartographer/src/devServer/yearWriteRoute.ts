/**
 * The route the dev server's year endpoint is mounted on — the one contract the browser and the server
 * share. A module of its own, importing nothing, so the application can name the route without pulling the
 * endpoint's validation into its bundle. A leading `__` keeps it out of any real asset's way.
 */
export const YEAR_WRITE_ROUTE = '/__years'
