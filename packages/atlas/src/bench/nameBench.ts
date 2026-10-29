/**
 * The country names' bench (ATLAS-301, step 2 of `files/plans/atlas/country-names.md`): 1100's polities
 * named in their own space by `core/pipeline/namePlacement`, in each candidate face, the ink and its blend
 * tunable — `/names.html` on the atlas's dev server, never built. The dev picks the face and the ink here.
 *
 * Flat, on a 2D canvas: the fills are the year's colours at the display level, over the parchment — what is
 * judged is the lettering, not the relief. The names are the registry's formal ones, the longest, so the
 * hardest case for the fit; the short name per language is step 4.
 */

import { AUTOMATIC_PALETTE } from '@europe-historical-atlas/core/data/regionPalette'
import { rasteriseRegions } from '@europe-historical-atlas/core/data/regionRaster'
import { createAuthoredYearSource } from '@europe-historical-atlas/core/data/yearManifest'
import { homageLevels } from '@europe-historical-atlas/core/editor/homageLevels'
import { polityColours } from '@europe-historical-atlas/core/editor/polityColours'
import { regionBearers } from '@europe-historical-atlas/core/editor/regionBearers'
import { openYearDocument } from '@europe-historical-atlas/core/editor/yearDocument'
import { latitudeToMercatorY } from '@europe-historical-atlas/core/geo/mercator'
import { createOccupancy } from '@europe-historical-atlas/core/pipeline/nameOccupancy'
import { placeNames } from '@europe-historical-atlas/core/pipeline/namePlacement'
import { untitledName } from '@europe-historical-atlas/core/pipeline/nameTitle'
import { ownerGrid } from '@europe-historical-atlas/core/pipeline/ownerGrid'
import { NAME_GRID_WIDTH as GRID_WIDTH } from '@europe-historical-atlas/core/pipeline/yearNames'

import { DEFAULT_NAME_PARAMS, namePlacement } from '../tunables/params'

import { START_SETTINGS, controls, cycleFacesWithArrows } from './nameBenchControls'

import type { Settings } from './nameBenchControls'
import type { RegionRaster } from '@europe-historical-atlas/core/data/regionRaster'
import type { Region } from '@europe-historical-atlas/core/data/regionSource'
import type { HomageLevels } from '@europe-historical-atlas/core/editor/homageLevels'
import type {
  MeasureName,
  NamePlacement,
} from '@europe-historical-atlas/core/pipeline/namePlacement'

/** One candidate face: its name on the bench, its CSS family, its file. */
interface Face {
  /** As the bench lists it. */
  readonly label: string
  /** The family it is registered under. */
  readonly family: string
  /** Where its file is served from. */
  readonly url: string
}

/**
 * A candidate face from its file beside the bench.
 * @param label - its name on the bench
 * @param file - its file, in `./fonts/`
 * @returns the face
 */
function face(label: string, file: string): Face {
  return {
    label,
    family: `bench-${file.slice(0, file.lastIndexOf('.'))}`,
    url: new URL(`./fonts/${file}`, import.meta.url).href,
  }
}

/**
 * A value the bench built itself and must hold: a miss is a defect of the bench, said rather than drawn.
 * @param value - the value, `undefined` on a miss
 * @param what - what was looked for, for the message
 * @returns the value
 * @throws when it is missing
 */
function required<T>(value: T | undefined, what: string): T {
  if (value === undefined) throw new Error(`[atlas] the names bench has no ${what}`)
  return value
}

/** The candidates the dev chose on 2026-10-28 — eight OFL faces from Google Fonts and one CC BY-NC. */
const FACES: readonly Face[] = [
  face('Uncial Antiqua', 'uncialantiqua.woff2'),
  face('Felipa', 'felipa.woff2'),
  face('Almendra', 'almendra.woff2'),
  face('Caesar Dressing', 'caesardressing.woff2'),
  face('Quintessential', 'quintessential.woff2'),
  face('Fondamento', 'fondamento.woff2'),
  face('Manufacturing Consent', 'manufacturingconsent.woff2'),
  face('Germania One', 'germaniaone.woff2'),
  face('Bulgaria Moderna (CC BY-NC)', 'bulgariamoderna.otf'),
]

