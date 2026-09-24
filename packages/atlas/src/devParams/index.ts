/**
 * What the dev panel can tune: the param shapes, their defaults, and the range and label of each
 * control — all declared together, one module per folder of the panel.
 *
 * Deliberately free of any rendering-library import: `devPanel.ts` renders these declarations with
 * lil-gui, `main.ts` seeds its live objects from the defaults, and tests can check both without a DOM.
 * Keeping the three apart is what previously allowed a default to sit outside its own slider unnoticed.
 *
 * Re-exported wholesale so that splitting this file changed no call site: every consumer still imports
 * from `./devParams`.
 */

export * from './camera'
export * from './coastline'
export * from './extent'
export * from './frame'
export * from './political'
export * from './relief'
export * from './rhumb'
export * from './river'
export * from './rose'
export * from './tables'
