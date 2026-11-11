// Run: node --test '.claude/*.test.mjs' '.claude/hooks/*.test.mjs'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

import { denialFor, isCodePath, mainRootOf, sessionRole } from './historian-guard.mjs'
import { writeRole } from './role-state.mjs'

const script = join(dirname(fileURLToPath(import.meta.url)), 'historian-guard.mjs')
const root = '/repo'

/** Runs the hook as Claude Code does: JSON (or raw text) on stdin, the project root in the environment. */
const run = (stdin, projectDir = root) =>
  execFileSync('node', [script], {
    input: typeof stdin === 'string' ? stdin : JSON.stringify(stdin),
    encoding: 'utf8',
    env: { ...process.env, CLAUDE_PROJECT_DIR: projectDir },
  })

describe('historian-guard', () => {
  describe('isCodePath', () => {
    it('an absolute path under packages/ is code', () => {
      assert.equal(isCodePath('/repo/packages/atlas/src/main.ts', root), true)
    })
    it('a relative path under packages/ is code', () => {
      assert.equal(isCodePath('packages/core/src/geo/x.ts', root), true)
    })
    it('a plan, a note or a skill is not code', () => {
      assert.equal(isCodePath('/repo/files/plans/sources/1100.md', root), false)
      assert.equal(isCodePath('/repo/.claude/skills/enter-in-cms/SKILL.md', root), false)
    })
    it('a folder whose name only starts with packages is not code', () => {
      assert.equal(isCodePath('/repo/packages-old/a.ts', root), false)
    })
    it('a packages/ folder of another project is not this project’s code', () => {
      assert.equal(isCodePath('/other/packages/a.ts', root), false)
    })
    it('a path that climbs back into packages/ through .. is code', () => {
      assert.equal(isCodePath('/repo/files/../packages/a.ts', root), true)
      assert.equal(isCodePath('files/../packages/a.ts', root), true)
    })
    it('a path that climbs out of packages/ through .. is not code', () => {
      assert.equal(isCodePath('/repo/packages/../files/a.md', root), false)
    })
    it('packages/ written with capitals is code, as the Mac’s disk reads it', () => {
      assert.equal(isCodePath('/repo/Packages/atlas/a.ts', root), true)
    })
  })

  describe('from a worktree', () => {
    const tree = '/repo/.claude/worktrees/historian'
    it('the main tree’s root is found above the worktree', () => {
      assert.equal(mainRootOf(tree), '/repo')
      assert.equal(mainRootOf(root), root)
    })
    it('its own packages/ is code', () => {
      assert.equal(isCodePath('packages/core/a.ts', tree), true)
    })
    it('the main tree’s packages/ is code', () => {
      assert.equal(isCodePath('/repo/packages/atlas/a.ts', tree), true)
    })
    it('another worktree’s packages/ is code', () => {
      assert.equal(isCodePath('/repo/.claude/worktrees/coder/packages/atlas/a.ts', tree), true)
    })
    it('its own notes are not code', () => {
      assert.equal(isCodePath('files/plans/sources/1100.md', tree), false)
    })
  })

  describe('sessionRole', () => {
    it('the tree’s note wins over the agent the session was started as', () => {
      assert.equal(sessionRole('historian', { agent_type: 'coder' }), 'historian')
      assert.equal(sessionRole('coder', { agent_type: 'historian' }), 'coder')
    })
    it('without a note, a session started as the historian is the historian', () => {
      assert.equal(sessionRole(null, { agent_type: 'historian' }), 'historian')
    })
    it('without a note or an agent, the session is the coder', () => {
      assert.equal(sessionRole(null, {}), 'coder')
      assert.equal(sessionRole(null, null), 'coder')
    })
  })

  describe('denialFor', () => {
    it('denies a historian’s Edit under packages/ and names the coder session', () => {
      const reason = denialFor({ tool_input: { file_path: '/repo/packages/atlas/src/main.ts' } }, root, 'historian')
      assert.match(reason, /packages\/atlas\/src\/main\.ts is under packages\//)
      assert.match(reason, /claude --agent coder/)
    })
    it('lets the coder write under packages/', () => {
      assert.equal(denialFor({ tool_input: { file_path: '/repo/packages/atlas/src/main.ts' } }, root, 'coder'), null)
    })
    it('denies a historian’s notebook under packages/', () => {
      assert.notEqual(denialFor({ tool_input: { notebook_path: 'packages/a.ipynb' } }, root, 'historian'), null)
    })
    it('lets a historian’s note through', () => {
      assert.equal(denialFor({ tool_input: { file_path: '/repo/files/plans/x.md' } }, root, 'historian'), null)
    })
    it('refuses a historian’s write when the project root is unknown', () => {
      assert.match(denialFor({ tool_input: { file_path: '/repo/files/x.md' } }, undefined, 'historian'), /CLAUDE_PROJECT_DIR/)
    })
    it('refuses a historian’s write when the input carries no path', () => {
      assert.match(denialFor({ tool_input: {} }, root, 'historian'), /cannot read the path/)
    })
  })

  describe('as Claude Code runs it', () => {
    const treeWith = (role) => {
      const tree = mkdtempSync(join(tmpdir(), 'guard-'))
      if (role) writeRole(tree, role)
      return tree
    }
    it('in a tree noted historian, prints a PreToolUse deny for a write under packages/', () => {
      const tree = treeWith('historian')
      const out = JSON.parse(run({ tool_name: 'Edit', tool_input: { file_path: join(tree, 'packages/cms/a.ts') } }, tree))
      assert.equal(out.hookSpecificOutput.hookEventName, 'PreToolUse')
      assert.equal(out.hookSpecificOutput.permissionDecision, 'deny')
    })
    it('in a tree noted coder, says nothing for a write under packages/', () => {
      const tree = treeWith('coder')
      assert.equal(run({ tool_name: 'Edit', tool_input: { file_path: join(tree, 'packages/cms/a.ts') } }, tree), '')
    })
    it('in a tree with no note, a session started as the historian is guarded', () => {
      const tree = treeWith(null)
      const out = JSON.parse(run({ agent_type: 'historian', tool_input: { file_path: join(tree, 'packages/a.ts') } }, tree))
      assert.equal(out.hookSpecificOutput.permissionDecision, 'deny')
    })
    it('in a tree noted historian, says nothing for a write elsewhere', () => {
      const tree = treeWith('historian')
      assert.equal(run({ tool_name: 'Write', tool_input: { file_path: join(tree, 'files/plans/a.md') } }, tree), '')
    })
    it('in a tree noted historian, denies when stdin is not JSON', () => {
      const out = JSON.parse(run('not json', treeWith('historian')))
      assert.equal(out.hookSpecificOutput.permissionDecision, 'deny')
      assert.match(out.hookSpecificOutput.permissionDecisionReason, /could not read its input/)
    })
    it('in a tree noted coder, says nothing when stdin is not JSON', () => {
      assert.equal(run('not json', treeWith('coder')), '')
    })
  })
})
