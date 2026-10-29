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
  NormalBlending,
  ShaderMaterial,
} from 'three'

import { clamp01 } from '@europe-historical-atlas/core/utils/math'

import { BLUR_LAYERS } from '../../blurLayers'

import { HALO_FIELD_EM } from './glyphSheet'
import { nameGeometry } from './nameGeometry'

import type { NameSheet } from '../../../sources/mapSources'
import type { BlurMethod, ScreenBlur } from '../../blur/blurMethod'
import type { WorldPoint } from '../../relief/drapeProjection'
import type { YearNames } from '@europe-historical-atlas/core/pipeline/yearNames'
import type { Blending } from 'three'

/** The layer the names' ink moves to while blurred — one the camera does not see, nor the borders' blur. */
export const NAME_BLUR_LAYER = BLUR_LAYERS.names

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
  /** How the map's blurs are drawn (ATLAS-304). */
  readonly blurMethod: BlurMethod
  /**
   * The polities whose names are written inverted — white ink on an edge of the ink's colour: the tribes, an
   * experiment of the dev's, 2026-10-29 (*« pour les tribus, leur nom, tu vas inverser le noir et le blanc »*).
   */
  readonly inverted: ReadonlySet<string>
}

/** When the white edge shows — the panel's, read every frame. */
export interface NameScreen {
  /** The camera's zoom, `0` furthest out, up to which the white edge is whole. */
  readonly haloWholeZoom: number
  /** The zoom from which it is gone. */
  readonly haloGoneZoom: number
  /** The zoom from which the names fade to a watermark, toward the closest. */
  readonly watermarkZoom: number
  /** The share of their opacity the names keep at the closest zoom — a watermark under the cities to come. */
  readonly watermarkShare: number
  /**
   * The inverted names' edge at the closest zoom, as a share of its width from afar: it stays where the white edge goes,
   * very thin (the dev, 2026-10-29: *« tu vois le liseré ? Tu le mets, très fin »*), narrowing as the white one fades.
   */
  readonly tribeEdgeClose: number
}

/**
 * How much of the names shows at a zoom: whole, then fading to a watermark over the last steps of the zoom — the dev,
 * 2026-10-29: *« lorsqu'on est complètement zoomé, les noms deviennent à 50 % transparents. Tous »*, so the cities'
 * dots and names can come over them.
 * @param zoom - the camera's zoom, `0` furthest out, `1` closest
 * @param screen - where the fade starts and what share is kept at the closest
 * @returns the multiplier on the names' opacity, `watermarkShare..1`
 */
export function watermarkAtZoom(zoom: number, screen: NameScreen): number {
  const span = 1 - screen.watermarkZoom
  // A fade starting at the closest zoom: a step there, rather than a division by nothing.
  const t = span <= 0 ? (zoom >= 1 ? 1 : 0) : clamp01((zoom - screen.watermarkZoom) / span)
  const eased = t * t * (3 - 2 * t)
  return 1 - (1 - screen.watermarkShare) * eased
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
  /**
   * Blur the names' ink a little close up (the dev, 2026-10-29: *« applique le même flou sur les noms »*), or draw it
   * crisp at a reach the blur's method does not draw (`0` always).
   * @param pixels - the blur's reach, in CSS pixels
   */
  setBlur: (pixels: number) => void
  /**
   * How far the names have come in, `0` hidden to `1` whole — the fade they arrive with at startup, with the
   * countries and the events (the dev, 2026-10-29: *« tout apparaît d'un seul coup en fondu »*).
   * @param share - the share of their opacity shown
   */
  setReveal: (share: number) => void
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
  /** The level's inverted names — white ink on a dark edge — sharing its opacities; `null` when it has none. */
  readonly inverted: {
    readonly geometry: BufferGeometry
    readonly edge: Mesh<BufferGeometry, ShaderMaterial>
    readonly ink: Mesh<BufferGeometry, ShaderMaterial>
  } | null
}

