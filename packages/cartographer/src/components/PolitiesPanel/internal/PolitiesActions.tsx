import { BarIcon } from '../../../icons/barIcons'

/**
 * `{Polities}`' action bar — a strip at the foot of the panel holding its commands (`s07`, *The panel's
 * action bar*). The dev's request, 2026-10-12: *"pouvoir ajouter ou supprimer une polity à partir d'une
 * petite barre localisée en bas du panneau […] et toutes manipulations ultérieures"* — so every later panel
 * command lands here too (D4).
 *
 * **A view and nothing else**: it shows two buttons and says when they are pressed. Whom to delete, whether
 * to ask first, what to report — all of that is its caller's (`PolitiesPanel`). Mounted alone in the
 * workbench with two callbacks.
 *
 * Plain buttons in the design's 26 × 24 `icon-btn` boxes, placed on whole pixels so the dev's glyphs stay
 * sharp (`icons/barIcons.tsx`). The design system's `IconButton` takes only its own icon set, which holds
 * neither glyph; the class names keep the button replaceable the day it does.
 */

/** What the bar needs. */
export interface PolitiesActionsProps {
  /** Open the new-polity dialogue. */
  onNew: () => void
  /** Ask to delete the selected polity. */
  onDelete: () => void
  /**
   * Whether there is a polity to delete — the one selected (D3). Without it the trash is disabled, and
   * says why in its title.
   */
  canDelete: boolean
}

/**
 * Render the bar.
 * @param props - the two commands and whether deleting is possible
 * @param props.onNew - opens the new-polity dialogue, called by `[+]`
 * @param props.onDelete - asks to delete the selected polity, called by the trash
 * @param props.canDelete - whether a polity is selected to delete; the trash is disabled without one
 * @returns the bar
 */
export function PolitiesActions({ onNew, onDelete, canDelete }: PolitiesActionsProps) {
  // Render
  return (
    <div className="polities__actions" role="toolbar" aria-label="Polity actions">
      <button
        type="button"
        className="polities__action"
        aria-label="New polity"
        title="New polity"
        onClick={onNew}
      >
        <BarIcon name="plus" />
      </button>
      <button
        type="button"
        className="polities__action"
        aria-label="Delete polity"
        title={canDelete ? 'Delete polity' : 'Select a polity to delete'}
        disabled={!canDelete}
        onClick={onDelete}
      >
        <BarIcon name="trash" />
      </button>
    </div>
  )
}
