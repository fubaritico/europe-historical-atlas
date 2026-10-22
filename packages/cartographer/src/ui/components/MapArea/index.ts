/**
 * The canvas area — its public face: the area, its props, and how its backdrop is loaded. The canvas, the
 * waiting and failure notices and the hook that loads the assets stay inside this folder (the dev's call,
 * 2026-10-18: one entity per file, a folder per component, a barrel as its boundary).
 */
export { MapArea } from './MapArea'
export type { MapAreaProps } from './MapArea'
export type { BackdropLoad, EditorAssets } from './editorAssets'
