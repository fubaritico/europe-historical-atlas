/**
 * The route the dev server's draft endpoint is mounted on — shared by the browser and the server, importing
 * nothing, like `yearWriteRoute.ts`. A draft is the work since the last ‹ctrl+S›, kept on disk so that a
 * closed tab, a crash or a power cut loses at most a couple of seconds (CARTO-238).
 */
export const DRAFT_ROUTE = '/__drafts'

/**
 * Where the drafts are kept, from the repository's root — the one spelling of it: the dev server builds its
 * folder from it (`vite.config.ts`) and the page names it to the author when a draft is set aside.
 * Outside `public/`, which the dev server serves and every build publishes; git-ignored.
 */
export const DRAFTS_FOLDER = 'packages/cartographer/.autosave/drafts'

/**
 * Where the hourly snapshots are kept (CARTO-238, rung 2a), from the repository's root — beside the drafts,
 * git-ignored with them; every one is kept.
 */
export const SNAPSHOTS_FOLDER = 'packages/cartographer/.autosave/snapshots'
