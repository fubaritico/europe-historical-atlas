/**
 * The country names' letters, measured and drawn once in their face (ATLAS-301, step 3b of
 * `files/plans/atlas/country-names.md`): the measures go to the compute, which places the names with them; the
 * image goes to the layer, which cuts each letter's tile out of it. One measure for both, so a letter is drawn
 * exactly as wide as it was placed.
 *
 * White on transparent: the layer tints it with the ink. Drawn at {@link SHEET_PX_PER_EM}, so a large name close up
 * is slightly soft — wanted (the dev, 2026-10-28: *« ce ne serait pas plus mal que ce soit un peu flouté »*).
 */

import { distanceToOutside } from '@europe-historical-atlas/core/geo/distanceTransform'

import type { GlyphCell, NameSheet } from '../../../sources/mapSources'
import type { GlyphMetric } from '@europe-historical-atlas/core/pipeline/yearNames'

/** The face's size on the sheet, in pixels: a letter's tile is drawn from this many pixels an em. */
export const SHEET_PX_PER_EM = 128

/** The room left either side of a letter in its cell, in ems — a swash may reach past its advance. */
export const SHEET_PAD = 0.2

/** The sheet's widest row, in pixels — within the 2048 every WebGL 2 device takes. */
const SHEET_MAX_WIDTH = 2048

/** One character's measure on the sheet, at a font size of one. */
type Measured = GlyphMetric

/** Where a character's cell lies on the sheet, in pixels. */
interface Slot {
  /** Its left edge. */
  readonly x: number
  /** Its top edge. */
  readonly y: number
  /** Its width, the advance and both pads. */
  readonly width: number
}

/** The sheet's cells, laid out row by row. */
export interface SheetLayout {
  /** The sheet's width, in pixels. */
  readonly width: number
  /** Its height. */
  readonly height: number
  /** Every character's cell. */
  readonly slots: ReadonlyMap<string, Slot>
  /** Every row's height, in pixels — the face's whole reach. */
  readonly rowHeight: number
}

/**
 * Lay the characters' cells out in rows, left to right.
 * @param advances - each character's advance, in ems
 * @param reach - the face's reach above and below the baseline, in ems
 * @param reach.ascent - above
 * @param reach.descent - below
 * @returns the layout
 * @throws when one character is wider than a row
 */
export function layoutSheet(
  advances: ReadonlyMap<string, number>,
  reach: { ascent: number; descent: number }
): SheetLayout {
  const rowHeight = Math.ceil((reach.ascent + reach.descent) * SHEET_PX_PER_EM)
  const slots = new Map<string, Slot>()
  let x = 0
  let y = 0
  let width = 0
  for (const [character, advance] of advances) {
    const cell = Math.ceil((advance + 2 * SHEET_PAD) * SHEET_PX_PER_EM)
    if (cell > SHEET_MAX_WIDTH)
      throw new Error(`[atlas] "${character}" is wider than a sheet's row`)
    if (x + cell > SHEET_MAX_WIDTH) {
      x = 0
      y += rowHeight
    }
    slots.set(character, { x, y, width: cell })
    x += cell
    width = Math.max(width, x)
  }
  return { width, height: y + rowHeight, slots, rowHeight }
}

/**
 * The characters of a set of names, each once, in the order they first appear — the space aside, which draws
 * nothing and is placed by its advance alone.
 * @param names - the names
 * @returns their characters
 */
export function charactersOf(names: Iterable<string>): string[] {
  const seen = new Set<string>()
  for (const name of names) for (const character of name) seen.add(character)
  return [...seen]
}

/**
 * Each character measured at a font size of one, in the context's font.
 * @param context - the context, its font set
 * @param characters - the characters
 * @returns their measures
 */
function measureGlyphs(
  context: CanvasRenderingContext2D,
  characters: readonly string[]
): Record<string, Measured> {
  const glyphs: Record<string, Measured> = {}
  for (const character of characters) {
    const metrics = context.measureText(character)
    glyphs[character] = {
      advance: metrics.width / SHEET_PX_PER_EM,
      ascent: metrics.actualBoundingBoxAscent / SHEET_PX_PER_EM,
      descent: metrics.actualBoundingBoxDescent / SHEET_PX_PER_EM,
    }
  }
  return glyphs
}

/**
 * The reach every cell shares, so every letter shares one baseline: the face's declared box, or further where a
 * letter reaches past it — Fondamento's « g » and « y » hang below its own box, and were cut off by the cell below
 * (seen on the atlas, 2026-10-28).
 * @param context - the context, its font set
 * @param glyphs - every character's measure
 * @returns how far the cells reach above and below the baseline, in ems
 */
function sheetReach(
  context: CanvasRenderingContext2D,
  glyphs: Record<string, Measured>
): { ascent: number; descent: number } {
  const box = context.measureText('Hg')
  const measured = Object.values(glyphs)
  return {
    ascent: Math.max(
      box.fontBoundingBoxAscent / SHEET_PX_PER_EM,
      ...measured.map(({ ascent }) => ascent)
    ),
    descent: Math.max(
      box.fontBoundingBoxDescent / SHEET_PX_PER_EM,
      ...measured.map(({ descent }) => descent)
    ),
  }
}

