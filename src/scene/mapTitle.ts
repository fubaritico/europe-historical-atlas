/**
 * The atlas's name, printed on the sheet below the map.
 *
 * Lettered exactly as the screen the reader meets first: the same face, the same wide tracking, the
 * same borrowed lambda standing in for every A. Both come from `utils/lettering`, because a title set
 * two different ways says the splash and the map are two different things.
 *
 * Drawn the way the compass rose and the degrees are — an SVG, rasterised by the browser.
 */

import { BufferAttribute, BufferGeometry, Mesh, MeshBasicMaterial } from 'three'

import { MAP_TYPEFACE, withLambdaForA } from '../utils/lettering'

import type { Object3D, Texture } from 'three'

/** The atlas's own name, in plain words. What a screen reader would be given. */
export const MAP_TITLE = 'Historical atlas'

/**
 * The title canvas, in its own pixels.
 *
 * Twelve to one, and the ratio is measured rather than chosen: sixteen tracked capitals advance about
 * `16 × (0.62 + 0.42) × fontSize`, so at a font size of half the height the lettering needs some ten
 * heights of width. Eight to one clipped it at both ends.
 */
const TITLE_WIDTH = 1440
const TITLE_HEIGHT = 120

/** Tracking, as a fraction of the font size — the splash's own 0.42em. */
const TRACKING = 0.42

/** How the title is set. */
export interface MapTitleOptions {
  /** The name, in plain words; the lambdas and the capitals are applied here. */
  text: string
  /** Its cap height in world units. The width follows from the lettering's own shape. */
  size: number
  /** Where its centre sits on Z, below the map. */
  z: number
  /** How far above the sheet it sits. */
  lift: number
  /** The ink. */
  ink: string
  /** How opaque it is. */
  opacity: number
  /** How far the glyph outlines are eaten by the paper, in canvas pixels. Zero prints them clean. */
  roughness: number
  /**
   * Turn the markup into a texture. Injected so a test needs no `Image` and no decoder.
   * @param svg - the markup
   * @returns the texture
   */
  loadTexture: (svg: string) => Texture
}

/** A printed title. */
export interface MapTitle {
  /** The mesh, to add to a scene. */
  object: Object3D
  /** Free its GPU resources. */
  dispose: () => void
}

/**
 * Set the name as SVG.
 *
 * The centring compensates for the tracking: letter-spacing adds a gap after the LAST letter too, so a
 * text anchored at the middle sits half a gap to the left of where it looks like it should. The splash
 * answers this with `text-indent`; SVG has no such thing, so the anchor moves instead.
 * @param text - the name, in plain words
 * @param ink - the colour
 * @param roughness - how far the outline is displaced, in canvas pixels
 * @returns the markup
 */
export function buildMapTitleSvg(text: string, ink: string, roughness: number): string {
  const fontSize = Math.round(TITLE_HEIGHT * 0.52)
  const tracking = fontSize * TRACKING
  const lettered = withLambdaForA(text).toUpperCase()
  const body = `<text x="${String(TITLE_WIDTH / 2 - tracking / 2)}" y="${String(TITLE_HEIGHT / 2)}" font-family="${MAP_TYPEFACE}" font-size="${String(fontSize)}" font-weight="500" letter-spacing="${String(Math.round(tracking))}" fill="${ink}" text-anchor="middle" dominant-baseline="central">${lettered}</text>`
  const rough =
    roughness > 0
      ? `<filter id="titlegrain" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="3" seed="11" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="${String(roughness)}" xChannelSelector="R" yChannelSelector="G"/></filter>`
      : ''
  const wrapped = roughness > 0 ? `<g filter="url(#titlegrain)">${body}</g>` : body
  // Explicit width and height, not just a viewBox: loaded as an `<img>` for a texture, a viewBox-only
  // SVG rasterises to 0x0 and comes out blank.
  return `<svg width="${String(TITLE_WIDTH)}" height="${String(TITLE_HEIGHT)}" viewBox="0 0 ${String(TITLE_WIDTH)} ${String(TITLE_HEIGHT)}" xmlns="http://www.w3.org/2000/svg">${rough}${wrapped}</svg>`
}

/**
 * Print the title on the sheet.
 * @param options - the name, where it sits, and how to rasterise it
 * @returns the mounted title
 */
export function createMapTitle(options: MapTitleOptions): MapTitle {
  const halfH = options.size / 2
  const halfW = (options.size * TITLE_WIDTH) / TITLE_HEIGHT / 2
  const corners = [
    [-halfW, -halfH, 0, 1],
    [halfW, halfH, 1, 0],
    [halfW, -halfH, 1, 1],
    [-halfW, -halfH, 0, 1],
    [-halfW, halfH, 0, 0],
    [halfW, halfH, 1, 0],
  ] as const
  const positions = new Float32Array(18)
  const uvs = new Float32Array(12)
  let p = 0
  let t = 0
  for (const [dx, dz, u, v] of corners) {
    positions[p] = dx
    positions[p + 1] = options.lift
    positions[p + 2] = options.z + dz
    uvs[t] = u
    uvs[t + 1] = v
    p += 3
    t += 2
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new BufferAttribute(uvs, 2))
  const texture = options.loadTexture(
    buildMapTitleSvg(options.text, options.ink, options.roughness)
  )
  const material = new MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: options.opacity,
    depthWrite: false,
  })
  return {
    object: new Mesh(geometry, material),
    dispose(): void {
      geometry.dispose()
      material.dispose()
      texture.dispose()
    },
  }
}
