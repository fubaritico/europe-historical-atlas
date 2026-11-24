/**
 * **Temporary** — a row of buttons, one per drawn year, top centre over the map (ATLAS-333, the dev, 2026-11-02:
 * *"a temporary element in the interface to go from one year to the other"*). It stands in for the year slider of
 * the settings' panel while the speed of a change of year is measured; **to be removed when the atlas's own
 * timeline lands (ATLAS-134)**.
 *
 * Like every module in `ui/`, it knows nothing of how a year is loaded: it is handed the years, the year shown, whether a
 * year is being drawn, and how to ask for one — read from the atlas's store since ATLAS-392, so it agrees with the dev
 * panel's slider, which asks through the same store. While a year is drawn, every button refuses its click
 * (`aria-disabled`), so two changes of year never overlap — refused rather than disabled, so the button the keyboard
 * pressed keeps the focus (review A11Y-001).
 */

/** What the switch needs. */
export interface YearSwitchDeps {
  /** The element to mount into — normally the document body, over the canvas. */
  host: HTMLElement
  /**
   * The years offered, in the order shown. **Centuries only**: the map draws a year snapped to its century
   * (`loading/stages/political.ts`, `centuryOf`), so a year of 1150 would draw 1200 under a button saying 1150 (review
   * ARCH-001). The manifest holds 1100 and 1200 today.
   */
  years: readonly number[]
  /** The year the map shows now, read at each refresh; `null` when none is drawn, no button pressed. */
  current: () => number | null
  /** Whether a year is being drawn, read at each refresh and at each click. */
  busy: () => boolean
  /**
   * Ask for a year. The switch repaints when told ({@link YearSwitch.refresh}), as the year asked and drawn change.
   * @param year - the year
   */
  pick: (year: number) => void
  /** The accessible name of the row, in the reader's language. */
  label: string
}

/** A mounted switch. */
export interface YearSwitch {
  /** The row element, for tests. */
  readonly element: HTMLElement
  /** Repaint every button from the year shown and whether one is being drawn. */
  refresh(): void
  /** Unmount it. */
  dispose(): void
}

/** The ink of the shown year's button and of the others' text. */
const INK = '#2b2118'
/** The paper of a button. */
const PAPER = 'rgba(243, 231, 205, 0.92)'

/**
 * Style one button for its state.
 * @param button - the button
 * @param shown - whether its year is the one on the map
 * @param busy - whether a year is being drawn, every click refused
 */
function paint(button: HTMLButtonElement, shown: boolean, busy: boolean): void {
  button.style.background = shown ? INK : PAPER
  button.style.color = shown ? PAPER : INK
  button.style.opacity = busy && !shown ? '0.5' : '1'
  button.style.cursor = busy ? 'wait' : 'pointer'
  button.setAttribute('aria-pressed', String(shown))
  button.setAttribute('aria-disabled', String(busy))
}

/**
 * The row the buttons sit in, top centre over the map.
 * @param label - its accessible name
 * @returns the row, empty
 */
function buildRow(label: string): HTMLElement {
  const element = document.createElement('div')
  element.setAttribute('role', 'group')
  element.setAttribute('aria-label', label)
  element.style.cssText = [
    'position:fixed',
    // Below the 24 px band where the map scrolls toward the edge (`app/viewport.ts`): at 12 px, reaching a button
    // sent the map up (the dev, 2026-11-08).
    'top:40px',
    'left:50%',
    'transform:translateX(-50%)',
    'display:flex',
    'gap:6px',
    'z-index:10',
    'font:600 14px/1 system-ui,sans-serif',
  ].join(';')
  return element
}

/**
 * One year's button.
 * @param year - the year
 * @returns the button
 */
function buildButton(year: number): HTMLButtonElement {
  const button = document.createElement('button')
  button.type = 'button'
  button.textContent = String(year)
  button.dataset.year = String(year)
  button.style.cssText = `padding:8px 14px;border:1px solid ${INK};border-radius:4px;font:inherit`
  return button
}

/**
 * Mount the year switch.
 * @param deps - the years, the year shown, whether one is drawn, how to ask, and the row's name
 * @returns the switch
 */
export function mountYearSwitch(deps: YearSwitchDeps): YearSwitch {
  const element = buildRow(deps.label)
  const buttons = deps.years.map(buildButton)

  const refresh = (): void => {
    const running = deps.busy()
    element.setAttribute('aria-busy', String(running))
    const shown = deps.current()
    for (const button of buttons) paint(button, Number(button.dataset.year) === shown, running)
  }

  const onClick = (event: MouseEvent): void => {
    const target = event.target
    // A click in the gap between two buttons is no pick.
    if (!(target instanceof HTMLButtonElement)) return
    if (deps.busy()) {
      console.warn(
        `[atlas] a year is loading: the click on ${target.dataset.year ?? ''} is refused`
      )
      return
    }
    deps.pick(Number(target.dataset.year))
  }

  element.append(...buttons)
  element.addEventListener('click', onClick)
  refresh()
  deps.host.appendChild(element)

  return {
    element,
    refresh,
    dispose(): void {
      element.removeEventListener('click', onClick)
      element.remove()
    },
  }
}
