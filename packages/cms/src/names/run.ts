import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { parseContentFile } from '@europe-historical-atlas/core/data/contentSource'
import { fetchWithin } from '@europe-historical-atlas/core/utils/fetchWithin'

import { compareNames, wikidataItemsOf } from './compareNames'
import { fetchLabels } from './fetchLabels'
import { KEPT_NAMES } from './keptNames'
import { formatNameReport } from './nameReport'

/** The page the control writes, read by the historian and the dev. */
const PAGE = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../../files/plans/contribution/noms-a-trier.md'
)

/**
 * `pnpm names:check` (CMS-495, the control of the names): the content the CMS prints, piped in, each place's name
 * compared with Wikidata's, and the names to sort written over `noms-a-trier.md`. Wiring only: what it asks and how it
 * compares are `wikidataLabels`, `fetchLabels`, `compareNames` and `nameReport`, tested there.
 * Anything that fails — nothing piped, a content it cannot read, Wikidata still refusing a lot — stops the command with
 * its reason on the standard error and a failure status, and writes nothing: a page judged on half the places would be
 * wrong.
 */
try {
  if (process.stdin.isTTY) throw new Error('aucun contenu reçu — usage : pnpm names:check')
  const piped = await readStdin()
  if (piped.trim() === '')
    throw new Error(
      'le CMS n’a rien envoyé : sa commande export:print a échoué, sa raison est plus haut'
    )
  const content = parseContentFile(JSON.parse(piped), 'stdin')
  const places = content.cities.map((city) => city.place)
  const labels = await fetchLabels(
    wikidataItemsOf(places),
    fetchWithin,
    (ms) => new Promise((done) => setTimeout(done, ms))
  )
  const report = compareNames(places, labels, KEPT_NAMES)
  await writeFile(PAGE, formatNameReport(report, new Date().toISOString().slice(0, 10)))
  process.stdout.write(
    `${String(report.gaps.length)} nom(s) à trier, ${String(report.unknown.length)} identifiant(s) inconnu(s) de Wikidata, sur ${String(report.places)} lieux — ${PAGE}\n`
  )
} catch (error: unknown) {
  console.error(`[CMS] names:check — ${error instanceof Error ? error.message : String(error)}`)
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