/**
 * One level's meshes, hidden until a detail is set: the white edge first, then the ink over it — one geometry, two
 * images laid out alike.
 * @param names - the level's names
 * @param options - the sheet, the projection, the ink and the edge's width
 * @param textures - the letters' and the edge field's textures
 * @param textures.letters - the letters
 * @param textures.halo - the edge field
 * @param screens - the uniforms the edges follow the camera by: the ordinary names', the inverted ones'
 * @param screens.own - the ordinary names' edge, gone close up
 * @param screens.inverted - the inverted names' edge, kept close up, thinner
 * @returns the meshes
 */
function levelMeshes(
  names: NameLayerOptions['names']['levels'][number]['placed'],
  options: NameLayerOptions,
  textures: { readonly letters: CanvasTexture; readonly halo: CanvasTexture },
  screens: { readonly own: ScreenUniforms; readonly inverted: ScreenUniforms }
): LevelMeshes {
  const geometryOf = (placed: typeof names): BufferGeometry =>
    nameGeometry({
      names: placed,
      sheet: options.sheet,
      grid: { width: options.names.gridWidth, height: options.names.gridHeight },
      draped: options.draped,
      haloCells: options.haloCells,
    })
  const geometry = geometryOf(names.filter(({ polity }) => !options.inverted.has(polity)))
  const edgeOpacity = { value: 0 }
  const inkOpacity = { value: 0 }
  const look = { textures, opacities: { edge: edgeOpacity, ink: inkOpacity }, screen: screens.own }
  const [edge, ink] = edgeAndInk(geometry, look, {
    edge: WHITE,
    ink: options.ink,
    blending: MultiplyBlending,
  })
  const invertedNames = names.filter(({ polity }) => options.inverted.has(polity))
  if (invertedNames.length === 0)
    return { geometry, edge, edgeOpacity, ink, inkOpacity, inverted: null }
  // The ink white in the ordinary blend — multiplied, white would change nothing — on an edge of the ink's colour.
  const flipped = geometryOf(invertedNames)
  const [flippedEdge, flippedInk] = edgeAndInk(
    flipped,
    { ...look, screen: screens.inverted },
    {
      edge: options.ink,
      ink: WHITE,
      blending: NormalBlending,
    }
  )
  return {
    geometry,
    edge,
    edgeOpacity,
    ink,
    inkOpacity,
    inverted: { geometry: flipped, edge: flippedEdge, ink: flippedInk },
  }
}

/** What a level's edges and inks are drawn with, whatever their colours. */
interface MeshLook {
  /** The letters' and the edge field's textures. */
  readonly textures: { readonly letters: CanvasTexture; readonly halo: CanvasTexture }
  /** The edge's and the ink's opacities, written as the zoom's detail moves — shared by every pair of the level. */
  readonly opacities: { readonly edge: { value: number }; readonly ink: { value: number } }
  /** The uniforms the edge follows the camera by. */
  readonly screen: ScreenUniforms
}

/** The white of the ordinary names' edge, and of the inverted names' ink. */
const WHITE = '#ffffff'

/**
 * An edge and its ink over one geometry, hidden until a detail is set, drawn edge first.
 * @param geometry - the tiles
 * @param look - the textures, the opacities shared with the level, the camera's uniforms
 * @param tones - the edge's colour, the ink's, and how the ink is laid
 * @param tones.edge - the edge's colour, `#rrggbb`
 * @param tones.ink - the ink's colour, `#rrggbb`
 * @param tones.blending - multiplied into the map, or laid over it
 * @returns the edge and the ink
 */
