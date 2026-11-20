#!/usr/bin/env node
// Step 2 of files/plans/jira-migration.md — the snapshot of Trello turned into Jira's JSON import format
// (https://support.atlassian.com/jira-cloud-administration/docs/import-data-from-json/). Reads nothing on the
// network. Writes, in files/resources/jira-migration/out/ (git-ignored):
//   eha.json           the whole board, project EHA
//   eht-trial.json     about thirty tickets chosen for their cases, project EHT (step 3, the trial)
//   after-import.json  what the import cannot carry, for the API pass: parents, flags, links, files
//   rapport.md         in French, for the dev: the counts and every odd case
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const DIR = resolve(ROOT, 'files/resources/jira-migration')
const snapshot = JSON.parse(readFileSync(resolve(DIR, 'snapshot/board.json'), 'utf8'))

/** The Jira project's key and name; the trial uses a throwaway key. */
const PROJECT = { key: 'EHA', name: 'Europe Historical Atlas' }
const TRIAL = { key: 'EHT', name: 'EHA trial (to delete)' }

/** A title's ticket — the same pattern as the board's script, retired scope included. */
const TICKET = /^\[(ATLAS|CARTO|CORE|CMS|REPO|DESIGN|CONTRIB)-(\d+)(?: · (ATLAS|CARTO|CORE|CMS|REPO|DESIGN|CONTRIB))?\]/
/** Scope labels become components, under the same names. */
const COMPONENTS = ['atlas', 'Cartographe', 'core', 'CMS', 'données', 'outillage', 'design']
/** The cover's colour is the importance, which becomes Jira's priority (plan, decision 4). */
const PRIORITY = { red: 'High', yellow: 'Medium' }
const EPIC_COLUMN = 'Épiques'

const listName = new Map(snapshot.lists.map((l) => [l.id, l.name]))
const numberOf = (card) => {
  const m = card.name.match(TICKET)
  return m ? Number(m[2]) : undefined
}
const numbered = snapshot.cards.filter((c) => numberOf(c) !== undefined).sort((a, b) => numberOf(a) - numberOf(b))
const skipped = snapshot.cards.filter((c) => numberOf(c) === undefined)
/** A Trello card's short link (`trello.com/c/<short>`) → its ticket number, to rewrite links between tickets. */
const byShort = new Map(numbered.map((c) => [c.shortUrl.split('/').at(-1), numberOf(c)]))

