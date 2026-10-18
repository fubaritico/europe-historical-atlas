/**
 * Where a failure is told to the reader.
 *
 * Until now every one of them ended in `console.error` and nothing else, so a relief that failed to load
 * showed a blank canvas and no explanation. A console is not a user interface.
 *
 * Two severities, and they are genuinely different things rather than two colours:
 *
 * - **blocking** — there is no map. It interrupts, so it is a `role="alert"`, announced at once.
 * - **degraded** — the map works, with something missing or approximated. It informs, so it is a
 *   `role="status"`, announced when the reader is between tasks, and it can be dismissed.
 *
 * Like every module in `ui/`, it knows nothing of what failed. It is handed words.
 */

/** How much a failure costs the reader. */
export type NoticeSeverity = 'blocking' | 'degraded'

/** One thing to tell the reader. */
export interface Notice {
  /** Whether the map still works. */
  severity: NoticeSeverity
  /** The headline, in the reader's language — one short sentence. */
  title: string
  /** What broke and where, for someone who can act on it. Optional. */
  detail?: string
}

/** How the board is built. */
export interface NoticeBoardOptions {
  /** The element to mount into — normally the document body, over the canvas. */
  host: HTMLElement
  /** Ink for the lettering. */
  ink?: string
  /** Panel background. */
  background?: string
  /** Accessible name of the button that dismisses a degraded notice. */
  dismissLabel?: string
}

/** A mounted notice board. */
export interface NoticeBoard {
  /** The board element, for tests and for callers that need to position it. */
  readonly element: HTMLElement
  /**
   * Post a notice. Two notices about the same thing would nag, so an identical title replaces rather
   * than stacks.
   * @param notice - what to tell the reader
   * @returns nothing
   */
  show(notice: Notice): void
  /**
   * Take everything down — a retry that succeeded, say.
   * @returns nothing
   */
  clear(): void
  /** Unmount and release the element. */
  dispose(): void
}

/**
 * Build the container the notices stack in.
 *
 * Takes nothing: the board is pure layout, and every colour belongs to the panels it holds.
 * @returns the board element, unmounted; it passes clicks through to whatever it sits over
 */
export function buildNoticeBoardElement(): HTMLElement {
  const element = document.createElement('div')
  element.style.cssText = [
    'position:fixed',
    'left:50%',
    'bottom:28px',
    'transform:translateX(-50%)',
    'display:flex',
    'flex-direction:column',
    'gap:10px',
    'max-width:min(560px, calc(100vw - 32px))',
    'z-index:30', // above the splash: a relief that never arrives must be explained *on* the splash
    'pointer-events:none', // the board is a container; only its buttons take clicks
  ].join(';')
  return element
}

/**
 * Build one notice's panel — its role, its look, and its words.
 *
 * The dismiss button is deliberately not built here: whether there is one at all is a question about
 * the notice, while wiring what it does is a question about the board that holds it.
 * @param notice - what to tell the reader
 * @param ink - the text and rule colour
 * @param background - the panel colour
 * @returns the panel, unmounted
 */
export function buildNoticePanel(notice: Notice, ink: string, background: string): HTMLElement {
  const panel = document.createElement('div')
  // `alert` interrupts, `status` waits for a pause. Getting this the wrong way round either shouts
  // about a missing river or stays silent about a missing map.
  panel.setAttribute('role', notice.severity === 'blocking' ? 'alert' : 'status')
  panel.style.cssText = [
    'display:flex',
    'align-items:flex-start',
    'gap:14px',
    'padding:14px 16px',
    `background:${background}`,
    `color:${ink}`,
    `border-left:4px solid ${ink}`,
    'border-radius:3px',
    'box-shadow:0 2px 10px rgba(74, 52, 36, 0.18)',
    "font-family:'Iowan Old Style','Palatino Linotype',Palatino,'Book Antiqua',Georgia,serif",
    'font-size:14px',
    'line-height:1.45',
    'pointer-events:auto',
    notice.severity === 'blocking' ? 'font-weight:600' : 'font-weight:400',
  ].join(';')

  const words = document.createElement('div')
  const title = document.createElement('p')
  title.textContent = notice.title
  title.style.cssText = 'margin:0'
  words.appendChild(title)
  if (notice.detail !== undefined && notice.detail.length > 0) {
    const detail = document.createElement('p')
    detail.textContent = notice.detail
    detail.style.cssText = 'margin:4px 0 0;opacity:0.72;font-size:12.5px'
    words.appendChild(detail)
  }
  panel.appendChild(words)
  return panel
}

