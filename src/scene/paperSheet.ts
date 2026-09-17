/**
 * The vellum the map is printed on.
 *
 * Until this existed the paper stopped at the coastline of the data: the terrain carried a fibrous
 * grain and everything around it was a flat fill, so the map read as terrain floating in a colour
 * rather than as something printed. A sheet costs one quad and two triangles.
 *
 * Its own colour matches the page behind it on purpose. The reader should find the *map's* edge, framed
 * and graduated, never the sheet's — a second edge would only raise the question of what is beyond it.
 */

import { Mesh, MeshBasicMaterial, PlaneGeometry } from 'three'

import type { DataTexture, Object3D } from 'three'

/** How the sheet is laid. */
export interface PaperSheetOptions {
  /** Half its width on X, in world units. */
  halfWidth: number
  /** Half its depth on Z. */
  halfDepth: number
  /** How far below sea level it sits, clear of the terrain that rests on it. */
  drop: number
  /** The baked vellum. */
  texture: DataTexture
}

/** A laid sheet. */
export interface PaperSheet {
  /** The mesh, to add to a scene. */
  object: Object3D
  /** Free its GPU resources. The texture is the caller's, and is not touched. */
  dispose: () => void
}

/**
 * Lay the sheet.
 * @param options - its size, its depth below the sea, and the vellum to print it with
 * @returns the mounted sheet
 */
export function createPaperSheet(options: PaperSheetOptions): PaperSheet {
  const geometry = new PlaneGeometry(options.halfWidth * 2, options.halfDepth * 2, 1, 1)
  geometry.rotateX(-Math.PI / 2) // lay it flat in the XZ plane, like everything else on this map
  // A background, not a surface: painted first, and taking no part in the depth buffer at all.
  //
  // It sat four thousandths below the sea and wrote depth like everything else, which at six units of
  // camera distance is finer than the depth buffer can resolve — so the two contended for every pixel
  // and the whole margin flickered as soon as the camera moved. Pushing them apart would only have
  // moved the problem; nothing is ever behind the sheet, so it has no need of depth.
  const material = new MeshBasicMaterial({
    map: options.texture,
    depthTest: false,
    depthWrite: false,
  })
  const mesh = new Mesh(geometry, material)
  mesh.position.y = -options.drop
  mesh.renderOrder = -1000
  return {
    object: mesh,
    dispose(): void {
      geometry.dispose()
      material.dispose() // `Material.dispose` leaves `map` alone — the texture outlives this sheet
    },
  }
}
