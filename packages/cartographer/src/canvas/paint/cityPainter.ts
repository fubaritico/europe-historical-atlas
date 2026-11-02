/**
 * The cities `{Cities}` shows, painted as guides for the borders (CARTO-193) — beside the painter, which calls it in
 * its order, so the painter's file holds the scene's order and not every drawing.
 */

/** What the cities are painted with — the painter's context, declared here so the two files do not import each other. */
export interface CityCanvas {
  /** Start a new path. */
  beginPath: () => void
  /** Add a circular arc. */
  arc: (x: number, y: number, radius: number, start: number, end: number) => void
  /** Fill the current path. */
  fill: () => void
  /** Stroke the current path. */
  stroke: () => void
  /** Write text in the fill colour. */
  fillText: (text: string, x: number, y: number) => void
  /** Outline text in the stroke colour. */
  strokeText: (text: string, x: number, y: number) => void
  /** The text's face. */
  font: string
  /** Where text sits on its line. */
  textBaseline: CanvasTextBaseline
  /** The stroke width. */
  lineWidth: number
  /** The fill colour. */
  fillStyle: string | CanvasGradient | CanvasPattern
  /** The stroke colour. */
  strokeStyle: string | CanvasGradient | CanvasPattern
}

/** The cities' colours and sizes, in device pixels. */
export interface CityStyle {
  /** The dot's and the name's ink. */
  cityInk: string
  /** The dot's ring and the name's halo. */
  cityHalo: string
  /** The dot's radius. */
  cityRadius: number
  /** The name's size. */
  cityFontSize: number
}

/** A city to paint: its name and its point on screen. */
export interface CityOnScreen {
  /** Its name. */
  readonly name: string
  /** Its point, in screen pixels. */
  readonly at: readonly [number, number]
}

/** A full turn, for an arc. */
const FULL_TURN = Math.PI * 2

/**
 * Paint the cities shown: a dot ringed with light, and its name beside it, haloed — over the borders, under the edit
 * strokes, so a guide never hides the outline being drawn.
 * @param ctx - the context
 * @param cities - the cities shown, on screen
 * @param style - the colours and sizes, in device pixels
 */
export function paintCities(
  ctx: CityCanvas,
  cities: readonly CityOnScreen[],
  style: CityStyle
): void {
  if (cities.length === 0) return
  ctx.font = `600 ${String(style.cityFontSize)}px system-ui, sans-serif`
  ctx.textBaseline = 'middle'
  ctx.lineWidth = style.cityRadius
  for (const { name, at } of cities) {
    ctx.beginPath()
    ctx.arc(at[0], at[1], style.cityRadius, 0, FULL_TURN)
    ctx.fillStyle = style.cityInk
    ctx.strokeStyle = style.cityHalo
    ctx.stroke()
    ctx.fill()
    const x = at[0] + style.cityRadius * 2
    ctx.strokeText(name, x, at[1])
    ctx.fillText(name, x, at[1])
  }
}
