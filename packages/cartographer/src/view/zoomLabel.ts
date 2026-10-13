import type { Viewport } from './viewport'

/**
 * The zoom as the document tab writes it — `@ 48 %` in the design (`design/chrome.js`).
 *
 * **100 % is one backdrop pixel per CSS pixel** (2026-10-13): the only fixed reference the editor has — the
 * baked terrain at its own resolution. The viewport's scale is in **device** pixels of the backing store
 * (`viewport.ts`), so it is divided by the device pixel ratio first; without that a Retina screen would read
 * every zoom at twice its value.
 */

/**
 * Write a view's zoom as a percentage.
 * @param viewport - the view; its `scale` is device pixels per backdrop pixel
 * @param deviceRatio - device pixels per CSS pixel, `window.devicePixelRatio` in the application
 * @returns `"48 %"`, or an em dash while the view is not framed yet (scale zero, `UNFRAMED`)
 */
export function zoomLabel(viewport: Viewport, deviceRatio: number): string {
  if (!(viewport.scale > 0) || !(deviceRatio > 0)) return '—'
  return `${String(Math.round((viewport.scale / deviceRatio) * 100))} %`
}
