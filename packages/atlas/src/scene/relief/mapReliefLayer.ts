/**
 * How the relief is put on the map: the terrain mesh, the wall around its edge, and the texture hung on it.
 */

import { refreshReliefSource } from '../../mapSources'
import { disposeHandle } from '../layers/disposeHandle'
import { WORLD_WIDTH } from '../world'

import { createMapEdge } from './mapEdge'
import { createReliefMesh } from './reliefMesh'

import type { ReliefMesh } from './reliefMesh'
import type { LayerContext } from '../layers/layerContext'
import type { DataTexture, Scene } from 'three'

/**
 * Remove the relief mesh and free it.
 *
 * Its material is disposed separately from its texture on purpose: `Material.dispose` leaves `map`
 * alone, and the texture outlives any one mesh.
 * @param scene - the scene it was added to
 * @param relief - the mesh, or `null`
 * @returns nothing
 */
export function disposeRelief(scene: Scene, relief: ReliefMesh | null): void {
  if (!relief) return
  scene.remove(relief)
  relief.geometry.dispose()
  relief.material.dispose()
}

/**
 * Re-derive the relief grid from the live smoothing and shore ramp, then rebuild the terrain mesh on it.
 *
 * The grid is re-derived here and not only at startup: a mesh rebuilt on the old grid is what left the
 * smoothing slider doing nothing at all until 2026-10-16.
 * @param context - the layers and what they read
 * @returns nothing
 */
export function rebuildRelief(context: LayerContext): void {
  const { scene, dev, sources, handles } = context
  // 1. The grid, re-derived with the live settings; nothing to build before the elevation has loaded.
  const reliefSource = refreshReliefSource(sources, dev.relief, dev.texture.seaLevel)
  if (!reliefSource) return
  // 2. The old mesh out, a new one built on the grid, wearing the current texture if there is one.
  disposeRelief(scene, handles.relief)
  const relief = createReliefMesh(reliefSource, {
    worldWidth: WORLD_WIDTH,
    segments: dev.relief.segments,
    plainsCeiling: dev.relief.plainsCeiling,
    peakTarget: dev.relief.peakTarget,
    wireframe: dev.relief.wireframe,
    ...(handles.texture ? { map: handles.texture } : {}),
  })
  // 3. The live exaggeration applied, then the mesh kept as the handle and added to the scene.
  relief.scale.setY(dev.relief.exaggeration)
  handles.relief = relief
  scene.add(relief)

  // The wall is part of the relief: it meets the same surface, vertex for vertex, so it is built from
  // the same grid at the same moment. Rebuilt apart it would drift the first time the curve was tuned.
  disposeHandle(scene, handles.edge)
  handles.edge = null
  if (!dev.frame.edgeShow) return
  handles.edge = createMapEdge({
    source: reliefSource,
    worldWidth: WORLD_WIDTH,
    segments: dev.relief.segments,
    curve: { plainsCeiling: dev.relief.plainsCeiling, peakTarget: dev.relief.peakTarget },
    depth: dev.frame.edgeDepth,
    soil: dev.frame.edgeSoil,
    deep: dev.frame.edgeDeep,
    base: dev.frame.edgeBase,
    strata: dev.frame.edgeStrata,
  })
  scene.add(handles.edge.object)
}

/**
 * Hang a freshly baked texture on the relief.
 * @param context - the layers and what they read
 * @param texture - the baked look
 * @returns nothing
 */
export function setTexture(context: LayerContext, texture: DataTexture): void {
  const { handles, dev } = context
  // The previous texture freed and replaced.
  handles.texture?.dispose()
  handles.texture = texture
  // The fills composite onto the texture, so they follow it — and the blend and strength they read are
  // the texture folder's, retuned with it.
  handles.fills?.setMap(texture)
  handles.fills?.setLook(dev.texture.politicalMode, dev.texture.politicalStrength)
  handles.tribes?.setMap(texture)
  handles.tribes?.setLook(dev.texture.politicalMode, dev.texture.politicalStrength)
  // The relief wears it too, once it exists; the material must be recompiled to pick up a new map.
  const relief = handles.relief
  if (!relief) return
  relief.material.map = texture
  relief.material.color.set('#ffffff') // white base, so the map's own colours show unmodulated
  relief.material.needsUpdate = true
}
