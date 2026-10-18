import { EmptySwatch } from './EmptySwatch'
import { SwatchPicker } from './SwatchPicker'

import type { HsvaColor } from '@fubaritico/behaviors'

/**
 * The active polity's swatch, at the foot of the rail — where Illustrator keeps its fill and stroke — and,
 * since 2026-10-13, the quick way to change that colour (the dev's ask): a click opens the picker beside
 * it, without the whole polity form.
 *
 * **One history step per gesture, never one per drag sample.** The picker reports every move (`onChange`)
 * and the end of each gesture (`onChangeComplete`): the moves only redraw the picker, held here; the end is
 * what goes to the document, so ‹ctrl+Z› takes a whole drag back at once. The map repaints on release,
 * not during the drag — a live preview would paint a colour the document does not hold yet.
 *
 * **With nobody aimed at, it refuses as the top bars' buttons do** (`BarButton.tsx`): `aria-disabled`,
 * the reason in its tooltip, a warning on a click. The struck-through look stays.
 *
 * **Active from afar** (`s17`): a colour moves no point on the map, like the `{Polities}` action bar.
 */

/** The polity the swatch shows. */
export interface SwatchPolity {
  /** Its name, verbatim. */
  name: string
  /** The colour it is painted in — the palette's when it has none of its own. */
  colour: string
  /** Its own colour as the picker holds it, or `null` for "automatic". */
  picked: HsvaColor | null
}

/** What the swatch shows and does. */
export interface ActiveSwatchProps {
  /** The polity aimed at, or `null`. */
  polity: SwatchPolity | null
  /** A gesture in the picker ended on this colour, or on "automatic". */
  onColour: (picked: HsvaColor | null) => void
  /**
   * The picker shown open from the start — the workbench's plate and the tests'. Opening on a click is the
   * browser's own `popovertarget`, which jsdom does not implement, so a test cannot click it open.
   */
  defaultOpen?: boolean
}

/**
 * Render the swatch: the polity's, which opens the picker, or the empty one.
 * @param props - the polity aimed at, and where a chosen colour goes
 * @param props.polity - the polity, or `null`
 * @param props.onColour - a gesture ended on a colour
 * @param props.defaultOpen - show the picker open from the start
 * @returns the swatch
 */
export function ActiveSwatch({ polity, onColour, defaultOpen = false }: ActiveSwatchProps) {
  // Render
  if (polity === null) return <EmptySwatch />
  return <SwatchPicker polity={polity} onColour={onColour} defaultOpen={defaultOpen} />
}
