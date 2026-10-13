import { useState } from 'react'

import { describeDrawingTarget } from '../state/drawingTarget'

import { readLineSelection } from './lineSelection'

import type { CartographerStoreHook } from '../state/store'

/**
 * `{Line}` — the style of the selected stretch (`s13`, *give a line a pattern*; the dev, 2026-09-27: *"tu
 * sélectionnes un trait, tu lui donnes un style, comme dans Illustrator"*).
 *
 * The white arrow's marquee selects anchors of the aimed polity; the segments between consecutive selected
 * anchors are the stretch. A pattern dresses **this stretch** (a run override) or, when the stretch runs
 * against one neighbour only, **the whole border** with it (a pair override). *Auto* gives it back to the
 * rule. Each choice is one undoable step.
 */

/** The patterns offered, in the order of the row; `null` is *Auto*, the relation's rule. */
const PATTERNS: readonly { hand: string | null; label: string }[] = [
  { hand: null, label: 'Auto' },
  { hand: 'solid', label: 'Solid' },
  { hand: 'dotted', label: 'Dotted' },
  { hand: 'dashed', label: 'Dashed' },
  { hand: 'double', label: 'Double' },
  { hand: 'none', label: 'Hidden' },
]

/** Where a choice applies. */
export type LineScope = 'stretch' | 'border'

/** What the panel shows and reports. */
export interface LineViewProps {
  /** How many segments are selected — none shows the hint. */
  segments: number
  /** Whom the stretch separates, already named — *"Royaume de France – Royaume de Bourgogne"*. */
  between: string
  /** Whether the whole border is on offer: the stretch runs against one neighbour only. */
  canDressBorder: boolean
  /** The current hand of the scope chosen, `null` for the rule. */
  hand: string | null
  /** Whether the stretch carries different hands — no pattern then reads as chosen. */
  mixed: boolean
  /** The scope chosen. */
  scope: LineScope
  /** The scope was changed. */
  onScope: (scope: LineScope) => void
  /** A pattern was chosen — `null` for *Auto*. */
  onHand: (hand: string | null) => void
}

/**
 * The panel's view.
 * @param props - the selection read, the scope and the two callbacks
 * @returns the panel's body
 */
export function LineView({
  segments,
  between,
  canDressBorder,
  hand,
  mixed,
  scope,
  onScope,
  onHand,
}: LineViewProps) {
  // Render
  if (segments === 0)
    return (
      <p className="line-panel__hint">
        Select a stretch of the aimed polity with the white arrow to style it.
      </p>
    )
  return (
    <div className="line-panel__body">
      <p className="line-panel__what">
        {segments} {segments === 1 ? 'segment' : 'segments'} · {between}
      </p>
      <div className="line-panel__scope" role="radiogroup" aria-label="Apply to">
        {(['stretch', 'border'] as const).map((value) => (
          <ScopeButton
            key={value}
            value={value}
            scope={scope}
            canDressBorder={canDressBorder}
            onScope={onScope}
          />
        ))}
      </div>
      <div className="line-panel__patterns" role="group" aria-label="Pattern">
        {PATTERNS.map((pattern) => (
          <PatternButton
            key={pattern.label}
            pattern={pattern}
            chosen={!mixed && hand === pattern.hand}
            onHand={onHand}
          />
        ))}
      </div>
    </div>
  )
}

/**
 * One scope choice.
 * @param props - the value, the scope chosen, whether the border is on offer, and the callback
 * @param props.value - this choice
 * @param props.scope - the scope chosen
 * @param props.canDressBorder - whether the whole border is on offer
 * @param props.onScope - the scope was changed
 * @returns the radio
 */
function ScopeButton({
  value,
  scope,
  canDressBorder,
  onScope,
}: {
  value: LineScope
  scope: LineScope
  canDressBorder: boolean
  onScope: (scope: LineScope) => void
}) {
  // Derived
  const unavailable = value === 'border' && !canDressBorder

  // Handlers
  const handleClick = () => {
    if (unavailable) {
      console.warn(
        '[Cartographer] whole border refused: the stretch runs against more than one neighbour, or none.'
      )
      return
    }
    onScope(value)
  }

  // Render
  return (
    <button
      type="button"
      role="radio"
      className="line-panel__choice"
      aria-checked={scope === value}
      aria-disabled={unavailable ? 'true' : undefined}
      title={unavailable ? 'The stretch runs against more than one neighbour, or none' : undefined}
      onClick={handleClick}
    >
      {value === 'stretch' ? 'This stretch' : 'Whole border'}
    </button>
  )
}

/**
 * One pattern choice.
 * @param props - the pattern, whether it is the one in force, and the callback
 * @param props.pattern - this pattern
 * @param props.chosen - whether it is the hand in force
 * @param props.onHand - a pattern was chosen
 * @returns the button
 */
function PatternButton({
  pattern,
  chosen,
  onHand,
}: {
  pattern: { hand: string | null; label: string }
  chosen: boolean
  onHand: (hand: string | null) => void
}) {
  // Handlers
  const handleClick = () => {
    onHand(pattern.hand)
  }

  // Render
  return (
    <button
      type="button"
      className="line-panel__choice"
      aria-pressed={chosen}
      onClick={handleClick}
    >
      {pattern.label}
    </button>
  )
}

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
    const label = `${hand ?? 'auto'} ${between}`
    if (effectiveScope === 'border' && aimed !== null && selection.neighbour !== null)
      dressPair([aimed.id, selection.neighbour], hand, { kind: 'dress-pair', label })
    else dressSegments(selection.segments, hand, { kind: 'dress-run', label })
  }

  // Render
  return (
    <section className="line-panel" aria-label="Line">
      <header className="polities__head">
        <h2 className="polities__title">Line</h2>
      </header>
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
    </section>
  )
}
