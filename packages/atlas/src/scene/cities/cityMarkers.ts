/**
 * The cities on the relief (ATLAS-295): each one's mark (`cityMarks`) and its name (`cityLabel`) on two sprites facing
 * the reader, the mark centred on the city's point and the name to its right, the same size on screen whatever the
 * zoom. **The level of detail lights them** (`scene/detail`): a city's point comes a level before its name. Held as one
 * of the event markers (`events/markers`), so the layers move, fade and free them with the events.
 *
 * **Over the relief, under the events** (the dev, 2026-10-31): drawn with no depth test, as the countries' names are, so
 * no slope or ridge ever cuts a point or a name — depth-tested, « Tyr » read « Tur » and Tripoli lost its name behind a
 * crest; and drawn after the events' shadows and before their halos, pins and icons, which stand in front of a city
 * whatever the depth (*« c'est très bien qu'elles apparaissent devant […] c'est plus important »*).
 */

import { CanvasTexture, Group, SRGBColorSpace, Sprite, SpriteMaterial } from 'three'

import { CITY_IMPORTANCES } from '@europe-historical-atlas/core/data/cityImportance'

import { DETAIL_FADE_SECONDS, toward } from '../detail/detailView'
import { EVENT_RENDER_ORDER } from '../events/markers'
import { NAME_RENDER_ORDER } from '../political/names/nameLayer'

import { LABEL_RATIO } from './cityLabel'
import { CITY_MARKS, cityMarkSvg } from './cityMarks'
import { coveredByNames } from './nameCover'
import { inNameReach, lookedAt } from './nameReach'

import type { CityLabelImage, DrawCityLabel } from './cityLabel'
import type { DetailView } from '../detail/detailView'
import type { LoadSvgTexture } from '../events/icons/billboardMaterials'
import type { CameraPose, EventMarkers } from '../events/markers'
import type { WorldPoint } from '../relief/drapeProjection'
import type { CityImportance } from '@europe-historical-atlas/core/data/cityImportance'
import type { YearNames } from '@europe-historical-atlas/core/pipeline/yearNames'
import type { Texture } from 'three'

/**
 * The cities' draw order: after the events' ground shadows (`EVENT_RENDER_ORDER - 2`), before their halos (`- 1`), pins
 * and icons — three sorts the transparent pass by the nearest group's order.
 */
export const CITY_RENDER_ORDER = EVENT_RENDER_ORDER - 1.5

/**
 * The cities' draw order under the countries' names, at the levels that ask for it (`detail/detailLevels`,
 * `citiesOverNames`): over the borders (`BORDER_RENDER_ORDER`, 10), just under the names' group (`NAME_RENDER_ORDER`).
 */
export const CITY_UNDER_NAMES_ORDER = NAME_RENDER_ORDER - 0.5

/** A city to draw: where it stands, its order, its name. */
export interface PlacedCity {
  /** Its point on the relief, before exaggeration. */
  readonly ground: WorldPoint
  /** Its order of importance. */
  readonly importance: CityImportance
  /** Its name, as the map writes it. */
  readonly name: string
  /** Its point in normalized grid coordinates, `u` west→east, `v` north→south — to tell whether a name covers it. */
  readonly u: number
  /** See {@link PlacedCity.u}. */
  readonly v: number
}

/** One city's two sprites. */
interface CitySprites {
  /** Its order. */
  readonly importance: CityImportance
  /** Its mark, centred on its point. */
  readonly point: Sprite
  /** Its name, to the right, once drawn. */
  readonly name: Sprite
  /** The name's size on screen, in CSS pixels, once drawn; zero before. */
  nameWidth: number
  /** The name's height on screen, in CSS pixels, once drawn; zero before. */
  nameHeight: number
  /** Whether the name is within reach of the point the camera looks at (`nameReach`). */
  inReach: boolean
  /** How far the name has faded toward its reach, `0` out to `1` in. */
  reach: number
  /** Whether its point falls on a country's name seen from afar (`nameCover`): the point yields while it has no name. */
  covered: boolean
}

/** The cities' markers: event markers that always take the level of detail. */
export type CityMarkers = EventMarkers &
  Required<Pick<EventMarkers, 'setDetailView' | 'setNameCover'>>

/** What every sprite is sized and faded by, for this frame. */
interface CityFrame {
  /** Screen pixels per world unit where the camera looks. */
  pixelsPerUnit: number
  /** The startup's fade, `0` to `1`. */
  reveal: number
  /** The level of detail's values; before the first frame tells it, nothing shows. */
  view: DetailView | null
}

