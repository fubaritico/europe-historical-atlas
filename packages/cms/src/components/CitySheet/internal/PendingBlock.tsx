import { useLineFocus } from '../hooks/useLineFocus'

import { AddLinkButton } from './AddLinkButton'
import { PendingLines } from './PendingLines'

import type { PendingLinks } from '../hooks/usePendingLinks'
import type { Say } from '../utils/say'
import type { RecordChoice } from '../utils/sheetValues'

/**
 * The repeating block above the holder (the dev, 2026-11-16): « Vassal de ⊕ » lines until the last one's suzerain is
 * ticked « Souverain ». ⊕ adds a line as soon as the one below has its suzerain, and the keyboard lands on it. The
 * holder's own « Souverain » is beside « Tenue par »: ticked, this block is not shown.
 * @param props - the lines, the holder's title, the translator
 * @param props.pending - the lines being entered and their gestures
 * @param props.top - the holder's title, the vassal of the first line
 * @param props.say - the translator
 * @returns the block
 */
export function PendingBlock({
  pending,
  top,
  say,
}: {
  pending: PendingLinks
  top: RecordChoice
  say: Say
}) {
  const { lines } = pending
  const last = lines.at(-1)
  const canAdd = last === undefined || (last.suzerain !== null && !last.sovereign)
  const box = useLineFocus(lines.length, last !== undefined && last.link === undefined)

  // Render
  return (
    <div ref={box} className="city-sheet__chain-block">
      <PendingLines pending={pending} topName={top.name} say={say} />
      {canAdd && (
        <AddLinkButton
          name={last === undefined ? top.name : say('linkAbove')}
          onAdd={pending.add}
          say={say}
        />
      )}
    </div>
  )
}