/**
 * How far from its letter the edge's field reaches, in ems: past it the field reads « far ». Enough for the widest
 * edge any name is given — the smallest name's (`nameGeometry`'s `haloCells` over the smallest size).
 */
export const HALO_FIELD_EM = 0.25

/**
 * A canvas's 2D context, sized to the sheet and set to draw its letters in white.
 * @param canvas - the canvas, resized here
 * @param layout - the sheet's cells
 * @param font - the face, at the sheet's size
 * @returns the context
 * @throws when the canvas has no 2D context
 */
function sheetContext(
  canvas: HTMLCanvasElement,
  layout: SheetLayout,
  font: string
): CanvasRenderingContext2D {
  const context = canvas.getContext('2d')
  if (context === null) throw new Error('[atlas] the names sheet has no 2D context')
  // Resizing a canvas resets its state: everything is set after.
  canvas.width = layout.width
  canvas.height = layout.height
  context.font = font
  context.fillStyle = '#ffffff'
  context.textBaseline = 'alphabetic'
  context.textAlign = 'left'
  return context
}

/**
 * The letters' edge field: each pixel's distance to the nearest letter, in the red channel, from `0` on a letter to
 * `255` at {@link HALO_FIELD_EM} and beyond. The layer draws the white edge from it at the width it chooses, the same
 * on the map for every name whatever its size — an edge drawn on the sheet would grow and shrink with each name (the
 * dev, 2026-10-28: *« d'abord tu redimensionnes le texte et après tu appliques le bord […] quelle que soit la
 * taille »*).
 * @param letters - the drawn letters, white on transparent
 * @param halo - the canvas the field is written to, sized like the letters
 * @param layout - the sheet's size
 * @throws when the field's canvas has no 2D context
 */
function paintEdgeField(
  letters: CanvasRenderingContext2D,
  halo: HTMLCanvasElement,
  layout: SheetLayout
): void {
  const { width, height } = layout
  const field = halo.getContext('2d')
  if (field === null) throw new Error('[atlas] the names sheet has no 2D context')
  halo.width = width
  halo.height = height
  const alpha = letters.getImageData(0, 0, width, height).data
  const away = new Uint8Array(width * height)
  for (let at = 0; at < away.length; at += 1) away[at] = (alpha[at * 4 + 3] ?? 0) < 128 ? 1 : 0
  // From every pixel off the letters to the nearest pixel on one — none on a sheet of spaces, so all far.
  const distances = away.includes(0) ? distanceToOutside(away, width, height) : null
  const image = field.createImageData(width, height)
  const far = HALO_FIELD_EM * SHEET_PX_PER_EM
  for (let at = 0; at < away.length; at += 1) {
    const d = distances === null ? far : (distances[at] ?? far)
    image.data[at * 4] = Math.round(Math.min(1, d / far) * 255)
    image.data[at * 4 + 3] = 255
  }
  field.putImageData(image, 0, 0)
}

/** The two images of the letters: the letters themselves, and the field their white edge is drawn from. */
export interface SheetCanvases {
  /** Where the letters are drawn. */
  readonly letters: HTMLCanvasElement
  /** Where each pixel's distance to the nearest letter is written. */
  readonly halo: HTMLCanvasElement
}

/**
 * Measure the characters of the names and draw them on a sheet, and the field of their edge on a second one laid
 * out alike.
 *
 * **The face must have loaded before this is called**: a canvas measures a face it does not have with its fallback,
 * and every name would then be placed for letters it is not drawn in — with no error anywhere.
 * @param characters - every character of the names
 * @param family - the face, as CSS names it
 * @param canvases - the canvases the letters and their edge's field are drawn on; sized here
 * @returns the sheet, and the measures the compute places the names with
 * @throws when a canvas has no 2D context
 */
export function drawNameSheet(
  characters: readonly string[],
  family: string,
  canvases: SheetCanvases
): { sheet: NameSheet; glyphs: Record<string, GlyphMetric> } {
  const measuring = canvases.letters.getContext('2d')
  if (measuring === null) throw new Error('[atlas] the names sheet has no 2D context')
  const font = `${String(SHEET_PX_PER_EM)}px "${family}"`
  measuring.font = font
  const glyphs = measureGlyphs(measuring, characters)
  const reach = sheetReach(measuring, glyphs)
  const drawn = characters.filter((character) => character !== ' ')
  const layout = layoutSheet(
    new Map(drawn.map((character) => [character, glyphs[character]?.advance ?? Number.NaN])),
    reach
  )
  const letters = sheetContext(canvases.letters, layout, font)
  const cells = new Map<string, GlyphCell>()
  for (const [character, slot] of layout.slots) {
    letters.fillText(
      character,
      slot.x + SHEET_PAD * SHEET_PX_PER_EM,
      slot.y + reach.ascent * SHEET_PX_PER_EM
    )
    cells.set(character, {
      u0: slot.x / layout.width,
      u1: (slot.x + slot.width) / layout.width,
      v0: slot.y / layout.height,
      v1: (slot.y + layout.rowHeight) / layout.height,
      advance: glyphs[character]?.advance ?? Number.NaN,
    })
  }
  paintEdgeField(letters, canvases.halo, layout)
  return { sheet: { image: canvases.letters, halo: canvases.halo, cells, ...reach }, glyphs }
}
