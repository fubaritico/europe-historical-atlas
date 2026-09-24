/**
 * An SVG, rasterised into a texture by the browser's own decoder.
 *
 * Shared because two things are drawn this way now — the compass rose and the frame's degrees — and a
 * second copy would be a second place to forget the two details below.
 */

import { SRGBColorSpace, TextureLoader } from 'three'

import type { Texture } from 'three'

/**
 * Turn SVG markup into a texture.
 *
 * Asynchronous by nature: the decoder hands the pixels back a frame or two later, so whatever is drawn
 * with this appears just after everything around it.
 * @param svg - the markup, which must carry explicit `width` and `height` — a viewBox-only SVG
 * rasterises to 0x0 and the texture comes out blank
 * @returns the texture
 */
export function svgToTexture(svg: string): Texture {
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  const texture = new TextureLoader().load(url)
  texture.colorSpace = SRGBColorSpace
  return texture
}
