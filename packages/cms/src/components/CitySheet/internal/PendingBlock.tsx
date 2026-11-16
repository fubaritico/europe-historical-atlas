import { useLineFocus } from '../hooks/useLineFocus'

import { AddLinkButton } from './AddLinkButton'
import { PendingLines } from './PendingLines'
import { SovereignBox } from './SovereignBox'

import type { PendingLinks } from '../hooks/usePendingLinks'
import type { SaveSovereign } from '../utils/saveSovereign'
import type { Say } from '../utils/say'
import type { RecordChoice } from '../utils/sheetValues'

/**
 * The repeating block at the top of the chain (the dev, 2026-11-16): « Souverain » under the last block only — the
 * title the chain stops at, or the suzerain of the last line — and « Vassal de ⊕ » until that last block is ticked
 * sovereign. ⊕ adds a line as soon as the one below has its suzerain, and the keyboard lands on it.
 * @param props - the lines, the title the chain stops at, whether it is sovereign, the box's save, the translator
 * @param props.pending - the lines being entered and their gestures
 * @param props.top - the title the chain read stops at
 * @param props.topSovereign - whether the chain ends there on a sovereign
 * @param props.saveSovereign - ticks or unticks « souverain » on a title
 * @param props.onReread - reads the chain again
 * @param props.say - the translator
 * @returns the block
 */
export function PendingBlock({
  pending,
  top,
  topSovereign,
  saveSovereign,
  onReread,
  say,
}: {
  pending: PendingLinks
  top: RecordChoice
  topSovereign: boolean
  saveSovereign: SaveSovereign
  onReread: () => void
  say: Say
}) {
  const { lines } = pending
  const last = lines.at(-1)
  const canAdd = last === undefined ? !topSovereign : last.suzerain !== null && !last.sovereign
  const box = useLineFocus(lines.length)

  // Render
  return (
    <div ref={box} className="city-sheet__chain-block">
      {last === undefined && (
        <SovereignBox
          title={top.id}
          checked={topSovereign}
          save={saveSovereign}
          onSaved={onReread}
          say={say}
        />
      )}
      <PendingLines pending={pending} topName={top.name} saveSovereign={saveSovereign} say={say} />
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