/** The year on the bench. */
const YEAR = 1100

/** Canvas pixels per grid cell: twice the CSS pixel, for a sharp line on a retina screen. */
const SCALE = 2

/** The font size names are measured at, in pixels; every measure is divided by it back to a size of one. */
const MEASURE_PX = 100

/** How opaque the countries' colours are over the parchment — enough to tell them apart, light enough to read on. */
const FILL_OPACITY = 0.6

/** The year, read once and prepared for every redraw. */
interface Prepared {
  /** The regions, in the grid's normalized coordinates. */
  readonly regions: readonly Region[]
  /** Each region's polity id, in the regions' order. */
  readonly regionPolities: readonly string[]
  /** Each cell's region. */
  readonly raster: RegionRaster
  /** The year's homage. */
  readonly homage: HomageLevels
  /** Each polity's colour, by id. */
  readonly colours: ReadonlyMap<string, string>
  /** Each polity's name, by id. */
  readonly names: ReadonlyMap<string, string>
  /** The grid's height in cells, for the map's own proportions. */
  readonly height: number
}

/**
 * The grid's height for its width, in the map's Mercator proportions.
 * @param bbox - the map's frame
 * @param bbox.west - its west edge, degrees
 * @param bbox.east - its east edge
 * @param bbox.south - its south edge
 * @param bbox.north - its north edge
 * @returns the height in cells
 */
function gridHeight(bbox: { west: number; east: number; south: number; north: number }): number {
  const across = ((bbox.east - bbox.west) * Math.PI) / 180
  const down = latitudeToMercatorY(bbox.north) - latitudeToMercatorY(bbox.south)
  return Math.round((GRID_WIDTH * down) / across)
}

/**
 * Read the year and prepare what every redraw reads.
 * @returns the prepared year
 * @throws when the year is not authored, or a region carries no polity id
 */
async function prepare(): Promise<Prepared> {
  const source = createAuthoredYearSource({
    manifestUrl: '/years/index.json',
    yearsBase: '/years',
    unauthored: {
      load: (year) =>
        Promise.reject(new Error(`[atlas] the bench reads authored years; ${String(year)} is not`)),
    },
  })
  const set = await source.load(YEAR)
  if (set.authored === undefined) throw new Error(`[atlas] ${String(YEAR)} came back unauthored`)
  const { year, bbox } = set.authored
  const height = gridHeight(bbox)
  const regionPolities = set.regions.map(({ polityId }) => {
    if (polityId === undefined) throw new Error('[atlas] an authored region carries no polity id')
    return polityId
  })
  return {
    regions: set.regions,
    regionPolities,
    raster: rasteriseRegions(set.regions, GRID_WIDTH, height),
    homage: homageLevels(year.registry.polities),
    colours: polityColours(openYearDocument(year), AUTOMATIC_PALETTE),
    names: new Map(year.registry.polities.map(({ id, name }) => [id, name])),
    height,
  }
}

/**
 * Load every candidate face, so that measuring a name never reads a fallback's widths.
 * @returns once all are ready
 */
async function loadFaces(): Promise<void> {
  await Promise.all(
    FACES.map(async ({ family, url }) => {
      const face = new FontFace(family, `url(${url})`)
      await face.load()
      document.fonts.add(face)
    })
  )
}

/**
 * A measure of names in a face, through the canvas, at a size of one.
 * @param context - a 2D context to measure with
 * @param family - the face's family
 * @returns the measure `placeNames` takes, the letters unspaced: the spacing is the construction's
 */
