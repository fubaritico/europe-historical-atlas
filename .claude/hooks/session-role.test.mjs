// Run: node --test '.claude/*.test.mjs' '.claude/hooks/*.test.mjs'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

import { roleOutput } from './session-role.mjs'

const script = join(dirname(fileURLToPath(import.meta.url)), 'session-role.mjs')
const pages = { coder: 'CODER PAGE', historian: 'HISTORIAN PAGE' }
const readRole = (role) => pages[role] ?? null

describe('session-role', () => {
  it('after a clear, a historian session gets its page back', () => {
    const out = roleOutput({ source: 'clear', agent_type: 'historian' }, readRole)
    assert.match(out.hookSpecificOutput.additionalContext, /« historian »[\s\S]*HISTORIAN PAGE$/)
  })
  it('after a compaction, a session with no agent gets the coder’s page', () => {
    const out = roleOutput({ source: 'compact' }, readRole)
    assert.match(out.hookSpecificOutput.additionalContext, /CODER PAGE$/)
  })
  it('at startup, the session is named after its role and gets no page (its first prompt reads it)', () => {
    const out = roleOutput({ source: 'startup', agent_type: 'historian' }, readRole)
    assert.equal(out.hookSpecificOutput.sessionTitle, 'historien')
    assert.equal(out.hookSpecificOutput.additionalContext, undefined)
  })
  it('a resume says nothing: the conversation still holds the role', () => {
    assert.equal(roleOutput({ source: 'resume', agent_type: 'coder' }, readRole), null)
  })
  it('an agent with no role page says nothing', () => {
    assert.equal(roleOutput({ source: 'clear', agent_type: 'Explore' }, readRole), null)
    assert.equal(roleOutput({ source: 'startup', agent_type: 'Explore' }, readRole), null)
  })
  it('run as Claude Code runs it, it reads the real role page', () => {
    const out = JSON.parse(execFileSync('node', [script], { input: JSON.stringify({ source: 'clear', agent_type: 'historian' }), encoding: 'utf8' }))
    assert.match(out.hookSpecificOutput.additionalContext, /# Role — the historian/)
  })
})
