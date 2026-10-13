import { ColorPicker } from '@fubaritico/react/ColorPicker'
import { Popover } from '@fubaritico/react/Popover'
import { useState } from 'react'

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

/** The tooltip and the console's word when nobody is aimed at. */
const NO_TARGET = 'Active polity — none selected: select a polity to set its colour'

/** A click on the empty swatch does nothing, and says so (`rules/error-handling.md`). */
function refuseColour(): void {
  console.warn(`[Cartographer] colour refused: ${NO_TARGET}.`)
}

/** The swatch with nobody aimed at: struck through, and it says why it does nothing. */
function EmptySwatch() {
  // Render
  return (
    <button
      type="button"
      className="tool-rail__swatch"
      aria-label="Active polity — none selected"
      aria-disabled="true"
      title={NO_TARGET}
      data-empty="true"
      onClick={refuseColour}
    />
  )
}

/**
 * The swatch of a polity, and the picker it opens.
 * @param props - the polity, where a chosen colour goes, and whether it starts open
 * @param props.polity - the polity aimed at
 * @param props.onColour - a gesture ended on a colour
 * @param props.defaultOpen - show the picker open from the start
 * @returns the swatch and its picker
 */
function SwatchPicker({
  polity,
  onColour,
  defaultOpen,
}: {
  polity: SwatchPolity
  onColour: ActiveSwatchProps['onColour']
  defaultOpen: boolean
}) {
  // State
  // The picker's value during a gesture: it moves with every sample, and only its end reaches the document.
  const [draft, setDraft] = useState<HsvaColor | null>(polity.picked)

  // Derived
  const name = `Colour of ${polity.name}`

  // Handlers
  const handleOpenChange = (open: boolean) => {
    // Every opening starts from the document's colour, not from where an earlier gesture left the picker.
    if (open) setDraft(polity.picked)
  }

  // Render
  return (
    <Popover label={name} defaultOpen={defaultOpen} onOpenChange={handleOpenChange}>
      <Popover.Trigger
        className="tool-rail__swatch"
        aria-label={name}
        title={`${name} — click to change it`}
        style={{ background: polity.colour }}
      />
      <Popover.Content className="tool-rail__picker">
        <ColorPicker
          value={draft}
          onChange={setDraft}
          onChangeComplete={onColour}
          nullable
          density="compact"
        />
      </Popover.Content>
    </Popover>
  )
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
