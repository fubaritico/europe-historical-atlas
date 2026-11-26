import type { TerritoryAdded } from '../../../../persistence/cmsTerritory'
import type { PolityFormField } from '../../PolityForm'

/** What an answer of « Ajouter au CMS » acts on — the hook's refs, state and callbacks, handed as a literal in a test. */
export interface AdditionSink {
  /** @returns whether the dialogue is still open */
  open: () => boolean
  /** @returns the Wikidata item the form offers now, or `null` when it offers none */
  offeredNow: () => string | null
  /** Says that the CMS refused the session: the session's dialogue opens. */
  sessionLost: () => void
  /** Says that the CMS does not answer: the alarm dialogue opens (CARTO-498: « une fenêtre »). */
  cmsOffline: () => void
  /**
   * Writes a field of the form.
   * @param field - the field
   * @param value - its value
   */
  onField: (field: PolityFormField, value: string | null) => void
  /**
   * Says whether a creation is on its way.
   * @param sending - `true` while it is
   */
  setSending: (sending: boolean) => void
  /**
   * Shows how the creation ended.
   * @param outcome - how it ended
   */
  setOutcome: (outcome: TerritoryAdded) => void
}

/**
 * Act on the dev server's answer to « Ajouter au CMS » (CARTO-498). A session the CMS refused opens the session's
 * dialogue, and a CMS that does not answer the alarm dialogue, even when the polity's dialogue was closed meanwhile —
 * both are the whole editor's. The territory is
 * written on the polity only while the form still names the item sent (review QUAL-001): an answer for another item
 * ties nothing, said on the console, and the line under the button still says what the CMS did.
 * @param result - how the creation ended
 * @param sent - the Wikidata item sent
 * @param sink - what the answer acts on
 */
export function settleAddition(result: TerritoryAdded, sent: string, sink: AdditionSink): void {
  if (result.kind === 'signedOut') sink.sessionLost()
  if (result.kind === 'offline') sink.cmsOffline()
  if (!sink.open()) return
  sink.setSending(false)
  sink.setOutcome(result)
  if (result.kind !== 'linked') {
    console.warn(`[Cartographer] « Ajouter au CMS » wrote nothing: ${result.kind}`)
    return
  }
  if (sink.offeredNow() === sent) {
    sink.onField('territory', String(result.id))
    return
  }
  console.warn(
    `[Cartographer] « Ajouter au CMS »: the territory ${String(result.id)} is ${sent}'s, and the form names another item now — not tied`
  )
}

/**
 * Act on a failure of the dev server itself (the network, a throw): a defect, said loudly, and the same refusal on
 * screen as the CMS's (`rules/error-handling.md`).
 * @param error - what failed
 * @param sink - what the answer acts on
 */
export function failAddition(error: unknown, sink: AdditionSink): void {
  console.error('[Cartographer] « Ajouter au CMS » failed', error)
  if (!sink.open()) return
  sink.setSending(false)
  sink.setOutcome({
    kind: 'refused',
    reason: error instanceof Error ? error.message : String(error),
  })
}
