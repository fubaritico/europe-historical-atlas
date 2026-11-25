// Run: node --test '.claude/*.test.mjs' '.claude/hooks/*.test.mjs'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, realpathSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

import { writeRole } from './hooks/role-state.mjs'
import { contextPart, statusLine, usageMoved, usageRecord, weekPart } from './statusline.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const script = join(here, 'statusline.mjs')

/**
 * The environment without git's own variables. Run by the commit hook, these tests inherit `GIT_DIR` (and its kin) from
 * the commit in progress; a `git init <tmp>` under it re-initialises the real repository instead of the temporary one,
 * and marks it bare — from a worktree's commit, 2026-11-13, the main tree stopped being a work tree.
 */
const withoutGit = Object.fromEntries(Object.entries(process.env).filter(([name]) => !name.startsWith('GIT_')))

describe('statusline', () => {
  it('a historian session in its tree reads its role, tree and branch', () => {
    const line = statusLine({ agent: { name: 'historian' }, workspace: { git_worktree: 'historian' } }, 'historian-1109')
    assert.equal(line, 'historien · arbre historian · branche historian-1109')
  })
  it('the main tree has no git_worktree and reads as main', () => {
    assert.equal(statusLine({ agent: { name: 'coder' }, workspace: {} }, 'main'), 'codeur · arbre main · branche main')
  })
  it('a session started without a role says so', () => {
    assert.match(statusLine({}, 'main'), /^sans rôle · /)
  })
  it('an unknown role is shown by its own name', () => {
    assert.match(statusLine({ agent: { name: 'reviewer' } }, 'main'), /^reviewer · /)
  })
  it('the session’s note wins over the agent: a sentence made the session historian', () => {
    assert.match(statusLine({ agent: { name: 'coder' } }, 'main', 'historian'), /^historien · /)
  })
  it('the context window is said plain under the first alarm', () => {
    assert.equal(statusLine({ context_window: { used_percentage: 34.4 } }, 'main'), 'sans rôle · arbre main · branche main · contexte 34 %')
  })
  it('each alarm colours the context from its threshold: 60 yellow, 75 orange, 85 red, 95 red with the word to close', () => {
    assert.equal(contextPart(59.4), ' · contexte 59 %')
    assert.equal(contextPart(60), ' · \u001b[33mcontexte 60 %\u001b[0m')
    assert.equal(contextPart(75), ' · \u001b[38;5;208mcontexte 75 %\u001b[0m')
    assert.equal(contextPart(85), ' · \u001b[31mcontexte 85 %\u001b[0m')
    assert.equal(contextPart(96), ' · \u001b[1;31mcontexte 96 % — ferme la session\u001b[0m')
  })
  it('no percentage yet, before the session’s first answer, says nothing of the context', () => {
    assert.equal(contextPart(undefined), '')
    assert.equal(contextPart(null), '')
  })
  it('a branch git cannot tell reads as unknown', () => {
    assert.match(statusLine({}, null), /branche inconnue$/)
  })
  it('run as Claude Code runs it, it reads the branch of the folder it is given', () => {
    const out = execFileSync('node', [script], {
      input: JSON.stringify({ agent: { name: 'coder' }, workspace: { current_dir: here } }),
      encoding: 'utf8',
    })
    // No session id given, so no note is read: the agent decides.
    assert.match(out, /^codeur · arbre main · branche \S+$/)
    assert.doesNotMatch(out, /inconnue/)
  })
  it('run as Claude Code runs it, two sessions of one tree each show their own role', () => {
    const tree = realpathSync(mkdtempSync(join(tmpdir(), 'statusline-')))
    execFileSync('git', ['init', '-q', '-b', 'main', tree], { env: withoutGit })
    writeRole(tree, 'coder-console', 'coder')
    writeRole(tree, 'historian-console', 'historian')
    const lineOf = (session_id) =>
      execFileSync('node', [script], { input: JSON.stringify({ session_id, workspace: { current_dir: tree } }), encoding: 'utf8' })
    assert.match(lineOf('coder-console'), /^codeur · /)
    assert.match(lineOf('historian-console'), /^historien · /)
  })
  it('run as Claude Code runs it, the note is read where the session was launched, not where it went', () => {
    const launched = realpathSync(mkdtempSync(join(tmpdir(), 'statusline-')))
    writeRole(launched, 'moved-console', 'historian')
    const out = execFileSync('node', [script], {
      input: JSON.stringify({ session_id: 'moved-console', workspace: { current_dir: here, project_dir: launched } }),
      encoding: 'utf8',
    })
    assert.match(out, /^historien · /)
  })
  it('run on input that is not JSON, it says the line cannot be read', () => {
    const out = execFileSync('node', [script], { input: 'nope', encoding: 'utf8' })
    assert.match(out, /^ligne d'état illisible/)
  })
})

describe('statusline, the plan usage', () => {
  it('the weekly percentage is said, rounded', () => {
    assert.equal(weekPart(41.2), ' · semaine 41 %')
  })
  it('no weekly percentage before the first answer says nothing', () => {
    assert.equal(weekPart(undefined), '')
  })
  it('the line carries the week after the context', () => {
    const line = statusLine(
      { agent: { name: 'historian' }, workspace: {}, context_window: { used_percentage: 20 }, rate_limits: { seven_day: { used_percentage: 63 } } },
      'main',
    )
    assert.equal(line, 'historien · arbre main · branche main · contexte 20 % · semaine 63 %')
  })
  it('a record keeps both windows and the week reset', () => {
    const status = { rate_limits: { five_hour: { used_percentage: 12 }, seven_day: { used_percentage: 63, resets_at: 1764500000 } } }
    assert.deepEqual(usageRecord(status, '2026-11-25T15:00:00Z'), {
      at: '2026-11-25T15:00:00Z',
      fiveHour: 12,
      sevenDay: 63,
      sevenDayResetsAt: 1764500000,
    })
  })
  it('no limits sent means no record', () => {
    assert.equal(usageRecord({}, '2026-11-25T15:00:00Z'), null)
  })
  it('a record is appended only when a percentage moved', () => {
    const last = JSON.stringify({ at: 'x', fiveHour: 12, sevenDay: 63 })
    assert.equal(usageMoved(last, { fiveHour: 12, sevenDay: 63 }), false)
    assert.equal(usageMoved(last, { fiveHour: 13, sevenDay: 63 }), true)
    assert.equal(usageMoved(undefined, { fiveHour: 12, sevenDay: 63 }), true)
  })
  it('run in a tree, the script writes the usage journal once per change', () => {
    const tree = realpathSync(mkdtempSync(join(tmpdir(), 'statusline-usage-')))
    execFileSync('git', ['init', '-q', tree], { env: withoutGit })
    const input = JSON.stringify({
      session_id: 's',
      workspace: { current_dir: tree, project_dir: tree },
      rate_limits: { five_hour: { used_percentage: 5 }, seven_day: { used_percentage: 40 } },
    })
    execFileSync('node', [script], { input, encoding: 'utf8', env: withoutGit })
    const out = execFileSync('node', [script], { input, encoding: 'utf8', env: withoutGit })
    assert.match(out, / · semaine 40 %$/)
    const lines = readFileSync(join(tree, '.claude', 'state', 'usage.jsonl'), 'utf8').trim().split('\n')
    assert.equal(lines.length, 1)
    assert.equal(JSON.parse(lines[0]).sevenDay, 40)
  })
})
