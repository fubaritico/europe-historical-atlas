import { PatternButton } from './PatternButton'
import { ScopeButton } from './ScopeButton'

import type { LineScope } from '../lineScope'

/** The patterns offered, in the order of the row; `null` is *Auto*, the relation's rule. */
const PATTERNS: readonly { hand: string | null; label: string }[] = [
  { hand: null, label: 'Auto' },
  { hand: 'solid', label: 'Solid' },
  { hand: 'dotted', label: 'Dotted' },
  { hand: 'dashed', label: 'Dashed' },
  { hand: 'double', label: 'Double' },
  { hand: 'none', label: 'Hidden' },
]

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
 * @param props.segments - how many segments are selected; none shows the hint instead of the choices
 * @param props.between - whom the stretch separates, already named
 * @param props.canDressBorder - whether the whole border is on offer as a scope
 * @param props.hand - the hand in force for the chosen scope, `null` for the relation's rule
 * @param props.mixed - whether the stretch carries different hands, so no pattern reads as chosen
 * @param props.scope - the scope chosen: the stretch or the whole border
 * @param props.onScope - changes the scope
 * @param props.onHand - applies a pattern, `null` for *Auto*
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
      <p className="panel__hint">
        Select a stretch of the aimed polity with the white arrow to style it.
      </p>
    )
  return (
    <>
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
    </>
  )
}
