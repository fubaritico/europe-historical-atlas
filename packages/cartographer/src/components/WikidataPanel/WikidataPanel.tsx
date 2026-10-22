import { useTranslation } from '../../hooks/useTranslation'

import { WIKIDATA_PANEL_MESSAGES } from './i18n'
import { FoundFacts } from './internal/FoundFacts'
import { statusOf } from './utils/wikidataStatus'

import type { WikidataView } from '../../utils/wikidataView'
import type { WikidataField } from '../../wikidata/wikidataFacts'

/**
 * What Wikidata says about the polity in the form (CARTO-243): its name, its years, its Wikipedia articles,
 * a warning when the year edited lies outside its dates, whether it calls itself a vassal state (CARTO-248),
 * and one button per field it can fill. The view of
 * the shell/view/binding split — literals in, a click out; the dialogue reads Wikidata and decides nothing
 * here.
 *
 * **It proposes, it never writes**: a field the author left empty shows *[Use]*; a field they filled
 * differently shows *[Replace]*; it changes only on that click.
 *
 * **One live region, always there, holding only the short messages** (review A11Y-010): reading, failed,
 * unknown, not a polity, the anachronism. A region inserted already full is often not announced, and one
 * wrapping links and buttons would re-read them all; so the summary and the buttons sit outside it.
 */

/** What the panel needs. */
export interface WikidataPanelProps {
  /** What to show. */
  view: WikidataView
  /** Take Wikidata's value for a field. */
  onUse: (field: WikidataField, value: string) => void
}

/**
 * Render what Wikidata says, under the form's Wikidata field.
 * @param props - the view and the click
 * @param props.view - what Wikidata says about the id typed, or where its reading got to
 * @param props.onUse - takes Wikidata's value for a field, on the author's click of *[Use]* or *[Replace]*
 * @returns the panel: the live region always, the facts when an item was found
 */
export function WikidataPanel({ view, onUse }: WikidataPanelProps) {
  // Context
  const t = useTranslation(WIKIDATA_PANEL_MESSAGES)

  // Derived
  const status = statusOf(view, t)
  const warns = view.kind === 'unknown' || view.kind === 'found'

  // Render
  return (
    <div className="wikidata-panel">
      <p role="status" className={warns ? 'wikidata-panel__warning' : 'wikidata-panel__note'}>
        {status}
      </p>
      {view.kind === 'found' && <FoundFacts view={view} onUse={onUse} />}
    </div>
  )
}
