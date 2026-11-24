import { readContent } from './readContent'
import { CONTENT_DIR, folderWriter, writeContent } from './writeContent'

import type { ContentWriter } from './writeContent'
import type { ContentFile } from '@europe-historical-atlas/core/data/contentFormat'
import type { Endpoint, PayloadRequest } from 'payload'

/** What the handler reads of Payload's request — structural, so a test hands it a literal. */
export type ExportRequest = Pick<PayloadRequest, 'user'>

/** The export's two steps, handed in: read the base, write a file. */
export interface ExportSteps {
  /** Read the content out of the base, refusing a wrong record by name (`readContent`). */
  readonly read: () => Promise<ContentFile>
  /** Write one of the two files. */
  readonly write: ContentWriter
}

/** Said to a second click while an export runs — from another tab, or the button of another page. */
const ALREADY_RUNNING =
  'Un export est déjà en cours : attendez son message, puis relancez-le si besoin.'

/** Said when a file cannot be written; the disk's own words, which name its folders, stay in the server's log. */
const NOT_WRITTEN =
  'Les fichiers de l’export n’ont pas pu être écrits dans le dossier de l’atlas : relancez l’export (le détail est dans la console du serveur).'

/**
 * Whether an export runs in this server now — one at a time, so two cannot write their files in turns and leave a
 * pair of two exports (review QUAL-003 of CMS-499). The script `pnpm export:content`, another process, is not held.
 */
let running = false

/**
 * The words of an error, for the sentence the button shows.
 * @param error - what was thrown
 * @returns its message
 */
function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/**
 * Read the base and write the files, saying what went wrong where.
 * @param steps - how the base is read and the files written
 * @returns what was written, counted — or the sentence saying why not
 */
async function runExport(steps: ExportSteps): Promise<Response> {
  let content: ContentFile
  try {
    content = await steps.read()
  } catch (error: unknown) {
    console.error('[CMS] the export refused the base', error)
    return Response.json(
      { error: `L’export est refusé, aucun fichier n’est écrit : ${messageOf(error)}` },
      { status: 422 }
    )
  }
  try {
    return Response.json(await writeContent(content, steps.write))
  } catch (error: unknown) {
    console.error('[CMS] the export could not write its files', error)
    return Response.json({ error: NOT_WRITTEN }, { status: 500 })
  }
}

/**
 * Export the base from the CMS's own screen (CMS-499): the same two steps as `pnpm export:content`. Signed-in
 * contributors only, one export at a time. A record the export refuses stops it before any file is written, and the
 * answer says which and why; a file that cannot be written says so, the way out being to export again. Each failure
 * is also logged on the server's console (`rules/error-handling.md`).
 * @param request - the request
 * @param steps - how the base is read and the files written
 * @returns what was written, counted — or the sentence saying why not
 */
export async function exportBase(request: ExportRequest, steps: ExportSteps): Promise<Response> {
  if (request.user === null) return Response.json({ error: 'Non connecté.' }, { status: 401 })
  if (running) {
    console.warn('[CMS] an export was asked while another runs: refused')
    return Response.json({ error: ALREADY_RUNNING }, { status: 409 })
  }
  running = true
  try {
    return await runExport(steps)
  } finally {
    running = false
  }
}

/** The route the button calls: `POST /api/export-content`, the base read and the files written on this machine. */
export const exportEndpoint: Endpoint = {
  path: '/export-content',
  method: 'post',
  handler: (request) =>
    exportBase(request, {
      read: () =>
        readContent(request.payload.config, (message) => {
          console.warn(message)
        }),
      write: folderWriter(CONTENT_DIR),
    }),
}
