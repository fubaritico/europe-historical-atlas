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

/** How long the splash takes to fade, in milliseconds. */
const FADE_MS = 420

/**
 * Swap every `A` for a capital lambda.
 *
 * A borrowed Greek letter is the oldest trick in cartographic lettering, and it costs nothing here
 * because the accessible name carries the real word — the play is in the glyphs, never in the text a
 * screen reader reads out.
 * @param text - the title, in plain words
 * @returns the same text with `A` and `a` rendered as `Λ`
 */
export function withLambdaForA(text: string): string {
  return text.replace(/[Aa]/g, 'Λ')
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

  const reduceMotion =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

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
    `transition:opacity ${reduceMotion ? '0' : String(FADE_MS)}ms ease-out`,
  ].join(';')

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

  const caption = document.createElement('p')
  caption.textContent = withLambdaForA(title).toUpperCase()
  // The plain word is what gets announced; the lambdas are a glyph game and would be spelled out.
  caption.setAttribute('aria-label', title)
  caption.style.cssText = [
    'margin:0',
    `color:${ink}`,
    "font-family:'Iowan Old Style','Palatino Linotype',Palatino,'Book Antiqua',Georgia,serif",
    'font-size:15px',
    'font-weight:500',
    'letter-spacing:0.42em',
    'text-indent:0.42em', // the tracking adds a trailing gap; this puts the block back on centre
    'text-transform:uppercase',
  ].join(';')

  element.append(figure, caption)
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
