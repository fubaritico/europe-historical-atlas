/** A hierarchical link entered from the city sheet: the title that answers to another, at the sheet's year. */
export interface NewHierarchyLink {
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
 * Saves a hierarchical link (CMS-422, the dev's mock-up: « Vassal de ⊕ »), through Payload's API so every rule of the
 * collection « Maillons » holds — a duplicate refused, a source required. The link is entered once and serves every
 * city under that title (`files/plans/contribution/vassal-chain.md`, rule 2).
 * @param fetcher - the `fetch` to use
 * @param api - the API's root: `/api`
 * @param link - the vassal, its suzerain, the source and the year
 * @returns saved, or refused with the server's sentence
 * @throws {TypeError} when the server cannot be reached
 * @throws {Error} when the server fails, or refuses without a sentence
 */
export async function saveHierarchyLink(
  fetcher: typeof fetch,
  api: string,
  link: NewHierarchyLink
): Promise<LinkAnswer> {
  const url = `${api}/hierarchy-links`
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
    throw new Error(`[CMS] the API failed to save a hierarchical link (${String(response.status)})`)
  }
  return { kind: 'refused', message: await refusalOf(response, 'a hierarchical link') }
}

/**
 * The sentence of a refusal: the field's own when the refusal names a field, else the refusal's.
 * @param response - the server's refusal
 * @param what - what was refused, for the console: `a hierarchical link`
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

/** A hierarchical link changed from the city sheet: its suzerain, and its source. */
export interface ChangedHierarchyLink {
  /** The link's id. */
  readonly link: string
  /** Its suzerain now. */
  readonly suzerain: number | string
  /** Its source now — facultative —, `null` for none. */
  readonly source: number | string | null
  /** Whether the source changed on the sheet — else its lines are not touched. */
  readonly sourceChanged: boolean
}

/** A link's line of source as Payload holds it: its source, and what the historian wrote on it. */
type StoredLine = Record<string, unknown>

/**
 * Changes a hierarchical link from the city sheet (the dev, 2026-11-16: the chain is edited in the same blocks it was
 * entered in) — its suzerain, and its source. **The lines of source are never rewritten from the sheet's copy**, which
 * holds the first source only (review ARCH-001 of 2026-11-16: a changed suzerain once wiped the other lines and their
 * quotations): untouched when the source did not change; when it did, the link's lines are read again and only the
 * first is replaced — or removed, the source emptied —, the others kept whole. Through Payload's API, its rules
 * holding.
 * @param fetcher - the `fetch` to use
 * @param api - the API's root: `/api`
 * @param change - the link, its suzerain and its source
 * @returns saved, or refused with the server's sentence
 * @throws {TypeError} when the server cannot be reached
 * @throws {Error} when the server fails, or refuses without a sentence
 */
export async function updateHierarchyLink(
  fetcher: typeof fetch,
  api: string,
  change: ChangedHierarchyLink
): Promise<LinkAnswer> {
  const url = `${api}/hierarchy-links/${encodeURIComponent(change.link)}`
  const lines = change.sourceChanged
    ? withFirstSource(await linesOf(fetcher, url), change.source)
    : null
  const response = await fetcher(url, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(
      lines === null ? { suzerain: change.suzerain } : { suzerain: change.suzerain, lines }
    ),
  })
  if (response.ok) return { kind: 'saved' }
  if (response.status >= 500) {
    throw new Error(
      `[CMS] the API failed to change a hierarchical link (${String(response.status)})`
    )
  }
  return { kind: 'refused', message: await refusalOf(response, 'a change of a hierarchical link') }
}

/**
 * A link's lines of source, as the base holds them.
 * @param fetcher - the `fetch` to use
 * @param url - the link's address in the API
 * @returns its lines
 * @throws {Error} when the link cannot be read
 */
async function linesOf(fetcher: typeof fetch, url: string): Promise<StoredLine[]> {
  const response = await fetcher(`${url}?depth=0`, { credentials: 'include' })
  if (!response.ok) {
    throw new Error(
      `[CMS] the API refused to read a hierarchical link (${String(response.status)})`
    )
  }
  const body = (await response.json()) as { lines?: StoredLine[] | null }
  return body.lines ?? []
}

/**
 * A link's lines with its first source changed: the first line replaced by the new source — its passage and its
 * quotation went with the old one —, or removed when the source is emptied; the other lines kept whole.
 * @param lines - the lines as the base holds them
 * @param source - the new first source, `null` for none
 * @returns the lines to save
 */
export function withFirstSource(
  lines: readonly StoredLine[],
  source: number | string | null
): StoredLine[] {
  const rest = lines.slice(1)
  return source === null ? rest : [{ source }, ...rest]
}

/**
 * Removes a hierarchical link from the city sheet — its ✕, saved at « Enregistrer ».
 * @param fetcher - the `fetch` to use
 * @param api - the API's root: `/api`
 * @param link - the link's id
 * @returns saved, or refused with the server's sentence
 * @throws {TypeError} when the server cannot be reached
 * @throws {Error} when the server fails, or refuses without a sentence
 */
export async function deleteHierarchyLink(
  fetcher: typeof fetch,
  api: string,
  link: string
): Promise<LinkAnswer> {
  const response = await fetcher(`${api}/hierarchy-links/${encodeURIComponent(link)}`, {
    method: 'DELETE',
    credentials: 'include',
  })
  if (response.ok) return { kind: 'saved' }
  if (response.status >= 500) {
    throw new Error(
      `[CMS] the API failed to remove a hierarchical link (${String(response.status)})`
    )
  }
  return {
    kind: 'refused',
    message: await refusalOf(response, 'the removal of a hierarchical link'),
  }
}
