import { useState } from 'react'

import { describeDrawingTarget } from '../../../state/drawingTarget'
import { useTranslation } from '../../hooks/useTranslation'
import { BORDER_MESSAGES } from '../../i18n/border'
import { Panel } from '../Panel'

import { LINE_PANEL_MESSAGES } from './i18n'
import { LineView } from './internal/LineView'
import { readLineSelection } from './utils/lineSelection'

import type { LineScope } from './lineScope'
import type { CartographerStoreHook } from '../../../state/store'

/**
 * `{Line}` — the style of the selected stretch (`s13`, *give a line a pattern*; the dev, 2026-09-27: *"tu
 * sélectionnes un trait, tu lui donnes un style, comme dans Illustrator"*).
 *
 * The white arrow's marquee selects anchors of the aimed polity; the segments between consecutive selected
 * anchors are the stretch. A pattern dresses **this stretch** (a run override) or, when the stretch runs
 * against one neighbour only, **the whole border** with it (a pair override). *Auto* gives it back to the
 * rule. Each choice is one undoable step.
 */

/**
 * `{Line}`, bound to the store.
 * @param props - the store
 * @param props.store - the store
 * @returns the panel
 */
export function LinePanel({ store }: { store: CartographerStoreHook }) {
  // Store
  const selected = store((state) => state.selectedAnchors)
  store((state) => state.target)
  store((state) => state.version)

  // Store actions
  const dressSegments = store((state) => state.dressSegments)
  const dressPair = store((state) => state.dressPair)

  // Context
  const t = useTranslation(LINE_PANEL_MESSAGES)
  const border = useTranslation(BORDER_MESSAGES)

  // State
  const [scope, setScope] = useState<LineScope>('stretch')

  // Derived
  const { document, target } = store.getState()
  const aimed = describeDrawingTarget(document, target)
  const selection = readLineSelection(document, aimed?.id ?? null, selected)
  const between = [aimed?.id, selection.neighbour]
    .filter((id): id is string => id !== undefined && id !== null)
    .map((id) => document.polities.find((polity) => polity.id === id)?.name ?? id)
    .join(' – ')
  const effectiveScope = selection.neighbour === null ? 'stretch' : scope
  const pairHand =
    document.pairs.find(
      (pair) =>
        pair.between.includes(aimed?.id ?? '') && pair.between.includes(selection.neighbour ?? '')
    )?.hand ?? null

  // Handlers
  const handleHand = (hand: string | null) => {
    const label = border('dressStep', {
      hand: border('handName', { hand: hand ?? 'auto' }),
      between,
    })
    if (effectiveScope === 'border' && aimed !== null && selection.neighbour !== null)
      dressPair([aimed.id, selection.neighbour], hand, { kind: 'dress-pair', label })
    else dressSegments(selection.segments, hand, { kind: 'dress-run', label })
  }

  // Render
  return (
    <Panel title={t('title')} zone="line-panel">
      <LineView
        segments={selection.segments.length}
        between={between}
        canDressBorder={selection.neighbour !== null}
        hand={effectiveScope === 'border' ? pairHand : selection.hand}
        mixed={effectiveScope === 'stretch' && selection.mixed}
        scope={effectiveScope}
        onScope={setScope}
        onHand={handleHand}
      />
    </Panel>
  )
}
