// Run: node --test '.claude/*.test.mjs' '.claude/hooks/*.test.mjs'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, realpathSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

import { writeRole } from './hooks/role-state.mjs'
import { contextPart, statusLine } from './statusline.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const script = join(here, 'statusline.mjs')

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
    execFileSync('git', ['init', '-q', '-b', 'main', tree])
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
