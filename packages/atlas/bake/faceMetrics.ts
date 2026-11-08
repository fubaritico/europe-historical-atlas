/**
 * The letters of the names' face measured from the face's own file, for the build (ATLAS-333) — what the page
 * measures on a canvas (`scene/political/names/glyphSheet.ts`, `measureGlyphs`): each character's advance, and how far
 * its ink reaches above and below the baseline, at a font size of one. Read by `fontkit`, at build time only: nothing
 * of it reaches the site.
 */

import { create } from 'fontkit'

import type { GlyphMetric } from '@europe-historical-atlas/core/pipeline/yearNames'
import type { Font } from 'fontkit'

/**
 * A measure of characters in one face.
 * @param bytes - the face's file — the names' `.woff2`
 * @returns how to measure characters in it
 * @throws when the file is not a single face
 */
export function faceMeasure(
  bytes: Uint8Array
): (characters: readonly string[]) => Record<string, GlyphMetric> {
  const face = create(Buffer.from(bytes))
  if (!('unitsPerEm' in face))
    throw new Error('[atlas] the names’ face is a collection, not one face')
  const font: Font = face
  return (characters) => {
    const measured: Record<string, GlyphMetric> = {}
    for (const character of characters) {
      // Laid out as the canvas lays a lone character: the face's own mapping and substitutions, no neighbour.
      const [glyph] = font.layout(character).glyphs
      if (glyph === undefined)
        throw new Error(`[atlas] the names’ face lays out no glyph for « ${character} »`)
      // A character the face lacks (glyph 0, « .notdef »): the page draws it in a fallback face, whose width the build
      // cannot know — measured here as the face's missing glyph, so a name holding it is placed a little off. Said.
      if (glyph.id === 0)
        console.warn(
          `[atlas] the names’ face has no « ${character} »: the build measures it as a missing glyph`
        )
      // A glyph with no ink — the space — has an empty box, which fontkit writes as infinities; the canvas measures
      // such a letter's ink as reaching nowhere, 0 either side.
      const { minY, maxY } = glyph.bbox
      const inked = Number.isFinite(minY) && Number.isFinite(maxY)
      measured[character] = {
        advance: glyph.advanceWidth / font.unitsPerEm,
        ascent: inked ? maxY / font.unitsPerEm : 0,
        descent: inked ? -minY / font.unitsPerEm : 0,
      }
    }
    return measured
  }
}
