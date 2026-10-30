import type { SheetBody } from './sheetValues'

/** A field's refusal as the server words it, at its path in the document. */
export interface ServerFieldError {
  /** Where, dot-separated: `date.start.year`. */
  path: string
  /** The sentence, already in the admin's language. */
  message: string
}

/** What a save came to. */
export type SaveAnswer =
  /** Saved: the sheet's id, new or the same. */
  | { kind: 'saved'; id: number | string }
  /** Refused by the server — a rule, or a sheet saved meanwhile in another tab — with its sentence and its fields. */
  | { kind: 'refused'; message: string; fields: ServerFieldError[] }

/** Where the sheet goes. */
export interface SaveTarget {
  /** The API's root: `/api`. */
  api: string
  /** The sheet's id when it exists; absent for a new one. */
  id?: number | string
}

/** Payload's error answer, as `formatErrors` writes it (`payload/dist/utilities/formatErrors.js`). */
interface PayloadErrors {
  errors?: { message?: string; data?: { errors?: ServerFieldError[] } }[]
}

/**
 * Save a sheet through Payload's REST API, with the admin's own session cookie — so whatever the API checks (the
 * fields, the overlap, the access) holds here exactly as everywhere.
 * @param fetcher - the `fetch` to use; the page's own in the admin, a stand-in in the tests
 * @param target - the API's root and the sheet's id
 * @param body - the sheet
 * @returns saved with its id, or refused with the server's sentence
 * @throws {TypeError} when the server cannot be reached — `fetch`'s own, for the form to say and keep what was typed
 * @throws {Error} when the server answers something that is not Payload's — not JSON, or JSON with no message or id: a
 *   defect, said rather than guessed at
 */
export async function saveSheet(
  fetcher: typeof fetch,
  target: SaveTarget,
  body: SheetBody
): Promise<SaveAnswer> {
  const url =
    target.id === undefined
      ? `${target.api}/place-periods`
      : `${target.api}/place-periods/${String(target.id)}`
  const response = await fetcher(url, {
    method: target.id === undefined ? 'POST' : 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const answer = (await readJson(response, url)) as {
    doc?: { id?: number | string }
  } & PayloadErrors
  if (response.ok) {
    const id = answer.doc?.id
    if (id === undefined)
      throw new Error(`[CMS] the API saved a city sheet without giving its id (${url})`)
    return { kind: 'saved', id }
  }
  return refusal(answer, response.status)
}

/**
 * A refusal of the API, read.
 * @param answer - Payload's error answer
 * @param status - the HTTP status, for the log
 * @returns the refusal, its sentence and its fields
 * @throws {Error} when the answer carries no message — not Payload's, said rather than guessed at
 */
function refusal(answer: PayloadErrors, status: number): SaveAnswer {
  const first = answer.errors?.[0]
  if (first?.message === undefined) {
    throw new Error(`[CMS] the API refused a city sheet without a message (${String(status)})`)
  }
  return { kind: 'refused', message: first.message, fields: first.data?.errors ?? [] }
}

/**
 * An answer's JSON — a page of HTML from a crashed server is not a silence, and is said as what it is.
 * @param response - the answer
 * @param url - where it came from, for the log
 * @returns the parsed body
 * @throws {Error} when the body is not JSON
 */
async function readJson(response: Response, url: string): Promise<unknown> {
  try {
    return await response.json()
  } catch (error) {
    throw new Error(`[CMS] the API answered ${String(response.status)} without JSON (${url})`, {
      cause: error,
    })
  }
}
