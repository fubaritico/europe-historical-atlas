/**
 * The country names on the map (ATLAS-301, step 3b of `files/plans/atlas/country-names.md`): one mesh per display
 * level, its letters cut from the names' sheet, each name a flat sheet over the relief (`nameGeometry`), inked in
 * multiply so a name takes on the colour it is written over — the dev tried the ordinary blend on the atlas and came
 * back to multiply, 2026-10-28. Drawn after the borders and before the events.
 *
 * **One level in at a time, crossing over**: as the zoom's detail goes from one level to the next, the first
 * level's names fade out while the next's fade in — a suzerain's name shrinking into what its vassals leave it is a
 * cross-fade, never a jump (the dev, 2026-10-27: *« tout apparaît en fondu, tout se rafraîchit en fondu »*).
 *
 * **A level's names all show at once** (the dev, 2026-10-29: *« moi je veux plus d'affichage progressif […] dès que
 * les vassaux ils apparaissent, tout apparaît »*): no name waits for its size on screen. The white edge, there for
 * legibility from afar, follows the camera's zoom, the same for every name (*« une fois qu'on est près, on n'en a plus
 * trop besoin »*).
 *
 * Multiply with an opacity needs three's premultiplied alpha (`WebGLState.js`, `MultiplyBlending`): the colour
 * under a letter is multiplied by the ink mixed toward white as the letter's alpha falls — the bench's look.
 */

import {
  BufferGeometry,
  CanvasTexture,
  Color,
  DoubleSide,
  Group,
  LinearMipmapLinearFilter,
  Mesh,
  MultiplyBlending,
  ShaderMaterial,
} from 'three'

import { clamp01 } from '@europe-historical-atlas/core/utils/math'

import { HALO_FIELD_EM } from './glyphSheet'
import { nameGeometry } from './nameGeometry'

import type { NameSheet } from '../../../sources/mapSources'
import type { WorldPoint } from '../../relief/drapeProjection'
import type { YearNames } from '@europe-historical-atlas/core/pipeline/yearNames'

/** Drawn after the borders (`BORDER_RENDER_ORDER`, 10) and before the events (`EVENT_RENDER_ORDER`, 1000). */
export const NAME_RENDER_ORDER = 20

/** What the names are drawn from and how. */
export interface NameLayerOptions {
  /** The year's names, every level placed. */
  readonly names: YearNames
  /** The sheet their letters are cut from. */
  readonly sheet: NameSheet
  /**
   * A grid coordinate on the relief's surface, before its exaggeration.
   * @param u - west→east, `0..1`
   * @param v - north→south, `0..1`
   * @returns the world position
   */
  readonly draped: (u: number, v: number) => WorldPoint
  /** The ink, `#rrggbb`. */
  readonly ink: string
  /** The ink's opacity where a level is fully in, `0..1`. */
  readonly opacity: number
  /** The white edge's opacity where a level is fully in, `0..1`. */
  readonly haloOpacity: number
  /** The white edge's width, in cells of the names' grid — the same on the map for every name, whatever its size. */
  readonly haloCells: number
}

/** When the white edge shows — the panel's, read every frame. */
export interface NameScreen {
  /** The camera's zoom, `0` furthest out, up to which the white edge is whole. */
  readonly haloWholeZoom: number
  /** The zoom from which it is gone. */
  readonly haloGoneZoom: number
}

/**
 * How much of the white edge shows at a zoom: whole from afar, gone close up, eased between.
 * @param zoom - the camera's zoom, `0` furthest out
 * @param screen - where the edge is whole and where it is gone
 * @returns `1` whole, `0` gone
 */
export function haloAtZoom(zoom: number, screen: NameScreen): number {
  const span = screen.haloGoneZoom - screen.haloWholeZoom
  // Whole and gone at one zoom: a step there, rather than a division by nothing.
  if (span <= 0) return zoom < screen.haloGoneZoom ? 1 : 0
  const t = clamp01((zoom - screen.haloWholeZoom) / span)
  return 1 - t * t * (3 - 2 * t)
}

