/**
 * The screen the reader meets before the map exists.
 *
 * It is not decoration. The relief and the land mask are three megabytes each, and until they land there
 * is nothing to draw — an empty parchment for a second reads as a broken page. A silhouette and a title
 * say "this is a map, it is coming" using the map's own ink.
 *
 * Like every other module in `ui/`, it knows nothing of what is being loaded. It is shown, then it is
 * dismissed; the composition root decides when.
 */

import { ATLAS_SUBJECT, ATLAS_TITLE, MAP_TYPEFACE, withLambdaForA } from '../utils/lettering'
import { prefersReducedMotion } from '../utils/motion'

import {
  EUROPE_SILHOUETTE_HEIGHT,
  EUROPE_SILHOUETTE_PATH,
  EUROPE_SILHOUETTE_WIDTH,
} from './europeSilhouette'

/** An outline to fill, in its own coordinate system. */
export interface SplashSilhouette {
  /** The SVG path data — one closed subpath per landmass. */
  path: string
  /** Width of the path's coordinate system. */
  width: number
  /** Height of the path's coordinate system. */
  height: number
}

/** How the splash is built. Every collaborator has a default, so a test can replace one at a time. */
export interface SplashOptions {
  /** The element to mount into — normally the document body, over the canvas. */
  host: HTMLElement
  /** The outline shown. Defaults to Europe, traced from this project's own land mask. */
  silhouette?: SplashSilhouette
  /** How wide to draw it, in CSS pixels. */
  size?: number
  /** Ink for the silhouette and the lettering. */
  ink?: string
  /** The page behind it — the scene's own background, so dismissing it shows no seam. */
  background?: string
  /** The title, in plain words, set below the outline. This is what a screen reader announces. */
  title?: string
  /** What the atlas is of, set above the outline on the same measure. */
  subject?: string
}

/** A mounted splash. */
export interface Splash {
  /** The panel element, for tests and for callers that need to position it. */
  readonly element: HTMLElement
  /**
   * Fade the splash out and unmount it. Safe to call twice — a second map arriving must not resurrect
   * a screen that is already gone.
   * @returns nothing
   */
  dismiss(): void
  /** Unmount immediately, without the fade. For teardown. */
  dispose(): void
}

export { withLambdaForA } from '../utils/lettering'

/** How long the splash takes to fade, in milliseconds. */
const FADE_MS = 420

/**
 * Cap size of the subject line, in CSS pixels.
 *
 * Far larger than the title's, and not for emphasis: both lines are tracked out to the *same* measure,
 * so the six letters of the subject would stand a whole word apart at the title's size. The bigger cap
 * is what keeps them reading as one word.
 */
const SUBJECT_FONT_PX = 42

/** Cap size of the title line, in CSS pixels. Sixteen letters need no help filling the measure. */
const TITLE_FONT_PX = 15

/**
 * Space between the three blocks, in CSS pixels.
 *
 * Tighter than it looks: `line-height: 1` boxes the lettering at its own cap size, and capitals fill
 * about seven tenths of that, so each line already carries some air of its own below the glyphs.
 */
const BLOCK_GAP_PX = 14

/**
 * Build the full-screen panel the splash lives in.
 *
 * Takes the fade duration rather than reading the motion preference itself, so the caller settles that
 * question once and a test can build either variant without touching `matchMedia`.
 * @param background - the page colour behind it, so dismissing shows no seam
 * @param fadeMs - how long the opacity transition lasts; zero for reduced motion
 * @returns the panel, announced politely as a live region
 */
export function buildSplashPanel(background: string, fadeMs: number): HTMLElement {
  const element = document.createElement('div')
  // A live region rather than a silent picture: someone who cannot see the silhouette still needs to be
  // told the map is loading, and told once.
  element.setAttribute('role', 'status')
  element.setAttribute('aria-live', 'polite')
  element.style.cssText = [
    'position:fixed',
    'inset:0',
    'display:flex',
    'flex-direction:column',
    'align-items:center',
    'justify-content:center',
    `gap:${String(BLOCK_GAP_PX)}px`,
    `background:${background}`,
    'z-index:20',
    `transition:opacity ${String(fadeMs)}ms ease-out`,
  ].join(';')
  return element
}

/**
 * Draw the outline, at the asked-for width and in the asked-for ink.
 * @param silhouette - the path and its coordinate system
 * @param size - the drawn width in CSS pixels
 * @param ink - the fill colour
 * @returns the SVG figure, hidden from assistive technology
 */
