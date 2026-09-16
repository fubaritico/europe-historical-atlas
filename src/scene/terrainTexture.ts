/**
 * The GPU side of the terrain bake: everything that knows about three.js, and nothing else.
 *
 * The pixels themselves come from `pipeline/terrainCompose`, which is deliberately three-free so a worker
 * can run it. Keep this file a wrapper — any logic added here is logic a worker can no longer reach.
 */

import {
  DataTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  RGBAFormat,
  SRGBColorSpace,
  UnsignedByteType,
} from 'three'

/**
 * Wrap an already-composited RGBA buffer as a {@link DataTexture} ready to drop onto an unlit material's
 * `map`. This is the seam a worker bake returns through: the worker produces the bytes, the renderer owns
 * the texture. `flipY` is set so the buffer's north-first rows align with `PlaneGeometry` UVs.
 * @param rgba - the composited `RGBA` bytes, of length `width * height * 4`
 * @param width - the buffer's width in pixels
 * @param height - the buffer's height in pixels
 * @returns the terrain texture (sRGB, mipmapped); the caller disposes it
 */
export function wrapTerrainTexture(rgba: Uint8Array, width: number, height: number): DataTexture {
  const texture = new DataTexture(rgba, width, height, RGBAFormat, UnsignedByteType)
  texture.flipY = true // buffer row 0 = north; UV v=1 (north vertex) must sample it
  texture.colorSpace = SRGBColorSpace
  texture.magFilter = LinearFilter
  // Mipmapped minification: zoomed out, one screen pixel covers many texels, and sampling a single one
  // of them makes the grain and the coastline shimmer as the camera moves.
  texture.minFilter = LinearMipmapLinearFilter
  texture.generateMipmaps = true
  texture.needsUpdate = true
  return texture
}