/** The names on the map, as one thing. */
export interface NameLayer {
  /** Every level's mesh. */
  readonly object: Group
  /**
   * Show the levels for a zoom's detail: the level it is at fully, the next coming in as the detail nears it.
   * @param detail - the display level made continuous (`homageDetail`)
   */
  setDetail: (detail: number) => void
  /**
   * Follow the camera's zoom with the white edge: whole from afar, gone close up.
   * @param zoom - the camera's zoom, `0` furthest out
   * @param screen - where the edge is whole and where it is gone
   */
  setZoom: (zoom: number, screen: NameScreen) => void
  /** Free the meshes, their materials and the sheet's texture. */
  dispose: () => void
}

/**
 * How much of a level shows at a detail: all of it at its own level, none a whole level away either side.
 * @param level - the level
 * @param detail - the zoom's detail
 * @returns its weight, `0..1`
 */
export function levelWeight(level: number, detail: number): number {
  return clamp01(1 - Math.abs(detail - level))
}

/** One level's names as meshes: its geometry, its white edge, its ink, and their opacities. */
interface LevelMeshes {
  /** The tiles, shared by both meshes. */
  readonly geometry: BufferGeometry
  /** The white edge, drawn first. */
  readonly edge: Mesh<BufferGeometry, ShaderMaterial>
  /** The edge's opacity, written as the zoom's detail moves. */
  readonly edgeOpacity: { value: number }
  /** The ink, over the edge. */
  readonly ink: Mesh<BufferGeometry, ShaderMaterial>
  /** The ink's opacity, likewise. */
  readonly inkOpacity: { value: number }
}

/**
 * One level's meshes, hidden until a detail is set: the white edge first, then the ink over it — one geometry, two
 * images laid out alike.
 * @param names - the level's names
 * @param options - the sheet, the projection, the ink and the edge's width
 * @param textures - the letters' and the edge field's textures
 * @param textures.letters - the letters
 * @param textures.halo - the edge field
 * @param screen - the uniform the edge follows the camera by
 * @returns the meshes
 */
function levelMeshes(
  names: NameLayerOptions['names']['levels'][number]['placed'],
  options: NameLayerOptions,
  textures: { readonly letters: CanvasTexture; readonly halo: CanvasTexture },
  screen: ScreenUniforms
): LevelMeshes {
  const geometry = nameGeometry({
    names,
    sheet: options.sheet,
    grid: { width: options.names.gridWidth, height: options.names.gridHeight },
    draped: options.draped,
    haloCells: options.haloCells,
  })
  const edgeOpacity = { value: 0 }
  const inkOpacity = { value: 0 }
  const edge = new Mesh(
    geometry,
    haloMaterial(textures.letters, textures.halo, edgeOpacity, screen)
  )
  const ink = new Mesh(geometry, inkMaterial(textures.letters, options.ink, inkOpacity))
  edge.renderOrder = NAME_RENDER_ORDER
  ink.renderOrder = NAME_RENDER_ORDER + 1
  edge.visible = false
  ink.visible = false
  return { geometry, edge, edgeOpacity, ink, inkOpacity }
}

/**
 * Build the names' layer, every level hidden until a detail is set.
 * @param options - the names, the sheet, the projection and the ink
 * @returns the layer
 */
export function createNameLayer(options: NameLayerOptions): NameLayer {
  const letters = sheetTexture(options.sheet.image)
  const halo = sheetTexture(options.sheet.halo)
  // Shared by every level's edge: one write a frame follows the camera.
  const screen: ScreenUniforms = { edge: { value: 0 } }
  const object = new Group()
  object.renderOrder = NAME_RENDER_ORDER
  const levels = options.names.levels.map((level) => {
    const built = levelMeshes(level.placed, options, { letters, halo }, screen)
    for (const mesh of [built.edge, built.ink]) object.add(mesh)
    return built
  })
  return {
    object,
    setDetail(detail: number): void {
      levels.forEach(({ edge, edgeOpacity, ink, inkOpacity }, level) => {
        const weight = levelWeight(level, detail)
        edgeOpacity.value = options.haloOpacity * weight
        inkOpacity.value = options.opacity * weight
        edge.visible = weight > 0
        ink.visible = weight > 0
      })
    },
    setZoom(zoom: number, settings: NameScreen): void {
      screen.edge.value = haloAtZoom(zoom, settings)
    },
    dispose(): void {
      for (const { geometry, edge, ink } of levels) {
        geometry.dispose()
        edge.material.dispose()
        ink.material.dispose()
      }
      letters.dispose()
      halo.dispose()
    },
  }
}

