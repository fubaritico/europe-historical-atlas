import type { StackingMove } from '@europe-historical-atlas/core/editor/stacking'

/** Illustrator's names for the four Arrange commands — the menu's items, and the history step's name. */
export const STACKING_LABELS: Record<StackingMove, string> = {
  front: 'Bring to Front',
  forward: 'Bring Forward',
  backward: 'Send Backward',
  back: 'Send to Back',
}
