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

/**
 * What a city's point says on the map (CARTO-389, the dev, 2026-11-08: *"to see at first glance the cities that should
 * have a source, and to prioritise the search for sources by zone"*): **`missing`**, red — nobody has entered its
 * holder; **`toCorrect`**, yellow — the map puts it elsewhere, or lacks its holder. The same two levels as the list's
 * names (CARTO-386); `canvas/cityVerdict`'s `cityAlert` reads them from a verdict.
 */
export type CityAlert = 'missing' | 'toCorrect'

/** The cities' colours and sizes, in device pixels. */
export interface CityStyle {
  /** The dot's and the name's ink. */
  cityInk: string
  /** The dot's ring and the name's halo. */
  cityHalo: string
  /** The ring of a city with no holder entered — the theme's `--warn` (CARTO-389). */
  cityMissing: string
  /** The ring of a city to correct on the map — the theme's `--caution` (CARTO-389). */
  cityToCorrect: string
  /** The dot's radius. */
  cityRadius: number
  /** The name's size. */
  cityFontSize: number
}

/** A city to paint: its name, its point on screen, and its holder's colour. */
export interface CityOnScreen {
  /** Its name. */
  readonly name: string
  /** Its point, in screen pixels. */
  readonly at: readonly [number, number]
  /** The colour of the polity holding it by the sources, or `null` when none is entered or the map lacks it. */
  readonly colour: string | null
  /** What its point says (CARTO-389), or `null` when all is well — and always `null` for a named city. */
  readonly alert: CityAlert | null
}

/** A full turn, for an arc. */
const FULL_TURN = Math.PI * 2

/**
 * Paint the cities shown: a dot ringed with light, and its name beside it, haloed — over the borders, under the edit
 * strokes, so a guide never hides the outline being drawn. **As points** (the dev, 2026-11-05), each a dot in its
 * holder's colour, ringed, no name.
 * @param ctx - the context
 * @param cities - the cities shown, on screen
 * @param style - the colours and sizes, in device pixels
 * @param asPoints - whether they are drawn as points
 */
export function paintCities(
  ctx: CityCanvas,
  cities: readonly CityOnScreen[],
  style: CityStyle,
  asPoints: boolean
): void {
  if (cities.length === 0) return
  if (asPoints) {
    for (const city of cities) paintPoint(ctx, city, style)
    return
  }
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

/** Each ring of a point, against a named city's dot: thin, so the coloured dot stays the most of the point. */
const RING_SCALE = 1 / 3

/**
 * Fill a disc.
 * @param ctx - the context
 * @param at - its centre, in screen pixels
 * @param radius - its radius, in screen pixels
 * @param ink - its colour
 */
function disc(ctx: CityCanvas, at: readonly [number, number], radius: number, ink: string): void {
  ctx.beginPath()
  ctx.arc(at[0], at[1], radius, 0, FULL_TURN)
  ctx.fillStyle = ink
  ctx.fill()
}

/**
 * The rings round a point (CARTO-389). **All well**: a dark ring outside a light one, so a point reads on light ground
 * and on dark alike — the look of 2026-11-05, unchanged. **With an alert** (the dev, 2026-11-08, after trying a status
 * ring between two light ones, *"not very readable"*: *"the colour, a white stroke, a thick status stroke, a black
 * stroke"*): the light ring, the status ring — red for no holder, yellow to correct, three strokes wide — and the dark
 * ring outside, the same edge as a city where all is well.
 * @param ctx - the context
 * @param city - the city on screen
 * @param style - the colours and sizes, in device pixels
 */
function paintRings(ctx: CityCanvas, city: CityOnScreen, style: CityStyle): void {
  const radius = style.cityRadius
  const ring = style.cityRadius * RING_SCALE
  if (city.alert === null) {
    disc(ctx, city.at, radius + 2 * ring, style.cityInk)
    disc(ctx, city.at, radius + ring, style.cityHalo)
    return
  }
  const status = city.alert === 'missing' ? style.cityMissing : style.cityToCorrect
  disc(ctx, city.at, radius + 5 * ring, style.cityInk)
  disc(ctx, city.at, radius + 4 * ring, status)
  disc(ctx, city.at, radius + ring, style.cityHalo)
}

/**
 * One city as a point (the dev, 2026-11-05: *"a coloured dot ringed, painted normally, not in overlay"*): a dot in the
 * colour of the polity holding it by the sources, inside its rings ({@link paintRings}). A city whose holder is not
 * entered, or not in the map, is a hollow ring: nothing is coloured that the sources do not say.
 * @param ctx - the context — its compositing the painter's ordinary one at this point of the scene
 * @param city - the city on screen
 * @param style - the colours and sizes, in device pixels
 */
function paintPoint(ctx: CityCanvas, city: CityOnScreen, style: CityStyle): void {
  paintRings(ctx, city, style)
  const [x, y] = city.at
  ctx.beginPath()
  ctx.arc(x, y, style.cityRadius, 0, FULL_TURN)
  if (city.colour === null) {
    ctx.lineWidth = style.cityRadius * RING_SCALE
    ctx.strokeStyle = style.cityInk
    ctx.stroke()
    return
  }
  ctx.fillStyle = city.colour
  ctx.fill()
}