/**
 * A sprite, hidden until the level of detail lights it: unlit, see-through, over the relief.
 * @param map - its texture, or `null` until it is drawn
 * @param ground - the city's point
 * @returns the sprite
 */
function citySprite(map: Texture | null, ground: WorldPoint): Sprite {
  const material = new SpriteMaterial({
    map,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    opacity: 0,
  })
  const sprite = new Sprite(material)
  sprite.position.set(...ground)
  sprite.visible = false
  return sprite
}

/**
 * Show a sprite at an opacity, hidden when it has none.
 * @param sprite - the sprite
 * @param opacity - `0` to `1`
 */
function fade(sprite: Sprite, opacity: number): void {
  sprite.material.opacity = opacity
  sprite.visible = opacity > 0
}

/**
 * Size and fade one city's sprites for the frame.
 * @param city - its sprites
 * @param frame - the screen's scale, the startup's fade and the level of detail
 */
function applyFrame(city: CitySprites, frame: CityFrame): void {
  const { pixelsPerUnit, reveal, view } = frame
  const mark = CITY_MARKS[city.importance].size / pixelsPerUnit
  city.point.scale.set(mark, mark, 1)
  city.name.scale.set(city.nameWidth / pixelsPerUnit, city.nameHeight / pixelsPerUnit, 1)
  if (view === null) {
    fade(city.point, 0)
    fade(city.name, 0)
    return
  }
  // A point on a country's name yields to it while the city has no name of its own; it comes back with its name.
  const yields = city.covered ? view.cityNames[city.importance] : 1
  fade(city.point, view.cityPoints[city.importance] * yields * reveal)
  fade(city.name, city.nameWidth === 0 ? 0 : view.cityNames[city.importance] * city.reach * reveal)
}

/**
 * Lay a drawn name on its sprite, hung so the city's point stays left of it.
 * @param city - its sprites
 * @param label - the drawn name
 */
function takeName(city: CitySprites, label: CityLabelImage): void {
  const texture = new CanvasTexture(label.canvas)
  texture.colorSpace = SRGBColorSpace
  city.name.material.map = texture
  city.name.material.needsUpdate = true
  city.name.center.set(label.anchorX / label.width, 0.5)
  city.nameWidth = label.width
  city.nameHeight = label.height
}

/**
 * Draw every city's name and lay it on its sprite as it comes; a name drawn after the markers were freed is dropped.
 * @param cities - the cities
 * @param sprites - their sprites, in the same order
 * @param drawLabel - how a name is drawn
 * @param accepted - asked before a drawn name is laid: `false` once torn down
 * @param frame - what a laid name is sized and faded by at once
 */
function drawNames(
  cities: readonly PlacedCity[],
  sprites: readonly CitySprites[],
  drawLabel: DrawCityLabel,
  accepted: () => boolean,
  frame: CityFrame
): void {
  cities.forEach((city, index) => {
    drawLabel(city.name, city.importance).then(
      (label) => {
        const item = sprites[index]
        if (item === undefined || !accepted()) return
        takeName(item, label)
        applyFrame(item, frame)
      },
      (error: unknown) => {
        // Said, and that name left undrawn: never shown in a face it was not meant to have. Its point still shows.
        console.error(`[Atlas] the name of ${city.name} could not be drawn`, error)
      }
    )
  })
}

/**
 * Every city's two sprites, added to the group.
 * @param cities - the cities
 * @param marks - each order's mark
 * @param object - the group they go in
 * @returns their sprites, in the cities' order
 */
function buildSprites(
  cities: readonly PlacedCity[],
  marks: Readonly<Record<CityImportance, Texture>>,
  object: Group
): CitySprites[] {
  return cities.map((city): CitySprites => {
    const point = citySprite(marks[city.importance], city.ground)
    const name = citySprite(null, city.ground)
    object.add(point, name)
    return {
      importance: city.importance,
      point,
      name,
      nameWidth: 0,
      nameHeight: 0,
      inReach: true,
      reach: 1,
      covered: false,
    }
  })
}

/**
 * Stand every city's sprites on the exaggerated relief.
 * @param cities - the cities
 * @param sprites - their sprites, in the same order
 * @param scale - the relief's `scale.y`
 */
function standOnRelief(
  cities: readonly PlacedCity[],
  sprites: readonly CitySprites[],
  scale: number
): void {
  cities.forEach(({ ground }, index) => {
    sprites[index]?.point.position.setY(ground[1] * scale)
    sprites[index]?.name.position.setY(ground[1] * scale)
  })
}