/**
 * A sheet's texture, filtered for the sizes a name takes from afar to close up.
 * @param image - the sheet
 * @returns the texture
 */
function sheetTexture(image: HTMLCanvasElement): CanvasTexture {
  const texture = new CanvasTexture(image)
  texture.minFilter = LinearMipmapLinearFilter
  return texture
}

/** The uniforms every level's edge shares, written as the camera moves. */
interface ScreenUniforms {
  /** How much of the white edge shows at the camera's zoom, `0..1`. */
  readonly edge: { value: number }
}

/** The vertex shader both materials share: the texture coordinates and each vertex's edge width, handed on. */
const NAME_VERTEX = /* glsl */ `
attribute float haloEm;
varying vec2 vUv;
varying float vHalo;
void main() {
  vUv = uv;
  vHalo = haloEm;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

/**
 * The ink's fragment shader: the ink at the letter's coverage, through the output's colour space, then premultiplied —
 * the order of three's own materials, so multiply lays it as `MeshBasicMaterial` did.
 */
const INK_FRAGMENT = /* glsl */ `
uniform sampler2D letters;
uniform vec3 ink;
uniform float opacity;
varying vec2 vUv;
void main() {
  gl_FragColor = vec4(ink, texture2D(letters, vUv).a * opacity);
  #include <colorspace_fragment>
  gl_FragColor.rgb *= gl_FragColor.a;
}
`

/**
 * The ink: multiplied into the colour under it, over the relief — a name stands at its ground's median height, and
 * the hills rising through it would cut it.
 * @param letters - the letters' texture
 * @param ink - the ink, `#rrggbb`
 * @param opacity - the ink's opacity, held by the layer and changed with the zoom's detail
 * @param opacity.value - the opacity, `0..1`
 * @returns the material
 */
function inkMaterial(
  letters: CanvasTexture,
  ink: string,
  opacity: { value: number }
): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: { letters: { value: letters }, ink: { value: new Color(ink) }, opacity },
    vertexShader: NAME_VERTEX,
    fragmentShader: INK_FRAGMENT,
    transparent: true,
    premultipliedAlpha: true,
    blending: MultiplyBlending,
    depthWrite: false,
    depthTest: false,
    side: DoubleSide,
  })
}

/**
 * The edge's fragment shader: white where the field says the nearest letter is closer than the edge's width, softened
 * over its outer third, and never on the letter itself — white under the ink washed the letters out.
 */
const HALO_FRAGMENT = /* glsl */ `
uniform sampler2D letters;
uniform sampler2D field;
uniform float fieldEm;
uniform float opacity;
varying vec2 vUv;
varying float vHalo;
uniform float edge;
void main() {
  float away = texture2D(field, vUv).r * fieldEm;
  float ring = 1.0 - smoothstep(vHalo * 0.66, vHalo, away);
  float onLetter = texture2D(letters, vUv).a;
  gl_FragColor = vec4(1.0, 1.0, 1.0, ring * (1.0 - onLetter) * opacity * edge);
}
`

/**
 * The letters' white edge, drawn from the sheet's field at each name's own width, over the colour in the ordinary
 * blend, under the ink.
 * @param letters - the letters' texture, so the edge stays off them
 * @param field - the edge field's texture
 * @param opacity - the edge's opacity, held by the layer and changed with the zoom's detail
 * @param opacity.value - the opacity, `0..1`
 * @param screen - the uniforms that follow the camera
 * @returns the material
 */
function haloMaterial(
  letters: CanvasTexture,
  field: CanvasTexture,
  opacity: { value: number },
  screen: ScreenUniforms
): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      letters: { value: letters },
      field: { value: field },
      fieldEm: { value: HALO_FIELD_EM },
      opacity,
      ...screen,
    },
    vertexShader: NAME_VERTEX,
    fragmentShader: HALO_FRAGMENT,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    side: DoubleSide,
  })
}
