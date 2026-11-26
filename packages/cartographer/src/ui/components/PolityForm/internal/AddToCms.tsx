import { useTranslation } from '../../../hooks/useTranslation'
import { POLITY_FORM_MESSAGES } from '../i18n'
import { cmsSentence } from '../utils/cmsSentence'

import type { AddToCmsProps } from '../polityFieldsProps'

/**
 * « Ajouter au CMS » under « Territoire du CMS » (CARTO-498, the flow offline): the button when the polity can be
 * added, the link to its territory's page once it is tied, why not yet otherwise, and how the last creation ended.
 * The view of the shell/view/binding split — literals in, a click out; `useAddToCms` sends.
 * @param props - the offer, where the sending is, the last outcome, the CMS's pages and the click
 * @param props.offer - the page to complete, the territory ready to add, or why not yet
 * @param props.sending - whether a creation is on its way
 * @param props.outcome - how the last creation ended, or `null`
 * @param props.pageOf - the address of a territory's page in the CMS
 * @param props.onAdd - the click on « Ajouter au CMS »
 * @returns the line under the field
 */
export function AddToCms({ offer, sending, outcome, pageOf, onAdd }: AddToCmsProps) {
  // Context
  const t = useTranslation(POLITY_FORM_MESSAGES)

  // Derived
  const said = outcome === null ? null : cmsSentence(outcome, t)

  // Render
  return (
    <div className="wikidata-panel">
      {offer.kind === 'linked' && (
        <a href={pageOf(offer.id)} target="_blank" rel="noopener noreferrer">
          {t('cmsPage')}
        </a>
      )}
      {offer.kind === 'ready' && (
        <button type="button" className="ui-button" disabled={sending} onClick={onAdd}>
          {sending ? t('addingToCms') : t('addToCms')}
        </button>
      )}
      {offer.kind === 'blocked' && (
        <p className="wikidata-panel__note">{t('cmsBlock', { reason: offer.reason })}</p>
      )}
      {said !== null && (
        <p
          role={said.alarm ? 'alert' : 'status'}
          className={said.alarm ? 'wikidata-panel__warning' : 'wikidata-panel__note'}
        >
          {said.text}
        </p>
      )}
    </div>
  )
}
