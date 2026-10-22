import { Modal } from '@fubaritico/react/Modal'

import { useTranslation } from '../../../hooks/useTranslation'
import { ACTION_MESSAGES } from '../../../i18n/actions'
import { wikidataViewOf } from '../../../utils/wikidataView'
import { POLITY_FORM_MESSAGES, PolityForm } from '../../PolityForm'
import { usePolityDraft } from '../hooks/usePolityDraft'
import { useWikidataItem } from '../hooks/useWikidataItem'
import { ignoreOverlayClick } from '../utils/ignoreOverlayClick'

import type { CartographerStoreHook } from '../../../state/store'
import type { WikidataField } from '../../../wikidata/wikidataFacts'
import type { WikidataSource } from '../../../wikidata/wikidataSource'
import type { YearPolity } from '@europe-historical-atlas/core/data/yearFormat'

/** What the dialogue needs from its caller. */
export interface PolityDialogProps {
  /** The store the polity is created or changed in, and the Pen aimed through. */
  store: CartographerStoreHook
  /**
   * The polity to change — `s07`'s *[Edit properties…]* — or `null` for `[+ New polity]`. Read when the
   * dialogue mounts: the caller mounts one per polity edited.
   */
  editing: YearPolity | null
  /** Whether the dialogue is shown. The caller owns it — the design system's Modal is controlled. */
  isOpen: boolean
  /** Called once the dialogue is done, validated or cancelled. */
  onClose: () => void
  /** Where Wikidata is read from, for the panel under the Wikidata field (CARTO-243). */
  wikidata: WikidataSource
}

/**
 * The polity's dialogue — `[+ New polity]` (`s02`'s *"create a polity from nothing"*, *"validating the
 * form hands me the Pen"*) and *[Edit properties…]* (`s07`'s *"the same form as creation opens, filled
 * with its current values"*, the id kept). The binding of the shell/view/binding split: the only place
 * that knows there is a store.
 *
 * **A click on the backdrop does not close it**: the design system's own warning — a dialogue holding
 * typed work must not lose it to a stray click. Escape, Cancel and the cross do.
 * @param props - the store, the polity edited if any, the open state the caller owns, and Wikidata
 * @param props.store - the store the polity is created or changed in, and the Pen aimed through
 * @param props.editing - the polity to change, or `null` to create one; read when the dialogue mounts
 * @param props.isOpen - whether the dialogue is shown, owned by the caller
 * @param props.onClose - called once the dialogue is done, validated or cancelled
 * @param props.wikidata - where Wikidata is read from, for the panel under the Wikidata field
 * @returns the dialogue
 */
export function PolityDialog({ store, editing, isOpen, onClose, wikidata }: PolityDialogProps) {
  // Context
  const form = useTranslation(POLITY_FORM_MESSAGES)
  const action = useTranslation(ACTION_MESSAGES)

  // State
  const { draft, errors, suzerains, ranks, close, onField, onColour, onSubmit } = usePolityDraft(
    store,
    editing,
    onClose
  )
  const reading = useWikidataItem(wikidata, draft.wikidata)

  // Derived
  const title = editing === null ? action('newPolity') : form('editTitle')
  const { document } = store.getState()
  const others = document.polities.filter((polity) => polity.id !== editing?.id)
  const wikidataView = wikidataViewOf(reading, draft, document.year, others)

  // Handlers
  // Wikidata only ever writes on the author's click, through the same path as typing.
  const handleUseWikidata = (field: WikidataField, value: string) => {
    onField(field, value)
  }

  // Render
  return (
    <Modal isOpen={isOpen} onClose={close} onOverlayClick={ignoreOverlayClick} aria-label={title}>
      <PolityForm
        title={title}
        draft={draft}
        errors={errors}
        suzerains={suzerains}
        ranks={ranks}
        idLocked={editing !== null}
        onField={onField}
        onColour={onColour}
        onSubmit={onSubmit}
        onCancel={close}
        wikidata={wikidataView}
        onUseWikidata={handleUseWikidata}
      />
    </Modal>
  )
}
