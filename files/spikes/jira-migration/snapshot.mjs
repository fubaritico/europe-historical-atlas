#!/usr/bin/env node
// Step 1 of files/plans/jira-migration.md — a frozen copy of the whole Trello board, read-only on Trello's side.
// Writes files/resources/jira-migration/snapshot/ (git-ignored: the board is private, the repository public).
// Reads TRELLO_API_KEY and TRELLO_TOKEN from .env.local and never prints either. Any refusal exits 1.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const OUT = resolve(ROOT, 'files/resources/jira-migration/snapshot')
/** The board this repository tracks its work on — the same id as the board's script. */
const BOARD = '6ad371ed842063195c4ceb77'

const env = {}
for (const line of readFileSync(resolve(ROOT, '.env.local'), 'utf8').split('\n')) {
  const match = line.trim().match(/^([A-Z_]+)=(.*)$/)
  if (match) env[match[1]] = match[2].trim()
}

function fail(message) {
  console.error(`[snapshot] ${message}`)
  process.exit(1)
}

/** One GET on the Trello REST API; the URL, which carries the token, is never printed. */
async function get(path, params = {}) {
  const query = new URLSearchParams({ ...params, key: env.TRELLO_API_KEY, token: env.TRELLO_TOKEN })
  const response = await fetch(`https://api.trello.com/1${path}?${query}`)
  if (!response.ok) fail(`GET ${path} → ${response.status}`)
  return response.json()
}

/** Every action of the given kinds, newest first, paged by `before` — Trello returns 1000 at most per call. */
async function actions(filter) {
  const all = []
  let before
  for (;;) {
    const page = await get(`/boards/${BOARD}/actions`, { filter, limit: '1000', ...(before ? { before } : {}) })
    all.push(...page)
    if (page.length < 1000) return all
    before = page.at(-1).id
  }
}

mkdirSync(resolve(OUT, 'files'), { recursive: true })
const lists = await get(`/boards/${BOARD}/lists/all`, { fields: 'name,closed,pos' })
const labels = await get(`/boards/${BOARD}/labels`, { fields: 'name,color', limit: '1000' })
const cards = await get(`/boards/${BOARD}/cards/all`, {
  fields: 'name,desc,closed,idList,idShort,pos,labels,cover,due,dateLastActivity,shortUrl,isTemplate',
  attachments: 'true',
  checklists: 'all',
})
const comments = await actions('commentCard')
const moves = await actions('updateCard:idList,updateCard:closed,createCard,copyCard,convertToCardFromCheckItem')

// An uploaded file's address needs our token in a header; a link attachment is kept as its address only.
let saved = 0
for (const c of cards) {
  for (const a of c.attachments ?? []) {
    if (!a.isUpload) continue
    const response = await fetch(a.url, {
      headers: { Authorization: `OAuth oauth_consumer_key="${env.TRELLO_API_KEY}", oauth_token="${env.TRELLO_TOKEN}"` },
    })
    if (!response.ok) fail(`file ${a.name} of card #${c.idShort} → ${response.status}`)
    const local = `${a.id}-${a.name.replaceAll(/[^\w.-]/g, '_')}`
    writeFileSync(resolve(OUT, 'files', local), Buffer.from(await response.arrayBuffer()))
    a.localFile = local
    saved++
  }
}

const snapshot = { takenAt: new Date().toISOString(), board: BOARD, lists, labels, cards, comments, moves }
writeFileSync(resolve(OUT, 'board.json'), JSON.stringify(snapshot, null, 1))
console.warn(
  `[snapshot] ${cards.length} cards (${cards.filter((c) => c.closed).length} archived), ${comments.length} comments, ` +
    `${moves.length} moves, ${saved} files → ${OUT}`,
)
