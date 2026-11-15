/**
 * The documents of a list the API answered — the one reading of Payload's `{ docs }` the form's fetches share (the
 * places' and sources' search, a place's sheets, the chain of vassalage), so its answer's shape is checked in one
 * place.
 * @param response - the API's answer
 * @param what - what was asked, as the errors name it: `the search in places`, `the place's sheets`
 * @param refused - how a refusal is said after it: `was refused`, `could not be read`
 * @returns the documents, each still to be read by its caller
 * @throws {Error} when the server refuses, or answers something that is not a list
 */
export async function readDocs(
  response: Response,
  what: string,
  refused: string
): Promise<unknown[]> {
  if (!response.ok) throw new Error(`[CMS] ${what} ${refused} (${String(response.status)})`)
  const answer = (await response.json()) as { docs?: unknown }
  if (!Array.isArray(answer.docs)) throw new Error(`[CMS] ${what} answered no list`)
  return answer.docs as unknown[]
}
