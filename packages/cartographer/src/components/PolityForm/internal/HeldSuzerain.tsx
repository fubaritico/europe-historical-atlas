import { IconButton } from '@fubaritico/react/IconButton'

/**
 * The suzerain held now — its name, or *none* — and the cross that removes it.
 * @param props - the name held and what removing does
 * @param props.held - the suzerain's name, or `null` when there is none
 * @param props.onRemove - remove the suzerain
 * @returns the line
 */
export function HeldSuzerain({ held, onRemove }: { held: string | null; onRemove: () => void }) {
  // Render
  return (
    <p className="suzerain-field__held">
      {/* Announced when the choice changes (A11Y-010); the cross stays out of the announcement. */}
      <span role="status">{held ?? 'none'}</span>
      {held !== null && (
        <IconButton
          type="button"
          icon="XMark"
          aria-label={`Remove the suzerain ${held}`}
          onClick={onRemove}
        />
      )}
    </p>
  )
}
