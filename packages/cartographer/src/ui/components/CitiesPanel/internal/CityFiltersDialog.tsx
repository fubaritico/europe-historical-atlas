import { Button } from '@fubaritico/react/Button'
import { Card } from '@fubaritico/react/Card'
import { Modal } from '@fubaritico/react/Modal'
import { useState } from 'react'

import { useTranslation } from '../../../hooks/useTranslation'
import { ListFilter } from '../../ListFilter'
import { CITIES_PANEL_MESSAGES } from '../i18n'

import { MapHolders } from './MapHolders'
import { OffMapHolders } from './OffMapHolders'

import type { CityFiltersProps } from '../cityFiltersProps'

/** What the dialogue needs: the filters, and whether it is open. */
export interface CityFiltersDialogProps extends CityFiltersProps {
  /** Whether it is open — the funnel opens it. */
  open: boolean
  /** « Fermer », ‹esc› or a click outside. */
  onClose: () => void
}

/**
 * « Filtres avancés » (CARTO-370, `s20`): the polities of the map, then the holders no polity of the map carries and
 * « Sans détenteur ». **A box applies at once**: the list behind follows, there is no OK. A filter field heads it, as
 * the panels' (the dev, 2026-11-07: *« il nous faut le quick filter pour les listes longues »*): it narrows both
 * sections; what is typed is the dialogue's own, emptied when it closes.
 * @param props - the choices, the holders ticked, the callbacks, and whether it is open
 * @param props.open - whether it is open
 * @param props.onClose - closes it
 * @param props.onUntickAll - « Tout décocher »; the rest goes to the two sections
 * @returns the dialogue
 */
export function CityFiltersDialog({
  open,
  onClose,
  onUntickAll,
  ...boxes
}: CityFiltersDialogProps) {
  // Context
  const t = useTranslation(CITIES_PANEL_MESSAGES)

  // State
  const [query, setQuery] = useState('')

  // Handlers
  const handleClose = () => {
    setQuery('')
    onClose()
  }

  // Render
  return (
    <Modal isOpen={open} onClose={handleClose} aria-label={t('filters')}>
      <div className="short-dialogue short-dialogue--wide">
        <Card>
          <Card.Header>{t('filters')}</Card.Header>
          <Card.Body>
            <ListFilter value={query} onChange={setQuery} label={t('filterHolders')} />
            <MapHolders {...boxes} query={query} />
            <OffMapHolders {...boxes} query={query} />
          </Card.Body>
          <Card.Footer align="end">
            {/* Never disabled: greyed under the press, it would drop the keyboard's focus (review A11Y-001); with nothing
                ticked it does nothing. */}
            <Button type="button" variant="secondary" onClick={onUntickAll}>
              {t('untickAll')}
            </Button>
            <Button type="button" onClick={handleClose}>
              {t('closeFilters')}
            </Button>
          </Card.Footer>
        </Card>
      </div>
    </Modal>
  )
}