/** Jira's date format: `yyyy-MM-dd'T'HH:mm:ss.SSSZ`, here always in UTC. */
const jiraDate = (date) => new Date(date).toISOString().replace('Z', '+0000')
/** A Trello id starts with its creation time, in seconds, as eight hex digits. */
const createdAt = (id) => new Date(parseInt(id.slice(0, 8), 16) * 1000)
const frDate = (date) => new Date(date).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Paris' })
/** A Jira label takes no space. */
const jiraLabel = (name) => name.replaceAll(' · ', '-').replaceAll(/[\s']+/g, '-').toLowerCase()

/**
 * Trello's Markdown → Jira's wiki markup, the format the import's own sample uses (`_italics_ or *bold*`).
 * Code is set aside first so nothing inside it is rewritten; a brace outside code is escaped, or Jira would read
 * `{Polities}` as a macro.
 * @param {string} text - A description or a comment as Trello holds it.
 * @param {string} key - The Jira project key, for links between tickets.
 * @returns {string} The same text in wiki markup.
 */
function toWiki(text, key) {
  const kept = []
  const keep = (value) => `\u0000${kept.push(value) - 1}\u0000`
  let out = text.replaceAll('\r\n', '\n')
  out = out.replaceAll(/```([\w-]*)\n([\s\S]*?)```/g, (_, lang, body) => keep(`{code${lang ? `:${lang}` : ''}}\n${body}{code}`))
  out = out.replaceAll(/`([^`\n]+)`/g, (_, body) => keep(`{{${body.replaceAll(/([{}])/g, '\\$1')}}}`))
  out = out.replaceAll(/https:\/\/trello\.com\/c\/(\w+)(?:\/[^\s)\]]*)?/g, (url, short) => (byShort.has(short) ? `${key}-${byShort.get(short)}` : url))
  out = out.replaceAll(/([{}])/g, '\\$1')
  out = out.replaceAll(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, alt, url) => `[${alt || url}|${url}]`)
  out = out.replaceAll(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, url) => (label === url ? `[${url}]` : `[${label}|${url}]`))
  out = out
    .split('\n')
    .map((line) => {
      const heading = line.match(/^(#{1,6})\s+(.*)$/)
      if (heading) return `h${heading[1].length}. ${heading[2]}`
      const bullet = line.match(/^(\s*)[-*+]\s+(.*)$/)
      if (bullet) return `${'*'.repeat(Math.floor(bullet[1].length / 2) + 1)} ${bullet[2]}`
      const ordered = line.match(/^(\s*)\d+[.)]\s+(.*)$/)
      if (ordered) return `${'#'.repeat(Math.floor(ordered[1].length / 2) + 1)} ${ordered[2]}`
      const quote = line.match(/^>\s?(.*)$/)
      if (quote) return `bq. ${quote[1]}`
      if (/^\s*(?:-{3,}|\*{3,})\s*$/.test(line)) return '----'
      return line
    })
    // In wiki markup a plain line right after a list item continues that item: a blank line ends the list.
    .flatMap((line, index, lines) => (index > 0 && /^[*#]+ /.test(lines[index - 1]) && line.trim() !== '' && !/^[*#]+ /.test(line) ? ['', line] : [line]))
    .join('\n')
  // Bold before italic: `**a**` → `*a*`; a lone `*a*` (Markdown italic) → `_a_`. List markers are followed by a space.
  out = out.replaceAll(/\*\*([^*\n]+)\*\*/g, (_, body) => keep(`*${body}*`))
  out = out.replaceAll(/(^|[^*\w])\*([^*\s][^*\n]*?)\*(?!\w)/g, (_, before, body) => `${before}_${body}_`)
  out = out.replaceAll(/~~([^~\n]+)~~/g, '-$1-')
  // Kept pieces can nest (a code span inside bold): restore until none is left.
  while (/\u0000\d+\u0000/.test(out)) out = out.replaceAll(/\u0000(\d+)\u0000/g, (_, index) => kept[Number(index)])
  return out
}

/** A card's checklists as lists at the foot of its description; a tick is a plain character, safe in any renderer. */
function checklistsText(card, key) {
  return (card.checklists ?? [])
    .map((list) => {
      const items = [...list.checkItems].sort((a, b) => a.pos - b.pos)
      return `h4. ${list.name}\n${items.map((item) => `* ${item.state === 'complete' ? '✅' : '⬜'} ${toWiki(item.name, key)}`).join('\n')}`
    })
    .join('\n\n')
}

// Each epic: the card in the Épiques column, found by the `épique · …` label it carries itself.
const epicCards = numbered.filter((c) => listName.get(c.idList) === EPIC_COLUMN)
const epicByLabel = new Map()
for (const epic of epicCards) for (const l of epic.labels) if (l.name.startsWith('épique · ')) epicByLabel.set(l.name, epic)
/** The ticket numbers an epic's checklists name, in order. */
const namedBy = new Map(
  epicCards.map((epic) => [
    numberOf(epic),
    (epic.checklists ?? []).flatMap((list) => list.checkItems.flatMap((item) => [...item.name.matchAll(/\b[A-Z]+-(\d+)\b/g)].map((m) => Number(m[1])))),
  ]),
)

const commentsOf = new Map()
for (const action of snapshot.comments) {
  const id = action.data.card?.id
  commentsOf.set(id, [...(commentsOf.get(id) ?? []), action])
}
/** The last time a card entered « Fait », from the board's moves (newest first). */
const doneAt = new Map()
for (const action of snapshot.moves) {
  if (action.type === 'updateCard' && action.data.listAfter?.name === 'Fait' && !doneAt.has(action.data.card.id)) doneAt.set(action.data.card.id, action.date)
}

const odd = { twoTypes: [], noType: [], twoEpics: [], namedNotLabelled: [], labelledNotNamed: [], tooLong: [] }
const after = { parents: {}, flags: [], blocks: [], files: [], archived: [] }

/**
 * One card as a Jira work item.
 * @param {object} card - The Trello card of the snapshot.
 * @param {string} key - The Jira project key.
 * @returns {object} The work item, in the import's format.
 */
function workItem(card, key) {
  const number = numberOf(card)
  const ref = card.name.match(TICKET)[0]
  const column = listName.get(card.idList)
  const names = card.labels.map((l) => l.name)
  const isEpic = column === EPIC_COLUMN
  const types = names.filter((n) => ['défaut', 'fonctionnalité', 'dette', 'doc', 'décision', "retour d'usage"].includes(n))
  const workType = isEpic ? 'Epic' : names.includes('défaut') ? 'Bug' : names.includes('fonctionnalité') ? 'Story' : 'Tâche'
  if (!isEpic && types.length > 1) odd.twoTypes.push(`${ref} : ${types.join(', ')} → ${workType}`)
  if (!isEpic && types.length === 0) odd.noType.push(`${ref} ${card.name.slice(ref.length, 80)} → Task`)

  const epics = names.filter((n) => epicByLabel.has(n)).map((n) => epicByLabel.get(n)).filter((epic) => epic !== card)
  const naming = epicCards.filter((epic) => epic !== card && namedBy.get(numberOf(epic)).includes(number))
  if (!isEpic) {
    const parent = epics.find((epic) => naming.includes(epic)) ?? epics[0] ?? naming[0]
    if (parent) after.parents[number] = numberOf(parent)
    if (epics.length > 1) odd.twoEpics.push(`${ref} : ${epics.map((e) => e.name.match(TICKET)[0]).join(' et ')} → parent ${parent.name.match(TICKET)[0]}`)
    for (const epic of naming) if (!epics.includes(epic)) odd.namedNotLabelled.push(`${ref} est nommé par ${epic.name.match(TICKET)[0]} sans porter son étiquette`)
    for (const epic of epics) if (!naming.includes(epic)) odd.labelledNotNamed.push(`${ref} porte l'étiquette de ${epic.name.match(TICKET)[0]} sans être dans sa liste`)
  }

  if (names.includes('Bloqué')) after.flags.push(number)
  if (card.closed) after.archived.push(number)
  for (const a of card.attachments ?? []) {
    const short = a.url.match(/^https:\/\/trello\.com\/c\/(\w+)/)?.[1]
    if (a.isUpload) after.files.push({ number, file: a.localFile, name: a.name })
    else if (short && byShort.has(short) && names.includes('Bloqué')) after.blocks.push({ blocked: number, by: byShort.get(short) })
  }

  const created = createdAt(card.id)
  const done = column === 'Fait' ? doneAt.get(card.id) : undefined
  const header = `_Trello #${card.idShort} · créé le ${frDate(created)}${done ? ` · passé à « Fait » le ${frDate(done)}` : ''}${card.closed ? ' · archivé dans Trello' : ''}_`
  const links = (card.attachments ?? []).filter((a) => !a.isUpload).map((a) => `* ${toWiki(a.url, key)}`)
  const description = [header, toWiki(card.desc, key), checklistsText(card, key), links.length ? `h4. Liens\n${links.join('\n')}` : ''].filter(Boolean).join('\n\n')
  if (card.name.length > 255) odd.tooLong.push(`${ref} : titre de ${card.name.length} caractères (limite 255)`)
  if (description.length > 32000) odd.tooLong.push(`${ref} : description de ${description.length} caractères (limite 32 767)`)

  const comments = (commentsOf.get(card.id) ?? [])
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((action) => ({ body: toWiki(action.data.text, key), created: jiraDate(action.date) }))
  for (const comment of comments) if (comment.body.length > 32000) odd.tooLong.push(`${ref} : un commentaire de ${comment.body.length} caractères`)

  return {
    key: `${key}-${number}`,
    externalId: String(number),
    summary: card.name.slice(0, 255),
    description,
    status: isEpic ? 'En cours' : column,
    issueType: workType,
    priority: PRIORITY[card.cover?.color] ?? 'Low',
    ...(column === 'Fait' ? { resolution: 'Done' } : {}),
    created: jiraDate(created),
    updated: jiraDate(card.dateLastActivity),
    labels: [
      ...names.filter((n) => !COMPONENTS.includes(n) && n !== 'défaut' && n !== 'fonctionnalité').map(jiraLabel),
      ...(card.closed ? ['archivé'] : []),
    ],
    components: names.filter((n) => COMPONENTS.includes(n)),
    comments,
  }
}

