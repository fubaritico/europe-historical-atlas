import { Button } from '@fubaritico/react/Button'
import { Card } from '@fubaritico/react/Card'
import { Modal } from '@fubaritico/react/Modal'

import { useTranslation } from '../../hooks/useTranslation'

import { MAP_CHECK_MESSAGES } from './i18n'
import { CheckStatus } from './internal/CheckStatus'
import { CheckTabs } from './internal/CheckTabs'

import type { MapCheck } from './hooks/useMapCheck'

/** What the dialogue needs. */
export interface MapCheckDialogProps {
  /** The check, `useMapCheck`'s. */
  check: MapCheck
  /**
   * The address of a territory's page in the CMS's admin.
   * @param id - the territory's number
   * @returns the address
   */
  pageOf: (id: number) => string
}

/**
 * [Check this year]'s dialogue (CARTO-568, `s10`): the map against the CMS, in four groups, one tab each — different
 * from the CMS (aligned all at once), to confirm (one at a time), to enter in the CMS, tied to nothing. A row's name opens the
 * polity's form. The view: it takes the check and draws it.
 * @param props - the check and the CMS's pages
 * @param props.check - the check
 * @param props.pageOf - the address of a territory's page
 * @returns the dialogue
 */
export function MapCheckDialog({ check, pageOf }: MapCheckDialogProps) {
  // Context
  const t = useTranslation(MAP_CHECK_MESSAGES)

  // Derived
  const { alignment } = check

  // Render
  return (
    <Modal isOpen={check.phase !== 'closed'} onClose={check.close} aria-label={t('title')}>
      <div className="short-dialogue map-check">
        <Card>
          <Card.Header>{t('title')}</Card.Header>
          <Card.Body>
            <CheckStatus phase={check.phase} alignment={alignment} />
            {alignment !== null && (
              <CheckTabs alignment={alignment} check={check} pageOf={pageOf} />
            )}
          </Card.Body>
          <Card.Footer align="end">
            <Button type="button" onClick={check.close}>
              {t('close')}
            </Button>
          </Card.Footer>
        </Card>
      </div>
    </Modal>
  )
}