function edgeAndInk(
  geometry: BufferGeometry,
  look: MeshLook,
  tones: { readonly edge: string; readonly ink: string; readonly blending: Blending }
): [Mesh<BufferGeometry, ShaderMaterial>, Mesh<BufferGeometry, ShaderMaterial>] {
  const { textures, opacities, screen } = look
  const edge = new Mesh(
    geometry,
    haloMaterial(
      textures.letters,
      textures.halo,
      { opacity: opacities.edge, tone: tones.edge },
      screen
    )
  )
  const ink = new Mesh(
    geometry,
    inkMaterial(textures.letters, tones.ink, opacities.ink, tones.blending)
  )
  edge.renderOrder = NAME_RENDER_ORDER
  ink.renderOrder = NAME_RENDER_ORDER + 1
  edge.visible = false
  ink.visible = false
  return [edge, ink]
}

/**
 * A level's meshes, edges before inks: its own names', then its inverted names'.
 * @param level - the level
 * @returns the meshes
 */
function meshesOf(level: LevelMeshes): Mesh<BufferGeometry, ShaderMaterial>[] {
  const own = [level.edge, level.ink]
  return level.inverted === null ? own : [...own, level.inverted.edge, level.inverted.ink]
}

/**
 * The ink blurred close up, multiplied into the map as it is drawn; the white edge, gone by then, stays crisp.
 * @param object - the names' group, which the blur's quad joins
 * @param levels - every level's meshes
 * @param method - how the map's blurs are drawn
 * @returns the blur, and the setter that blurs the ink
 */
function inkBlur(
  object: Group,
  levels: readonly LevelMeshes[],
  method: BlurMethod
): { blur: ScreenBlur; setBlur: (pixels: number) => void } {
  const inks = levels.map(({ ink }) => ink)
  const blur = method.create(object, {
    layer: NAME_BLUR_LAYER,
    renderOrder: NAME_RENDER_ORDER + 1,
    blend: 'multiply',
    members: () => inks,
  })
  object.add(blur.object)
  return {
    blur,
    setBlur(pixels: number): void {
      // Drawn into the blur's image, the ink keeps its colour and its coverage in the ordinary blend; the image is
      // multiplied into the map instead. Where the method draws no blur, the ink is drawn crisp in multiply, as ever.
      const on = blur.setRadius(pixels)
      for (const ink of inks) ink.material.blending = on ? NormalBlending : MultiplyBlending
    },
  }
}

/**
 * Each level's opacities: its weight by the zoom's detail, and the watermark of the closest zoom, composed into the
 * ink's and the white edge's.
 * @param levels - every level's meshes
 * @param options - the ink's and the edge's opacities where a level is fully in
 * @returns the two setters
 */
function levelOpacities(
  levels: readonly LevelMeshes[],
  options: Pick<NameLayerOptions, 'opacity' | 'haloOpacity'>
): {
  setDetail: (detail: number) => void
  setWatermark: (share: number) => void
  setReveal: (share: number) => void
} {
  const weights = levels.map(() => 0)
  let watermark = 1
  let reveal = 1
  const show = (): void => {
    levels.forEach(({ edgeOpacity, inkOpacity }, level) => {
      const weight = (weights[level] ?? 0) * watermark * reveal
      edgeOpacity.value = options.haloOpacity * weight
      inkOpacity.value = options.opacity * weight
    })
  }
  return {
    setDetail(detail: number): void {
      levels.forEach((built, level) => {
        const weight = levelWeight(level, detail)
        weights[level] = weight
        for (const mesh of meshesOf(built)) mesh.visible = weight > 0
      })
      show()
    },
    setWatermark(share: number): void {
      watermark = share
      show()
    },
    setReveal(share: number): void {
      reveal = share
      show()
    },
  }
}

/**
 * Build the names' layer, every level hidden until a detail is set.
 * @param options - the names, the sheet, the projection and the ink
 * @returns the layer
 */
