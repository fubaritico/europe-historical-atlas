import type { ReactNode } from 'react'

/**
 * A button of the two top bars, and the one rule for when it cannot act (2026-10-13).
 *
 * **Unavailable is `aria-disabled`, never `disabled`** — for a feature not built yet and for an undo with
 * nothing to undo alike, one system rather than two. A native `disabled` button takes no focus and shows
 * its tooltip to the mouse only, so the reason it gives would be out of reach of the keyboard (the gap
 * `known-issues.md` records for the trash, A11Y-001). With `aria-disabled` the button stays in the tab
 * order, is announced as unavailable, and says why; a click on it does nothing and **says so in the
 * console** (`rules/error-handling.md`: no refusal is silent).
 */

/** What a bar button does when it can — or why it cannot. Exactly one of the two, held by the type. */
export type BarButtonAction =
  | {
      /** What it does. */
      onPress: () => void
      /** Its tooltip — the keys that do the same, for instance. */
      hint?: string
      unavailable?: never
    }
  | {
      onPress?: never
      hint?: never
      /** Why it cannot act — a reason, not a sentence: the tooltip reads `<label> — <reason>`. */
      unavailable: string
    }

/** What a bar button shows and does. */
export type BarButtonProps = BarButtonAction & {
  /** Its name — the visible label, or the accessible one when it shows a glyph. */
  label: string
  /** A glyph in place of the label. */
  icon?: ReactNode
  /** The look: a text button, a square glyph button, or the bar's one filled button. */
  variant?: 'text' | 'icon' | 'primary'
}

/**
 * Render a bar button.
 * @param props - its label, what it does, and why it cannot when it cannot
 * @param props.label - its name
 * @param props.onPress - what it does; omitted, it is unavailable
 * @param props.unavailable - why it cannot act
 * @param props.hint - its tooltip when it can act
 * @param props.icon - a glyph in place of the label
 * @param props.variant - its look
 * @returns the button
 */
export function BarButton({
  label,
  onPress,
  unavailable,
  hint,
  icon,
  variant = 'text',
}: BarButtonProps) {
  // Derived
  const available = onPress !== undefined

  // Handlers
  const handleClick = () => {
    if (onPress === undefined) {
      console.warn(`[Cartographer] ${label} refused: ${unavailable}.`)
      return
    }
    onPress()
  }

  // Render
  return (
    <button
      type="button"
      className={`bar-button bar-button--${variant}`}
      aria-disabled={available ? undefined : 'true'}
      aria-label={icon === undefined ? undefined : label}
      title={available ? hint : `${label} — ${unavailable}`}
      onClick={handleClick}
    >
      {icon ?? label}
    </button>
  )
}
