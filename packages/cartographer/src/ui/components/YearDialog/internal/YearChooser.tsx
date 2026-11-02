import { Button } from '@fubaritico/react/Button'
import { Card } from '@fubaritico/react/Card'
import { useEffect, useState } from 'react'

import { autofocusOnOpen } from '../../../hooks/autofocusOnOpen'
import { useTranslation } from '../../../hooks/useTranslation'
import { ACTION_MESSAGES } from '../../../i18n/actions'
import { YEAR_DIALOG_MESSAGES } from '../i18n'

import { YearList } from './YearList'

import type { YearListing } from './YearList'

/** What the dialogue's content needs. */
export interface YearChooserProps {
  /** Where the years saved are read from — the manifest, `years/index.json`. */
  source: { listedYears: () => Promise<readonly number[]> }
  /** The year open. */
  year: number
  /**
   * Open the year chosen — keep the page first, then reload on it (`persistence/yearChange.ts`).
   * @param year - the year chosen
   */
  onOpen: (year: number) => void
  /** Close the dialogue. */
  close: () => void
}

/**
 * The dialogue's content, mounted for one opening: it reads the years, offers each but the open one, and opens.
 * @param props - the source, the year open, what opening and closing do
 * @param props.source - where the years are read from
 * @param props.year - the year open
 * @param props.onOpen - open the year chosen
 * @param props.close - close the dialogue
 * @returns the card
 */
export function YearChooser({ source, year, onOpen, close }: YearChooserProps) {
  // Context
  const t = useTranslation(YEAR_DIALOG_MESSAGES)
  const action = useTranslation(ACTION_MESSAGES)

  // State
  const [listing, setListing] = useState<YearListing>({ state: 'reading' })

  // Handlers
  const choose = (chosen: number): void => {
    close()
    onOpen(chosen)
  }

  // Effects
  useEffect(() => {
    let current = true
    source.listedYears().then(
      (years) => {
        if (current) setListing({ state: 'read', years })
      },
      (error: unknown) => {
        console.error('[Cartographer] the years saved could not be listed', error)
        if (current) setListing({ state: 'failed' })
      }
    )
    return () => {
      current = false
    }
  }, [source])

  // Render
  return (
    <Card>
      <Card.Header>{t('title')}</Card.Header>
      <Card.Body>
        <p className="short-dialogue__text">{t('warning')}</p>
        <YearList listing={listing} year={year} choose={choose} />
      </Card.Body>
      <Card.Footer align="end">
        <Button ref={autofocusOnOpen} type="button" variant="secondary" onClick={close}>
          {action('cancel')}
        </Button>
      </Card.Footer>
    </Card>
  )
}