export function createNameLayer(options: NameLayerOptions): NameLayer {
  const letters = sheetTexture(options.sheet.image)
  const halo = sheetTexture(options.sheet.halo)
  // Shared by every level's edge: one write a frame follows the camera. The inverted names' edge is always there,
  // its width written instead.
  const screen: ScreenUniforms = { edge: { value: 0 }, width: { value: 1 } }
  const invertedScreen: ScreenUniforms = { edge: { value: 1 }, width: { value: 1 } }
  const object = new Group()
  object.renderOrder = NAME_RENDER_ORDER
  const levels = options.names.levels.map((level) => {
    const built = levelMeshes(
      level.placed,
      options,
      { letters, halo },
      { own: screen, inverted: invertedScreen }
    )
    for (const mesh of meshesOf(built)) object.add(mesh)
    return built
  })
  const blur = inkBlur(object, levels, options.blurMethod)
  const opacities = levelOpacities(levels, options)
  return {
    object,
    setDetail(detail: number): void {
      opacities.setDetail(detail)
    },
    setZoom(zoom: number, settings: NameScreen): void {
      const halo = haloAtZoom(zoom, settings)
      screen.edge.value = halo
      invertedScreen.width.value = settings.tribeEdgeClose + (1 - settings.tribeEdgeClose) * halo
      opacities.setWatermark(watermarkAtZoom(zoom, settings))
    },
    setBlur(pixels: number): void {
      blur.setBlur(pixels)
    },
    setReveal(share: number): void {
      opacities.setReveal(share)
    },
    dispose(): void {
      for (const level of levels) {
        level.geometry.dispose()
        level.inverted?.geometry.dispose()
        for (const mesh of meshesOf(level)) mesh.material.dispose()
      }
      object.remove(blur.blur.object)
      blur.blur.dispose()
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

/** The uniforms every level's edges share, written as the camera moves. */
interface ScreenUniforms {
  /** How much of the edge shows at the camera's zoom, `0..1`. */
  readonly edge: { value: number }
  /** The edge's width at the camera's zoom, as a share of each name's own. */
  readonly width: { value: number }
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
 * The ink: multiplied into the colour under it — or laid over it, for the inverted names' white — over the relief: a
 * name stands at its ground's median height, and the hills rising through it would cut it.
 * @param letters - the letters' texture
 * @param ink - the ink, `#rrggbb`
 * @param opacity - the ink's opacity, held by the layer and changed with the zoom's detail
 * @param opacity.value - the opacity, `0..1`
 * @param blending - multiplied, or in the ordinary blend
 * @returns the material
 */
function inkMaterial(
  letters: CanvasTexture,
  ink: string,
  opacity: { value: number },
  blending: Blending
): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: { letters: { value: letters }, ink: { value: new Color(ink) }, opacity },
    vertexShader: NAME_VERTEX,
    fragmentShader: INK_FRAGMENT,
    transparent: true,
    premultipliedAlpha: true,
    blending,
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
uniform float width;
uniform vec3 tone;
void main() {
  float away = texture2D(field, vUv).r * fieldEm;
  float reach = vHalo * width;
  float ring = 1.0 - smoothstep(reach * 0.66, reach, away);
  float onLetter = texture2D(letters, vUv).a;
  gl_FragColor = vec4(tone, ring * (1.0 - onLetter) * opacity * edge);
  #include <colorspace_fragment>
}
`

/** An edge's opacity and colour. */
interface EdgeLook {
  /** The opacity, `0..1`, held by the layer and changed with the zoom's detail. */
  readonly opacity: { value: number }
  /** The edge's colour, `#rrggbb`. */
  readonly tone: string
}

/**
 * The letters' edge — white, or the ink's colour around the inverted names — drawn from the sheet's field at each
 * name's own width, over the colour in the ordinary blend, under the ink.
 * @param letters - the letters' texture, so the edge stays off them
 * @param field - the edge field's texture
 * @param look - the edge's opacity and colour
 * @param screen - the uniforms that follow the camera
 * @returns the material
 */
function haloMaterial(
  letters: CanvasTexture,
  field: CanvasTexture,
  look: EdgeLook,
  screen: ScreenUniforms
): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      letters: { value: letters },
      field: { value: field },
      fieldEm: { value: HALO_FIELD_EM },
      opacity: look.opacity,
      tone: { value: new Color(look.tone) },
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
