import type { NameReport } from './compareNames'

/** Each language of Wikidata a name is compared in, as the page says it. */
const LANGUAGES = { fr: 'français', en: 'anglais', mul: 'multilingue' } as const

/**
 * A cell of a Markdown table, from a name anyone may have typed — Wikidata's labels are open to all, and the page is
 * public (review SEC-001): on one line, so a line break cannot cut the row, and with the characters Markdown reads as
 * a bar, a tag, a link or code escaped, never stripped — the name stays readable against the base's.
 * @param text - the text
 * @returns the text, safe in a cell
 */
function cell(text: string): string {
  return text.replace(/\s+/g, ' ').replace(/[|<>[\]`\\]/g, (character) => `\\${character}`)
}

/**
 * The control of the names, written for the historian and the dev (CMS-495): French, Markdown — they read text, never
 * JSON. It replaces `files/plans/contribution/noms-a-trier.md` at each run.
 * @param report - what the comparison said
 * @param day - the day of the run, `2026-11-23`
 * @returns the page
 */
export function formatNameReport(report: NameReport, day: string): string {
  const lines = [
    '# Les noms de lieux à trier — nom d’époque ou nom actuel ?',
    '',
    `> Écrit par \`pnpm names:check\` le ${day} (CMS-495), depuis le contenu du CMS : le nom de chaque lieu comparé au nom`,
    '> que Wikidata donne au même lieu — son nom français, sinon son nom anglais, sinon son nom multilingue. Un nom déjà',
    '> trié et gardé tel quel n’y revient pas tant qu’il ne change pas (`packages/cms/src/names/keptNames.ts`). Un nom',
    '> d’époque se trie ainsi : le lieu prend son nom d’aujourd’hui, l’ancien devient son « Nom d’époque ».',
    '',
    '## Le compte',
    '',
    '| ce que la comparaison dit | lieux |',
    '| --- | --- |',
    `| le nom de la base est celui de Wikidata | ${String(report.same)} |`,
    `| le nom diffère, déjà trié et gardé | ${String(report.kept)} |`,
    `| **le nom diffère : à trier** | **${String(report.gaps.length)}** |`,
    `| Wikidata ne connaît pas l’identifiant du lieu | ${String(report.unknown.length)} |`,
    `| Wikidata ne donne ni nom français, ni anglais, ni multilingue | ${String(report.noLabel)} |`,
    `| pas d’identifiant Wikidata | ${String(report.noItem)} |`,
    `| **lieux lus** | **${String(report.places)}** |`,
    '',
    '## À trier',
    '',
    ...gapLines(report),
    ...unknownLines(report),
  ]
  return `${lines.join('\n')}\n`
}

/**
 * The names to sort, or the sentence that says there are none.
 * @param report - what the comparison said
 * @returns the section's lines
 */
function gapLines(report: NameReport): string[] {
  if (report.gaps.length === 0) return ['Aucun nom à trier.']
  return [
    '« alias » : Wikidata connaît le nom de la base comme un autre nom français du lieu.',
    '',
    '| lieu | nom dans la base | nom de Wikidata | langue | alias | identifiant |',
    '| --- | --- | --- | --- | --- | --- |',
    ...report.gaps.map(
      (gap) =>
        `| ${gap.place} | ${cell(gap.name)} | ${cell(gap.wikidataName)} | ${LANGUAGES[gap.language]} | ${gap.alias ? 'oui' : ''} | ${gap.wikidata} |`
    ),
  ]
}

/**
 * The items Wikidata does not know, under their own title — none, no section.
 * @param report - what the comparison said
 * @returns the section's lines
 */
function unknownLines(report: NameReport): string[] {
  if (report.unknown.length === 0) return []
  return [
    '',
    '## Identifiants que Wikidata ne connaît pas',
    '',
    'Un identifiant mal saisi, ou un élément fusionné dans un autre : à corriger sur le lieu.',
    '',
    '| lieu | nom dans la base | identifiant |',
    '| --- | --- | --- |',
    ...report.unknown.map(
      (place) => `| ${place.place} | ${cell(place.name)} | ${place.wikidata} |`
    ),
  ]
}
