/**
 * The face the countries' names are written in: Fondamento (SIL Open Font License 1.1, `face/fondamento-OFL.txt`),
 * chosen by the dev on the bench, 2026-10-28. The Latin subset Google Fonts serves; cut to the names' own letters at
 * build later (step 5 of `files/plans/atlas/country-names.md`).
 */

/** The family the face is registered under — the atlas's own, so no page style can stand in for it. */
export const NAME_FAMILY = 'atlas-names'

/** Where the face's file is served from — rewritten by the bundler to the built asset. */
export const NAME_FACE_URL = new URL('./face/fondamento.woff2', import.meta.url).href

/** The family the drawn labels — the cities', the seas' — write in, on their canvases. */
export const LABEL_FAMILY = 'Fondamento'

/**
 * The names' face for a label drawer, loaded at its first ask and once for that drawer: a map that never draws a label
 * never fetches it (review ARCH-002 of 2026-11-13 — the cities' and the seas' drawers each wrote this out).
 * @param faceUrl - the face's file
 * @returns the face, the same promise at every ask; it rejects when the face cannot load, for the drawer's caller to say
 */
export function lazyLabelFace(faceUrl: string): () => Promise<FontFace> {
  let ready: Promise<FontFace> | null = null
  return () => {
    if (ready === null) {
      const face = new FontFace(LABEL_FAMILY, `url(${faceUrl})`)
      document.fonts.add(face)
      ready = face.load()
    }
    return ready
  }
}
