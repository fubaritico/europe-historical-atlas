import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { parseContentFile } from '@europe-historical-atlas/core/data/contentSource'

import {
  USAGE,
  cityAlertReport,
  formatCityAlerts,
  openMapFolder,
  parseCityAlertArgs,
  pipedContent,
} from '../src/cli/cityAlerts'
import { toLoadedCity } from '../src/loaders/cityLoad'

/** Where the maps are, the folder the Cartographer saves them in. */
const YEARS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../atlas/public/years')

/**
 * The city alerts of a map (CARTO-456): the content read on the standard input — the CMS's `export:print`, piped in —
 * and the map from its folder, judged and told on the standard output. Run by `pnpm cities:alerts` at the root.
 * Wiring only: what it reads and how it judges are `src/cli/cityAlerts`, tested there.
 * Anything that cannot be read — no content piped, a map that does not exist or does not hold together — stops the
 * command with its reason on the standard error and a failure status: a list judged on half a map would be wrong.
 */
try {
  if (process.stdin.isTTY) throw new Error(`aucun contenu reçu sur l’entrée standard — ${USAGE}`)
  // Read whole before anything may refuse: a refusal that left the pipe unread would make the CMS's print fail on a
  // closed pipe, its trace on top of the reason (measured).
  const piped = await readStdin()
  const args = parseCityAlertArgs(process.argv.slice(2))
  const content = parseContentFile(pipedContent(piped), 'stdin')
  const folder = path.join(YEARS, args.map)
  const document = await openMapFolder(folder, (file) => readFile(path.join(folder, file), 'utf8'))
  const report = cityAlertReport(document, content.cities.map(toLoadedCity), args.box)
  process.stdout.write(`${formatCityAlerts(report, args.map)}\n`)
} catch (error: unknown) {
  console.error(
    `[Cartographer] cities:alerts — ${error instanceof Error ? error.message : String(error)}`
  )
  process.exitCode = 1
}

/**
 * Everything piped in.
 * @returns the text
 */
async function readStdin(): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer)
  return Buffer.concat(chunks).toString('utf8')
}