/** The whole import file for one project. */
const importFile = (project, cards) => ({
  projects: [{ name: project.name, key: project.key, components: COMPONENTS, issues: cards.map((c) => workItem(c, project.key)) }],
})

mkdirSync(resolve(DIR, 'out'), { recursive: true })
const whole = importFile(PROJECT, numbered)
writeFileSync(resolve(DIR, 'out/eha.json'), JSON.stringify(whole, null, 1))
writeFileSync(resolve(DIR, 'out/after-import.json'), JSON.stringify(after, null, 1))

// The trial: about thirty tickets, each chosen for a case the import must prove.
const pick = new Map()
const add = (card, why) => card && !pick.has(card.id) && pick.set(card.id, { card, why })
const byNumber = new Map(numbered.map((c) => [numberOf(c), c]))
for (const n of [1, 2, 5]) add(byNumber.get(n), 'un trou dans les numéros (1, 2, 5)')
const epic = epicCards.find((c) => c.name.includes('CARTO-363')) ?? epicCards[0]
add(epic, 'une épique')
for (const [child, parent] of Object.entries(after.parents)) if (parent === numberOf(epic) && pick.size < 12) add(byNumber.get(Number(child)), "un enfant de l'épique")
add([...numbered].sort((a, b) => (commentsOf.get(b.id)?.length ?? 0) - (commentsOf.get(a.id)?.length ?? 0))[0], 'le plus de commentaires')
for (const c of numbered.filter((c) => (commentsOf.get(c.id) ?? []).some((a) => a.data.text.includes('```'))).slice(-4)) add(c, 'un commentaire de clôture avec du code')
for (const f of after.files) add(byNumber.get(f.number), 'un fichier joint')
for (const n of after.flags.slice(0, 2)) add(byNumber.get(n), 'un ticket bloqué')
for (const b of after.blocks.slice(0, 2)) add(byNumber.get(b.by), 'un ticket qui en bloque un autre')
for (const n of after.archived.slice(0, 2)) add(byNumber.get(n), 'un ticket archivé')
for (const c of numbered.filter((c) => c.name.match(TICKET)[3]).slice(0, 2)) add(c, 'deux périmètres')
for (const c of numbered.filter((c) => (c.checklists ?? []).length && !epicCards.includes(c)).slice(0, 2)) add(c, 'une liste de cases hors épique')
for (const c of numbered.filter((c) => /\{\w+\}/.test(c.name + c.desc)).slice(0, 2)) add(c, 'des accolades dans le texte')
for (const column of ['Idées', 'Backlog', 'À faire', 'En cours', 'Fait']) add(numbered.findLast((c) => listName.get(c.idList) === column && !c.closed), `la colonne « ${column} »`)
const trialCards = [...pick.values()].map((p) => p.card).sort((a, b) => numberOf(a) - numberOf(b))
// The trial's odd cases were already counted with the whole board: keep the report's lists as they are.
const keepOdd = JSON.stringify(odd)
const keepAfter = JSON.stringify(after)
writeFileSync(resolve(DIR, 'out/eht-trial.json'), JSON.stringify(importFile(TRIAL, trialCards), null, 1))
Object.assign(odd, JSON.parse(keepOdd))
Object.assign(after, JSON.parse(keepAfter))

