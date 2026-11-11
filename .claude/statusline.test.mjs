// Run: node --test '.claude/*.test.mjs' '.claude/hooks/*.test.mjs'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

import { statusLine } from './statusline.mjs'

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
  it('the tree’s note wins over the agent: a sentence made the session historian', () => {
    assert.match(statusLine({ agent: { name: 'coder' } }, 'main', 'historian'), /^historien · /)
  })
  it('a branch git cannot tell reads as unknown', () => {
    assert.match(statusLine({}, null), /branche inconnue$/)
  })
  it('run as Claude Code runs it, it reads the branch of the folder it is given', () => {
    const out = execFileSync('node', [script], {
      input: JSON.stringify({ agent: { name: 'coder' }, workspace: { current_dir: here } }),
      encoding: 'utf8',
    })
    // The role is this tree's own note when it has one — codeur or historien, never « sans rôle » with an agent given.
    assert.match(out, /^(codeur|historien) · arbre main · branche \S+$/)
    assert.doesNotMatch(out, /inconnue/)
  })
  it('run on input that is not JSON, it says the line cannot be read', () => {
    const out = execFileSync('node', [script], { input: 'nope', encoding: 'utf8' })
    assert.match(out, /^ligne d'état illisible/)
  })
})
