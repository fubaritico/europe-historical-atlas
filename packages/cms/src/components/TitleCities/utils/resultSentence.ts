import type { AttachResult } from '../../../titles/attachCities'

/**
 * What became of one city, in a sentence for the title's page (CMS-507).
 * @param result - what the operation answered for it
 * @returns e.g. « Nîmes : fiche créée, tenue par ce titre, déduite de son district. »
 */
export function resultSentence(result: AttachResult): string {
  switch (result.result) {
    case 'created':
      return `${result.name} : fiche créée, tenue par ce titre, déduite de son district.`
    case 'attached':
      return `${result.name} : rattachée à ce titre, une ligne déduite de son district ajoutée.`
    case 'unchanged':
      return `${result.name} : déjà tenue par ce titre, rien n’a changé.`
    case 'failed':
      return `${result.name} : la base l’a refusée — ${result.error ?? 'sans raison donnée'}.`
    case 'conflict':
      return `${result.name} : laissée telle quelle — ${conflictWords(result)}.`
  }
}

/**
 * Why a city was left as it is.
 * @param result - a city left as it is
 * @returns the reason, in words
 */
function conflictWords(result: AttachResult): string {
  switch (result.reason?.kind) {
    case 'otherTitle':
      return `elle est tenue par ${result.holder ?? 'un autre titre'}`
    case 'otherLine':
      return `une ligne la donne à ${result.reason.holder}`
    case 'severalSheets':
      return `${String(result.reason.count)} de ses fiches couvrent cette année, à corriger à la main`
    case undefined:
      return 'sans raison donnée'
  }
}

/**
 * The whole answer, in one line for the toast.
 * @param results - what became of each city
 * @returns e.g. « 3 villes : 2 rattachées ou créées, 1 laissée telle quelle. »
 */
export function resultsSummary(results: readonly AttachResult[]): string {
  const done = results.filter(({ result }) => result === 'created' || result === 'attached').length
  const left = results.filter(({ result }) => result === 'conflict' || result === 'failed').length
  const unchanged = results.length - done - left
  const parts = [
    `${String(done)} rattachée${done > 1 ? 's' : ''} ou créée${done > 1 ? 's' : ''}`,
    ...(unchanged > 0 ? [`${String(unchanged)} déjà tenue${unchanged > 1 ? 's' : ''}`] : []),
    ...(left > 0
      ? [
          `${String(left)} laissée${left > 1 ? 's' : ''} telle${left > 1 ? 's' : ''} quelle${left > 1 ? 's' : ''}`,
        ]
      : []),
  ]
  return `${String(results.length)} ville${results.length > 1 ? 's' : ''} : ${parts.join(', ')}.`
}
