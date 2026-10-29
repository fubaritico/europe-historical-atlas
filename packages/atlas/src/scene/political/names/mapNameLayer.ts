/**
 * When the country names are laid on the map (ATLAS-301): once the year's names and their sheet are in and the
 * relief is built, and again whenever the relief is — every letter's vertex sits at the ground's height.
 */

import { tribeIds } from '@europe-historical-atlas/core/editor/tribes'

import { disposeHandle } from '../../layers/disposeHandle'

import { createNameLayer } from './nameLayer'

import type { LayerContext } from '../../layers/layerContext'

/** The ink the names are written in — the dev's on the bench, 2026-10-28. */
export const NAME_INK = '#3b2614'

/**
 * The ink's opacity — 50 % on the bench, in multiply; raised by the dev on the atlas once the ink went to the ordinary
 * blend, 2026-10-28: *« moins de transparence sur les noms. Disons 75 % d'opacité »*.
 */
export const NAME_OPACITY = 0.75

/**
 * The white edge's opacity around the letters — the dev's, 2026-10-28: *« un bord blanc à 50 % au bord des lettres »*.
 */
export const NAME_HALO_OPACITY = 0.5

/**
 * The white edge's width around the letters, in cells of the names' grid — about a kilometre of map, the same for
 * every name: the edge is there to make a name legible, so it does not thin as the name gets smaller.
 */
export const NAME_HALO_CELLS = 0.8

/**
 * Lay the year's names on the relief, or take them off until their names, their sheet and the relief are all in.
 * Nothing is said when one is missing: the names arrive after the map by design, and this runs again when they do.
 * @param context - the layers and what they read
 * @returns nothing
 */
export function rebuildNames(context: LayerContext): void {
  const { scene, sources, handles, projection, blurMethod, dev } = context
  disposeHandle(scene, handles.names)
  handles.names = null
  const { yearNames, nameSheet } = sources
  const relief = handles.relief
  if (yearNames === null || nameSheet === null || relief === null) return
  handles.names = createNameLayer({
    names: yearNames,
    sheet: nameSheet,
    draped: projection.draped,
    ink: NAME_INK,
    opacity: NAME_OPACITY,
    haloOpacity: NAME_HALO_OPACITY,
    haloCells: NAME_HALO_CELLS,
    blurMethod,
    inverted: dev.names.tribesInverted
      ? tribeIds(sources.regionSet?.authored?.year.registry.polities ?? [])
      : new Set(),
  })
  handles.names.object.scale.setY(relief.scale.y)
  scene.add(handles.names.object)
}