/**
 * Bring every name toward its reach for this frame: near enough to the camera or not (`nameReach`), faded in time. A
 * camera meeting no ground — looking level, which the controls never allow — leaves every name within reach.
 * @param sprites - the cities' sprites
 * @param camera - where the camera stands and how it is turned
 * @param share - the reach, as a share of the camera's distance (the level of detail's)
 * @param step - how far a name may fade this frame, as a share of a whole fade; `1` or more snaps it
 */
function followReach(
  sprites: readonly CitySprites[],
  camera: CameraPose,
  share: number,
  step: number
): void {
  const looked = lookedAt(camera)
  sprites.forEach((city) => {
    city.inReach =
      looked === null ||
      inNameReach(city.point.position, camera.position, looked, share, city.inReach)
    city.reach = toward(city.reach, city.inReach ? 1 : 0, step)
  })
}

/**
 * The names' reach across frames: each frame's fade step from the time since the last, the first frame at once.
 * @param sprites - the cities' sprites
 * @returns what brings the names toward their reach, given the camera, the time since the map started and the reach
 */
function reachFollower(
  sprites: readonly CitySprites[]
): (camera: CameraPose, seconds: number, share: number) => void {
  let last: number | null = null
  return (camera, seconds, share) => {
    const step = last === null ? 1 : Math.max(0, seconds - last) / DETAIL_FADE_SECONDS
    last = seconds
    followReach(sprites, camera, share, step)
  }
}

/**
 * Mark which cities' points fall on a country's name seen from afar.
 * @param cities - the cities
 * @param sprites - their sprites, in the same order
 * @param names - the year's names as placed, or `null` while there are none
 */
function markCovered(
  cities: readonly PlacedCity[],
  sprites: readonly CitySprites[],
  names: YearNames | null
): void {
  const covered = coveredByNames(cities, names)
  sprites.forEach((city, index) => {
    city.covered = covered[index] === true
  })
}

/**
 * Free every sprite's material, every drawn name and the marks they share.
 * @param sprites - the cities' sprites
 * @param marks - each order's mark
 */
function freeCities(
  sprites: readonly CitySprites[],
  marks: Readonly<Record<CityImportance, Texture>>
): void {
  for (const city of sprites) {
    city.name.material.map?.dispose()
    city.name.material.dispose()
    city.point.material.dispose()
  }
  for (const texture of Object.values(marks)) texture.dispose()
}

/**
 * The cities' marks and names.
 * @param cities - the cities to draw
 * @param loadTexture - how a mark's SVG becomes a texture
 * @param drawLabel - how a name is drawn
 * @returns them, as event markers that take the level of detail
 */
export function createCityMarkers(
  cities: readonly PlacedCity[],
  loadTexture: LoadSvgTexture,
  drawLabel: DrawCityLabel
): CityMarkers {
  const object = new Group()
  object.renderOrder = CITY_RENDER_ORDER
  // One mark per order, rasterised once at the names' density, shared by every city of the order.
  const marks = Object.fromEntries(
    CITY_IMPORTANCES.map((order) => [order, loadTexture(cityMarkSvg(order, LABEL_RATIO))])
  ) as Record<CityImportance, Texture>
  const sprites = buildSprites(cities, marks, object)
  const frame: CityFrame = { pixelsPerUnit: 1, reveal: 1, view: null }
  const applyAll = (): void => {
    for (const city of sprites) applyFrame(city, frame)
  }
  const state = { disposed: false }
  const reach = reachFollower(sprites)
  drawNames(cities, sprites, drawLabel, () => !state.disposed, frame)

  return {
    object,
    setReliefScale(scale: number): void {
      standOnRelief(cities, sprites, scale)
    },
    setZoom(_zoom: number, pixelsPerUnit: number): void {
      frame.pixelsPerUnit = pixelsPerUnit
      applyAll()
    },
    faceCamera(camera: CameraPose, seconds: number): void {
      // A sprite faces the camera by itself; the names follow the point it looks at.
      // Before the level of detail has spoken no name shows anyway: every one counts as within reach.
      reach(camera, seconds, frame.view?.nameReach ?? Number.POSITIVE_INFINITY)
      applyAll()
    },
    setReveal(share: number): void {
      frame.reveal = share
      applyAll()
    },
    setNameCover(names: YearNames | null): void {
      markCovered(cities, sprites, names)
      applyAll()
    },
    setDetailView(view: DetailView): void {
      frame.view = view
      // The level's order of the layers: three sorts the transparent pass by the nearest group's order.
      object.renderOrder = view.citiesOverNames ? CITY_RENDER_ORDER : CITY_UNDER_NAMES_ORDER
      applyAll()
    },
    dispose(): void {
      state.disposed = true
      freeCities(sprites, marks)
    },
  }
}