/**
 * Build the button that takes a degraded notice down.
 *
 * Two accessibility points are settled here rather than by taste, both found in review on 2026-09-17:
 *
 * - **No alpha on the glyph.** It was drawn at `opacity:0.65`, which composited to ~3.71:1 against the
 *   panel — under the 4.5:1 floor of WCAG 1.4.3 for 19px non-bold text. Raising the alpha to some
 *   better number would only have fixed today's ink, since the colour is caller-supplied. Full ink
 *   instead: whatever contrast the notice's own title achieves, this control now achieves too.
 * - **A real target.** The box was sized to the glyph, about 19×23 px. WCAG 2.2's 2.5.8 asks 24×24 at
 *   AA (the familiar 44×44 is 2.5.5, and that is AAA). 32 px clears it with margin without dominating
 *   a panel whose text is 14 px.
 * @param ink - the glyph colour, the panel's own ink
 * @param label - the accessible name, in the reader's language
 * @param onDismiss - what to do when it is pressed
 * @returns the button, unmounted
 */
export function buildDismissButton(
  ink: string,
  label: string,
  onDismiss: () => void
): HTMLButtonElement {
  const close = document.createElement('button')
  close.type = 'button'
  close.textContent = '×'
  close.setAttribute('aria-label', label)
  close.style.cssText = [
    'margin-left:auto',
    'border:0',
    'background:transparent',
    `color:${ink}`,
    'font-size:19px',
    'line-height:1',
    'cursor:pointer',
    'display:inline-flex',
    'align-items:center',
    'justify-content:center',
    'min-width:32px',
    'min-height:32px',
    'padding:0',
  ].join(';')
  close.addEventListener('click', onDismiss)
  return close
}

/**
 * Build the notice board and mount it.
 * @param options - where to mount, and how it should look
 * @returns the mounted board
 */
export function createNoticeBoard(options: NoticeBoardOptions): NoticeBoard {
  const ink = options.ink ?? '#4a3424'
  const background = options.background ?? 'rgba(239, 230, 210, 0.96)'
  const dismissLabel = options.dismissLabel ?? 'Fermer'

  const element = buildNoticeBoardElement()
  options.host.appendChild(element)

  const posted = new Map<string, HTMLElement>()

  /**
   * Build one notice's panel, with its dismiss button wired to this board when it has one.
   * @param notice - the notice to show; only a `degraded` one gets a dismiss button
   * @returns the panel, not yet attached to the board
   */
  const build = (notice: Notice): HTMLElement => {
    const panel = buildNoticePanel(notice, ink, background)
    // Only a degraded notice can be dismissed. A blocking one has nothing behind it to go back to, and
    // a close button would promise otherwise.
    if (notice.severity === 'degraded') {
      panel.appendChild(
        buildDismissButton(ink, dismissLabel, () => {
          posted.delete(notice.title)
          panel.remove()
        })
      )
    }
    return panel
  }

  return {
    element,
    show(notice: Notice): void {
      posted.get(notice.title)?.remove()
      const panel = build(notice)
      posted.set(notice.title, panel)
      // Blocking first: if the map is gone, that is the thing to read, not the missing rivers.
      if (notice.severity === 'blocking') element.prepend(panel)
      else element.appendChild(panel)
    },
    clear(): void {
      for (const panel of posted.values()) panel.remove()
      posted.clear()
    },
    dispose(): void {
      posted.clear()
      element.remove()
    },
  }
}