function canvasMeasure(context: CanvasRenderingContext2D, family: string): MeasureName {
  return (text) => {
    context.font = `${String(MEASURE_PX)}px "${family}"`
    const whole = context.measureText(text)
    return {
      advances: Array.from(text, (letter) => context.measureText(letter).width / MEASURE_PX),
      ascent: whole.actualBoundingBoxAscent / MEASURE_PX,
      descent: whole.actualBoundingBoxDescent / MEASURE_PX,
    }
  }
}

/**
 * Paint each region in the colour it wears at the level.
 * @param context - the canvas
 * @param prepared - the year
 * @param level - the display level
 */
function paintFills(context: CanvasRenderingContext2D, prepared: Prepared, level: number): void {
  const across = (GRID_WIDTH - 1) * SCALE
  const down = (prepared.height - 1) * SCALE
  context.globalCompositeOperation = 'source-over'
  context.globalAlpha = FILL_OPACITY
  prepared.regions.forEach((region, index) => {
    const id = required(prepared.regionPolities[index], `polity for region ${String(index)}`)
    const bearer = prepared.homage.ancestorAt(id, level)
    context.fillStyle = required(prepared.colours.get(bearer), `colour for ${bearer}`)
    context.beginPath()
    for (const ring of region.rings)
      ring.forEach(({ u, v }, at) => {
        const x = u * across + SCALE / 2
        const y = v * down + SCALE / 2
        if (at === 0) context.moveTo(x, y)
        else context.lineTo(x, y)
      })
    context.fill('evenodd')
  })
  context.globalAlpha = 1
}

/**
 * Write the names placed, letter by letter, each on its baseline place and turned with the line.
 * @param context - the canvas
 * @param placement - the names placed
 * @param settings - the face, the ink and its blend
 */
function writeNames(
  context: CanvasRenderingContext2D,
  placement: NamePlacement,
  settings: Settings
): void {
  const family = required(FACES[settings.face], `face ${String(settings.face)}`).family
  context.globalCompositeOperation = settings.blend
  context.globalAlpha = settings.opacity
  context.fillStyle = settings.ink
  context.textAlign = 'center'
  context.textBaseline = 'alphabetic'
  for (const name of placement.placed) {
    const px = name.size * SCALE
    context.font = `${String(px)}px "${family}"`
    Array.from(name.text).forEach((letter, at) => {
      const glyph = name.glyphs[at]
      if (glyph === undefined) return
      context.save()
      context.translate((glyph.x + 0.5) * SCALE, (glyph.y + 0.5) * SCALE)
      context.rotate(glyph.angle)
      context.fillText(letter, 0, 0)
      context.restore()
    })
  }
  context.globalAlpha = 1
  context.globalCompositeOperation = 'source-over'
}

/** A placement computed, with what drawing it needs and what it cost. */
interface Placed {
  /** The names placed. */
  readonly placement: NamePlacement
  /** How long the placement took, in milliseconds. */
  readonly took: number
}

/**
 * Place the names with the settings that move them — the face, the level, the smallest size and the capitals; the ink,
 * its opacity and its blend do not. The construction is the atlas's own (`DEFAULT_NAME_PARAMS`), its settings tuned on
 * the atlas, where the names are judged: the full name where it fits, the untitled one otherwise, and no name over
 * another's cells, as `placeYearNames` places a level.
 * @param context - a 2D context to measure with
 * @param prepared - the year
 * @param settings - what the dev tuned
 * @returns the placement
 */
