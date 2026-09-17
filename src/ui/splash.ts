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

import { MAP_TYPEFACE, withLambdaForA } from '../utils/lettering'
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
  /** The title, in plain words. This is what a screen reader announces. */
  title?: string
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
    'gap:28px',
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
 * Set the title, lettered for the eye and named in plain words for everyone else.
 * @param title - the title, in plain words
 * @param ink - the text colour
 * @returns the caption element
 */
export function buildSplashCaption(title: string, ink: string): HTMLParagraphElement {
  const caption = document.createElement('p')
  caption.textContent = withLambdaForA(title).toUpperCase()
  // The plain word is what gets announced; the lambdas are a glyph game and would be spelled out.
  caption.setAttribute('aria-label', title)
  caption.style.cssText = [
    'margin:0',
    `color:${ink}`,
    `font-family:${MAP_TYPEFACE}`,
    'font-size:15px',
    'font-weight:500',
    'letter-spacing:0.42em',
    'text-indent:0.42em', // the tracking adds a trailing gap; this puts the block back on centre
    'text-transform:uppercase',
  ].join(';')
  return caption
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
  const title = options.title ?? 'Historical atlas'
  const reduceMotion = prefersReducedMotion()

  const element = buildSplashPanel(background, reduceMotion ? 0 : FADE_MS)
  element.append(buildSplashFigure(silhouette, size, ink), buildSplashCaption(title, ink))
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
