/**
 * Free the page's copy of a layer's buffers once the GPU holds them (ATLAS-333). three keeps every buffer twice: the
 * array on the page, and its copy on the GPU. A year's countries, tribes, borders and names weigh 54 to 84 MB
 * (measured 2026-11-08 on 1100 and 1200), and the years set aside keep theirs — so the page's copies are let go.
 *
 * **Safe because nothing reads them after**: the bounds, the one reader of the positions in three, are computed here
 * before anything is let go — three reads the positions only to compute bounds it lacks — and three never uploads a
 * buffer again unless its version moves, which no year layer does. A layer whose buffers change after it is built (the
 * events, their shadows) must not be handed here.
 *
 * **What it costs**: should the browser lose the GPU's context, three cannot upload these buffers again — said in
 * `known-issues/atlas.md`.
 */

import type { BufferAttribute, BufferGeometry, InterleavedBuffer, Object3D } from 'three'

/**
 * Let a buffer's array go once uploaded — three's own pattern for a static buffer.
 * @param this - the attribute or interleaved buffer just uploaded
 * @param this.array
 */
function letGo(this: { array: unknown }): void {
  this.array = null
}

/**
 * The buffers of a geometry: its attributes — an interleaved one by its shared buffer — and its index.
 * @param geometry - the geometry
 * @returns each buffer once
 */
function buffersOf(geometry: BufferGeometry): Set<BufferAttribute | InterleavedBuffer> {
  const buffers = new Set<BufferAttribute | InterleavedBuffer>()
  for (const attribute of Object.values(geometry.attributes))
    buffers.add('isInterleavedBufferAttribute' in attribute ? attribute.data : attribute)
  if (geometry.index !== null) buffers.add(geometry.index)
  return buffers
}

/**
 * Free the page's copy of every buffer under an object once the GPU holds it.
 * @param object - a year layer's object, built and not changed after
 * @returns nothing
 */
export function releaseAfterUpload(object: Object3D): void {
  object.traverse((child) => {
    const geometry = (child as { geometry?: BufferGeometry }).geometry
    if (geometry === undefined) return
    // The bounds read the positions: computed now, while they are here. three reads them again only when they are
    // missing — and for an object not culled by the camera it does so after the upload, to sort the transparent ones
    // (`WebGLRenderer.projectObject`): with the positions gone, `Cannot read properties of null` (seen by the dev,
    // 2026-11-08).
    geometry.computeBoundingSphere()
    geometry.computeBoundingBox()
    for (const buffer of buffersOf(geometry)) buffer.onUpload(letGo)
  })
}