function place(context: CanvasRenderingContext2D, prepared: Prepared, settings: Settings): Placed {
  const family = required(FACES[settings.face], `face ${String(settings.face)}`).family
  const { owners, ids } = ownerGrid(
    prepared.raster.cells,
    regionBearers(prepared.regionPolities, prepared.homage, settings.level)
  )
  const requests = ids.map((id, owner) => {
    const name = required(prepared.names.get(id), `name for ${id}`)
    const cased = (text: string): string =>
      settings.capitals ? text.toLocaleUpperCase('fr') : text
    const short = untitledName(name)
    return short === name
      ? { owner, text: cased(name) }
      : { owner, text: cased(name), shorter: cased(short) }
  })
  const started = performance.now()
  const placement = placeNames(
    owners,
    GRID_WIDTH,
    prepared.height,
    requests,
    canvasMeasure(context, family),
    {
      ...namePlacement(DEFAULT_NAME_PARAMS),
      minSize: settings.minSize,
      longMinSize: settings.minSize,
    },
    createOccupancy(GRID_WIDTH, prepared.height)
  )
  return { placement, took: performance.now() - started }
}

/**
 * What a placement depends on, as a key: two settings with the same key place the names alike.
 * @param settings - what the dev tuned
 * @returns the key
 */
function placementKey(settings: Settings): string {
  const { face, level, minSize, capitals } = settings
  return JSON.stringify([face, level, minSize, capitals])
}

/**
 * Redraw the map and its names with the settings, placing them again only when a setting that moves them
 * changed — a level of 1100 takes close to a second (three levels in 2.5 s under Node, 29/10).
 * @param canvas - the bench's canvas
 * @param prepared - the year
 * @param settings - what the dev tuned
 * @param placements - the placements already computed, by key — filled
 * @returns what the status line says
 */
function draw(
  canvas: HTMLCanvasElement,
  prepared: Prepared,
  settings: Settings,
  placements: Map<string, Placed>
): string {
  const context = canvas.getContext('2d')
  if (context === null) throw new Error('[atlas] the bench has no 2D context')
  const key = placementKey(settings)
  const placed = placements.get(key) ?? place(context, prepared, settings)
  placements.set(key, placed)
  context.clearRect(0, 0, canvas.width, canvas.height)
  paintFills(context, prepared, settings.level)
  writeNames(context, placed.placement, settings)
  const { placement, took } = placed
  return `${String(placement.placed.length)} noms posés · ${String(placement.tooSmall.length)} trop petits à ce niveau · placement en ${took.toFixed(0)} ms`
}

/**
 * Build the bench: load, lay out the controls, draw, and redraw on every change.
 * @param root - where the bench goes
 */
async function mount(root: HTMLElement): Promise<void> {
  const status = document.createElement('p')
  status.id = 'status'
  status.textContent = 'Chargement de 1100 et des polices…'
  root.append(status)
  const [prepared] = await Promise.all([prepare(), loadFaces()])
  const settings: Settings = { ...START_SETTINGS }
  const canvas = document.createElement('canvas')
  canvas.width = GRID_WIDTH * SCALE
  canvas.height = prepared.height * SCALE
  canvas.style.width = `${String(GRID_WIDTH)}px`
  const form = document.createElement('form')
  const all = controls(
    settings,
    prepared.homage.deepest,
    FACES.map(({ label }) => label)
  )
  const placements = new Map<string, Placed>()
  let pending = false
  const redraw = (): void => {
    if (pending) return
    pending = true
    requestAnimationFrame(() => {
      pending = false
      for (const control of all) control.apply(settings)
      status.textContent = draw(canvas, prepared, settings, placements)
    })
  }
  for (const { label, input } of all) {
    const wrapper = document.createElement('label')
    wrapper.append(label, input)
    input.addEventListener('input', redraw)
    form.append(wrapper)
  }
  const faceSelect = all[0]?.input
  if (faceSelect instanceof HTMLSelectElement) cycleFacesWithArrows(faceSelect, redraw)
  root.prepend(form)
  root.append(canvas)
  redraw()
}

const root = document.getElementById('bench')
if (root === null) throw new Error('[atlas] the bench page has no #bench')
mount(root).catch((error: unknown) => {
  console.error('[atlas] the names bench could not start', error)
  root.textContent = `Le banc n'a pas pu démarrer : ${error instanceof Error ? error.message : String(error)}`
})