export function buildSplashFigure(
  silhouette: SplashSilhouette,
  size: number,
  ink: string
): SVGSVGElement {
  const figure = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  figure.setAttribute('width', String(size))
  // Height follows the outline's own aspect: the silhouette must not be stretched to fit a round number.
  figure.setAttribute('height', String(Math.round((size * silhouette.height) / silhouette.width)))
  figure.setAttribute('viewBox', `0 0 ${String(silhouette.width)} ${String(silhouette.height)}`)
  figure.setAttribute('aria-hidden', 'true') // the title below already names it
  const shape = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  shape.setAttribute('d', silhouette.path)
  shape.setAttribute('fill', ink)
  // Even-odd, so an inland sea traced as its own ring reads as a hole rather than filling in.
  shape.setAttribute('fill-rule', 'evenodd')
  figure.appendChild(shape)
  return figure
}

/**
 * The real words, for anyone who is not looking at the glyphs.
 *
 * A `<p>` has no role that `aria-label` reliably applies to, so the name has to be *in* the element
 * rather than attached to it — and once the glyphs are one span per letter, a reader left to them would
 * spell the title out.
 * @param text - the title, in plain words
 * @returns a span that is read but not seen, and takes no part in the layout
 */
function buildScreenReaderText(text: string): HTMLSpanElement {
  const sr = document.createElement('span')
  sr.textContent = text
  // Absolute, so it is out of the flex flow and cannot take a share of the tracking.
  sr.style.cssText = [
    'position:absolute',
    'width:1px',
    'height:1px',
    'overflow:hidden',
    'clip-path:inset(50%)',
    'white-space:nowrap',
  ].join(';')
  return sr
}

/**
 * Set one line of the title, tracked out to an exact width.
 *
 * One span per letter, spread by `space-between`. Letter-spacing could not do this: it adds a fixed gap
 * whatever the width, so two lines of different lengths would never agree — and here all three blocks,
 * both lines and the silhouette between them, have to share one measure.
 *
 * A space in the text becomes an **empty** item rather than a wider one: `space-between` puts an equal
 * gap between every pair, so an empty item at that point simply buys two of them.
 * @param text - the line, in plain words
 * @param ink - the text colour
 * @param width - the measure to fill, in CSS pixels
 * @param fontSize - the cap size, in CSS pixels
 * @returns the line element
 */
export function buildSplashLine(
  text: string,
  ink: string,
  width: number,
  fontSize: number
): HTMLParagraphElement {
  const line = document.createElement('p')
  line.style.cssText = [
    'margin:0',
    'display:flex',
    'justify-content:space-between',
    `width:${String(width)}px`,
    `color:${ink}`,
    `font-family:${MAP_TYPEFACE}`,
    `font-size:${String(fontSize)}px`,
    'font-weight:500',
    'line-height:1',
  ].join(';')
  for (const character of withLambdaForA(text).toUpperCase()) {
    const glyph = document.createElement('span')
    // The lambdas are a glyph game; the word itself is carried by the hidden span below.
    glyph.setAttribute('aria-hidden', 'true')
    glyph.textContent = character === ' ' ? '' : character
    line.appendChild(glyph)
  }
  line.appendChild(buildScreenReaderText(text))
  return line
}

/**
 * Build the splash and mount it.
 * @param options - where to mount, what to draw, and in what ink
 * @returns the mounted splash
 */
export function createSplash(options: SplashOptions): Splash {
  const silhouette = options.silhouette ?? {
    path: EUROPE_SILHOUETTE_PATH,
    width: EUROPE_SILHOUETTE_WIDTH,
    height: EUROPE_SILHOUETTE_HEIGHT,
  }
  const size = options.size ?? 300
  const ink = options.ink ?? '#5c3a2e'
  const background = options.background ?? '#efe6d2'
  const title = options.title ?? ATLAS_TITLE
  const subject = options.subject ?? ATLAS_SUBJECT
  const reduceMotion = prefersReducedMotion()

  const element = buildSplashPanel(background, reduceMotion ? 0 : FADE_MS)
  // Three blocks on one measure: the subject above the outline, the outline, the title below it.
  element.append(
    buildSplashLine(subject, ink, size, SUBJECT_FONT_PX),
    buildSplashFigure(silhouette, size, ink),
    buildSplashLine(title, ink, size, TITLE_FONT_PX)
  )
  options.host.appendChild(element)

  let gone = false
  let timer: number | null = null

  const unmount = (): void => {
    if (timer !== null) {
      clearTimeout(timer)
      timer = null
    }
    element.remove()
  }

  return {
    element,
    dismiss(): void {
      if (gone) return
      gone = true
      if (reduceMotion) {
        unmount()
        return
      }
      element.style.opacity = '0'
      timer = window.setTimeout(unmount, FADE_MS)
    },
    dispose(): void {
      gone = true
      unmount()
    },
  }
}
