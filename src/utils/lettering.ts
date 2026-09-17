/**
 * How this atlas letters its own name.
 *
 * Shared because the name is now written twice — on the screen the reader meets first, and on the sheet
 * itself — and two typefaces for one title would say the two were different things.
 */

/**
 * The map's face: an old-style serif, with the fallbacks that actually ship on the machines it runs on.
 *
 * Quoted for CSS and for SVG alike, both of which take the same font-family syntax.
 */
export const MAP_TYPEFACE =
  "'Iowan Old Style','Palatino Linotype',Palatino,'Book Antiqua',Georgia,serif"

/**
 * Swap every `A` for a capital lambda.
 *
 * A borrowed Greek letter is the oldest trick in cartographic lettering, and it costs nothing here
 * because the accessible name carries the real word — the play is in the glyphs, never in the text a
 * screen reader reads out.
 * @param text - the title, in plain words
 * @returns the same text with `A` and `a` rendered as `Λ`
 */
export function withLambdaForA(text: string): string {
  return text.replace(/[Aa]/g, 'Λ')
}