const items = whole.projects[0].issues
const count = (field) => items.reduce((acc, item) => ({ ...acc, [item[field]]: (acc[item[field]] ?? 0) + 1 }), {})
const table = (object) => Object.entries(object).map(([k, v]) => `- ${k} : ${v}`).join('\n')
const section = (title, lines) => `## ${title} (${lines.length})\n\n${lines.length ? lines.map((l) => `- ${l}`).join('\n') : 'Aucun.'}\n`
const numbers = numbered.map(numberOf)
const holes = Array.from({ length: Math.max(...numbers) }, (_, i) => i + 1).filter((n) => !byNumber.has(n))

writeFileSync(
  resolve(DIR, 'out/rapport.md'),
  [
    `# La migration vers Jira — ce que le fichier d'import contient`,
    `Copie de Trello prise le ${frDate(snapshot.takenAt)}. Ce rapport est écrit par \`files/spikes/jira-migration/transform.mjs\`.`,
    `## Les comptes\n\n- ${items.length} tickets, numéros de ${Math.min(...numbers)} à ${Math.max(...numbers)}, ${holes.length ? `trous : ${holes.join(', ')}` : 'sans trou'}\n- ${items.reduce((s, i) => s + i.comments.length, 0)} commentaires\n- ${Object.keys(after.parents).length} tickets rattachés à une épique\n- ${after.files.length} fichiers joints, ${after.flags.length} tickets bloqués, ${after.blocks.length} liens « bloqué par », ${after.archived.length} tickets archivés`,
    `## Par type\n\n${table(count('issueType'))}`,
    `## Par statut\n\n${table(count('status'))}`,
    `## Par priorité\n\n${table(count('priority'))}`,
    section('Tickets avec deux étiquettes de type', odd.twoTypes),
    section('Tickets sans étiquette de type', odd.noType),
    section('Tickets dans deux épiques', odd.twoEpics),
    section("Tickets nommés par la liste d'une épique sans porter son étiquette", odd.namedNotLabelled),
    section("Tickets qui portent l'étiquette d'une épique sans être dans sa liste", odd.labelledNotNamed),
    section('Textes trop longs pour Jira', odd.tooLong),
    section('Cartes non importées (sans numéro)', skipped.map((c) => `${c.closed ? 'archivée' : 'modèle'} : ${c.name.slice(0, 90)}`)),
    section("Les tickets de l'essai", [...pick.values()].sort((a, b) => numberOf(a.card) - numberOf(b.card)).map((p) => `${p.card.name.match(TICKET)[0]} — ${p.why}`)),
  ].join('\n\n'),
)
console.warn(`[transform] ${items.length} work items → out/eha.json · ${trialCards.length} for the trial · report: ${resolve(DIR, 'out/rapport.md')}`)
