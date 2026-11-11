// Run: node --test '.claude/*.test.mjs' '.claude/hooks/*.test.mjs'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, it } from 'node:test'

import { readRole, roleFromPrompt, rolePath, writeRole } from './role-state.mjs'

describe('role-state', () => {
  describe('roleFromPrompt', () => {
    it('« commence une session en tant qu’historien » names the historian', () => {
      assert.equal(roleFromPrompt('Commence une session en tant qu’historien'), 'historian')
      assert.equal(roleFromPrompt("commence une session en tant qu'historien"), 'historian')
    })
    it('« en tant que codeur » and « en tant que historien », as dictated, name their role', () => {
      assert.equal(roleFromPrompt('commence une session en tant que codeur'), 'coder')
      assert.equal(roleFromPrompt('en tant que historien'), 'historian')
    })
    it('« prends le rôle du codeur » names the coder, accents or not', () => {
      assert.equal(roleFromPrompt('Prends le rôle du codeur'), 'coder')
      assert.equal(roleFromPrompt('prends le role de historien'), 'historian')
    })
    it('« passe en historien » names the historian', () => {
      assert.equal(roleFromPrompt('ok, passe en historien'), 'historian')
    })
    it('the agent’s first prompt names its role', () => {
      assert.equal(roleFromPrompt('/start-session historian'), 'historian')
      assert.equal(roleFromPrompt('/start-session coder'), 'coder')
    })
    it('a message that only mentions the historian names no role', () => {
      assert.equal(roleFromPrompt('l’historien a saisi l’Adriatique'), null)
      assert.equal(roleFromPrompt('le codeur et l’historien'), null)
      assert.equal(roleFromPrompt('/start-session'), null)
    })
  })

  describe('the note', () => {
    it('a role written is read back', () => {
      const tree = mkdtempSync(join(tmpdir(), 'role-'))
      writeRole(tree, 'historian')
      assert.equal(readRole(tree), 'historian')
    })
    it('a tree with no note has no role', () => {
      assert.equal(readRole(mkdtempSync(join(tmpdir(), 'role-'))), null)
    })
    it('a note naming no known role is no role', () => {
      const tree = mkdtempSync(join(tmpdir(), 'role-'))
      mkdirSync(join(tree, '.claude', 'state'), { recursive: true })
      writeFileSync(rolePath(tree), 'pirate\n')
      assert.equal(readRole(tree), null)
    })
  })
})
