import { IconButton } from '@fubaritico/react/IconButton'

import type { Say } from '../utils/say'

/**
 * « Vassal de ⊕ » (the dev's mock-up, CMS-422): adds a line to the block, for the suzerain of the title named.
 * @param props - the title named, the gesture, the translator
 * @param props.name - the title whose suzerain the new line enters
 * @param props.onAdd - adds the line
 * @param props.say - the translator
 * @returns the button and its label
 */
export function AddLinkButton({ name, onAdd, say }: { name: string; onAdd: () => void; say: Say }) {
  return (
    <div className="city-sheet__chain-add">
      <span className="city-sheet__label">{say('vassalOf')}</span>
      <IconButton
        type="button"
        size="sm"
        icon="Plus"
        aria-label={say('addSuzerainOf', { name })}
        onClick={onAdd}
      />
    </div>
  )
}
