/**
 * A sea's name as an image (ATLAS-440): in the countries' names' face, in capitals spaced wide, in the names' ink —
 * the convention of the old maps for water, the letters apart so the name spans its sea.
 */

import { CITY_MARK_INK } from '../../cities/cityMarks'

import type { SeaLabel } from './seaNameLayer'

/** The type's size on the image, in canvas pixels: large enough to stay sharp when the map is zoomed in. */
const SEA_TYPE_SIZE = 96

/** The space between the letters, as a share of the type's size. */
const SEA_LETTER_SPACING = 0.35

/** Draw a sea's name — the canvas on the map, a stub in a test. */
export type DrawSeaLabel = (text: string) => Promise<SeaLabel>

/**
 * The map's sea-name drawer: the names' face loaded once, at the first name, then each name drawn on its own canvas.
 * @param faceUrl - the names' face (`nameFace`)
 * @returns the drawer; a face that cannot load rejects it, for the caller to say
 */
export function canvasSeaLabelDrawer(faceUrl: string): DrawSeaLabel {
  let ready: Promise<FontFace> | null = null
  const loadFace = (): Promise<FontFace> => {
    if (ready === null) {
      const face = new FontFace('Fondamento', `url(${faceUrl})`)
      document.fonts.add(face)
      ready = face.load()
    }
    return ready
  }
  return async (text) => {
    await loadFace()
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    if (context === null) throw new Error('[Atlas] a sea name has no 2D context')
    const font = `${String(SEA_TYPE_SIZE)}px Fondamento`
    const spacing = `${String(SEA_TYPE_SIZE * SEA_LETTER_SPACING)}px`
    context.font = font
    context.letterSpacing = spacing
    const width = Math.ceil(context.measureText(text).width)
    canvas.width = width
    canvas.height = Math.ceil(SEA_TYPE_SIZE * 1.4)
    // A canvas resized forgets its state: the face and the spacing set again.
    context.font = font
    context.letterSpacing = spacing
    context.textBaseline = 'middle'
    context.fillStyle = CITY_MARK_INK
    context.fillText(text, 0, canvas.height / 2)
    return { canvas, aspect: canvas.width / canvas.height }
  }
}
