/** A link of vassalage entered from the city sheet: the title that answers to another, at the sheet's year. */
export interface NewVassalLink {
  /** The title at the top of the chain read, the vassal. */
  readonly vassal: number | string
  /** The title it answers to, chosen on the line. */
  readonly suzerain: number | string
  /** The source that says it, when one is chosen — facultative (the dev, 2026-11-16). */
  readonly source: number | string | null
  /** The sheet's year: the link holds from it. */
  readonly year: number
}

/** What the server answered. */
export type LinkAnswer =
  /** Saved. */
  | { kind: 'saved' }
  /** Refused by a rule of the server — a link entered twice, a title answering to itself — with its sentence. */
  | { kind: 'refused'; message: string }

/** Payload's answer to a refused write. */
interface PayloadErrors {
  /** The errors, the first carrying the sentence to show. */
  errors?: { message?: string; data?: { errors?: { message?: string }[] } }[]
}

/**
 * Saves a link of vassalage (CMS-422, the dev's mock-up: « Vassal de ⊕ »), through Payload's API so every rule of the
 * collection « Maillons » holds — a duplicate refused, a source required. The link is entered once and serves every
 * city under that title (`files/plans/contribution/vassal-chain.md`, rule 2).
 * @param fetcher - the `fetch` to use
 * @param api - the API's root: `/api`
 * @param link - the vassal, its suzerain, the source and the year
 * @returns saved, or refused with the server's sentence
 * @throws {TypeError} when the server cannot be reached
 * @throws {Error} when the server fails, or refuses without a sentence
 */
export async function saveVassalLink(
  fetcher: typeof fetch,
  api: string,
  link: NewVassalLink
): Promise<LinkAnswer> {
  const url = `${api}/vassal-links`
  const response = await fetcher(url, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      vassal: link.vassal,
      answersTo: 'suzerain',
      suzerain: link.suzerain,
      date: { start: { year: link.year } },
      lines: link.source === null ? [] : [{ source: link.source }],
    }),
  })
  if (response.ok) return { kind: 'saved' }
  if (response.status >= 500) {
    throw new Error(`[CMS] the API failed to save a link of vassalage (${String(response.status)})`)
  }
  return { kind: 'refused', message: await refusalOf(response, 'a link of vassalage') }
}

/**
 * The sentence of a refusal: the field's own when the refusal names a field, else the refusal's.
 * @param response - the server's refusal
 * @param what - what was refused, for the console: `a link of vassalage`
 * @returns the sentence
 * @throws {Error} when the refusal carries none — a body that is not Payload's, JSON or not
 */
export async function refusalOf(response: Response, what: string): Promise<string> {
  // A body that is not JSON has no sentence either: the throw below says so, with the status
  const answer = (await response.json().catch(() => ({}))) as PayloadErrors
  const first = answer.errors?.[0]
  const message = first?.data?.errors?.[0]?.message ?? first?.message
  if (message === undefined) {
    throw new Error(`[CMS] the API refused ${what} without a message (${String(response.status)})`)
  }
  return message
}
