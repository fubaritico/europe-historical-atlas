/**
 * A progress panel over the canvas, for work the map cannot do between two frames.
 *
 * Pure DOM: it knows nothing of three.js, of what is being computed, or of why. The caller drives it
 * through {@link ProgressOverlay}, which is also what lets a worker drive it later without this module
 * changing at all.
 *
 * Accessible from the first line rather than retrofitted (see roadmap chapter 07): the canvas has no
 * DOM equivalent, so this panel is the only thing a screen reader can be told about while the map is
 * busy. It announces itself politely, carries a real `progressbar` with its value, and honours
 * `prefers-reduced-motion` by not animating the fill.
 */

/** How the panel presents itself. */
export interface ProgressOverlayOptions {
  /** The element to mount into — normally the document body, beside the canvas. */
  host: HTMLElement
  /** Ink colour, to sit with the map rather than on top of it. */
  ink?: string
  /** Panel background. */
  background?: string
}

/** A mounted progress panel. */
export interface ProgressOverlay {
  /** The panel element, for tests and for callers that need to position it. */
  readonly element: HTMLElement
  /**
   * Show the panel at zero and announce what is starting.
   * @param label - what the map is doing, in the user's language
   * @returns nothing
   */
  begin(label: string): void
  /**
   * Move the bar, optionally renaming the step.
   * @param fraction - progress in `[0, 1]`; values outside are clamped
   * @param label - the step now running, when it has changed
   * @returns nothing
   */
  report(fraction: number, label?: string): void
  /**
   * Hide the panel. Safe to call when it is already hidden.
   * @returns nothing
   */
  end(): void
  /** Unmount and release the element. */
  dispose(): void
}

/**
 * Build the progress panel and mount it.
 * @param options - where to mount, and how it should look
 * @returns the mounted panel
 */
export function createProgressOverlay(options: ProgressOverlayOptions): ProgressOverlay {
  const ink = options.ink ?? '#4a3424'
  const background = options.background ?? 'rgba(239, 230, 210, 0.94)'
  const reduceMotion =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const element = document.createElement('div')
  // `status` rather than `alert`: work in progress is information, not a problem demanding attention.
  element.setAttribute('role', 'status')
  element.setAttribute('aria-live', 'polite')
  element.hidden = true
  element.style.cssText = [
    'position:fixed',
    'left:50%',
    'bottom:2.5rem',
    'transform:translateX(-50%)',
    'min-width:18rem',
    'padding:0.75rem 1rem',
    'border-radius:0.25rem',
    `background:${background}`,
    `color:${ink}`,
    `border:1px solid ${ink}33`,
    'font:0.8125rem/1.4 ui-serif, Georgia, serif',
    'box-shadow:0 1px 8px rgba(0,0,0,0.12)',
    'pointer-events:none',
    'z-index:10',
  ].join(';')

  const caption = document.createElement('div')
  caption.style.cssText = 'margin-bottom:0.5rem;letter-spacing:0.02em'
  element.append(caption)

  const track = document.createElement('div')
  track.setAttribute('role', 'progressbar')
  track.setAttribute('aria-valuemin', '0')
  track.setAttribute('aria-valuemax', '100')
  track.style.cssText = `height:0.25rem;border-radius:0.125rem;background:${ink}22;overflow:hidden`
  const fill = document.createElement('div')
  fill.style.cssText = [
    'height:100%',
    'width:0%',
    `background:${ink}`,
    reduceMotion ? '' : 'transition:width 120ms linear',
  ]
    .filter(Boolean)
    .join(';')
  track.append(fill)
  element.append(track)
  options.host.append(element)

  /**
   * Write a fraction onto the bar and its accessible value together, so the two cannot drift.
   * @param fraction - progress in `[0, 1]`
   * @returns nothing
   */
  const paint = (fraction: number): void => {
    const clamped = Math.min(1, Math.max(0, Number.isFinite(fraction) ? fraction : 0))
    const percent = Math.round(clamped * 100)
    fill.style.width = `${String(percent)}%`
    track.setAttribute('aria-valuenow', String(percent))
  }

  return {
    element,
    begin(label: string): void {
      caption.textContent = label
      track.setAttribute('aria-label', label)
      paint(0)
      element.hidden = false
    },
    report(fraction: number, label?: string): void {
      if (label !== undefined) {
        caption.textContent = label
        track.setAttribute('aria-label', label)
      }
      paint(fraction)
    },
    end(): void {
      element.hidden = true
      paint(0)
    },
    dispose(): void {
      element.remove()
    },
  }
}
