import { describe, expect, it } from 'vitest'

import { sharedBorderDocument } from '@europe-historical-atlas/core/editor/documentFixtures'
import { saveYearDocument } from '@europe-historical-atlas/core/editor/yearDocument'

import { planYearWrite } from './yearWritePlan'

import type { YearWriteDecision, YearWritePlan } from './yearWritePlan'

/** The manifest as committed today: the DEM's box, no year yet. */
const EMPTY_MANIFEST = JSON.stringify({
  version: 1,
  bbox: { west: -45, south: 11, east: 78.75, north: 76.84 },
  years: [],
})

/** The three files of the fixture year, as the browser sends them — through JSON, so of no known type. */
function savedBody(): unknown {
  return JSON.parse(JSON.stringify(saveYearDocument(sharedBorderDocument())))
}

/**
 * The plan of an accepted decision.
 * @param decision - the decision
 * @returns its plan
 * @throws when the decision is a refusal, with its reason
 */
function accepted(decision: YearWriteDecision): YearWritePlan {
  if (!decision.accepted) throw new Error(`refused: ${decision.refusal.reason}`)
  return decision.plan
}

describe('planYearWrite', () => {
  describe('happy path', () => {
    it('plans the three files of the year, then the manifest listing it', () => {
      const plan = accepted(
        planYearWrite({ yearSegment: '1100', body: savedBody(), manifestText: EMPTY_MANIFEST })
      )

      expect(plan.year).toBe(1100)
      expect(plan.files.map((file) => file.relativePath)).toEqual([
        '1100/registry.json',
        '1100/polities.json',
        '1100/borders.json',
        'index.json',
      ])
    })

    it('writes files that read back as what the editor saved', () => {
      const plan = accepted(
        planYearWrite({ yearSegment: '1100', body: savedBody(), manifestText: EMPTY_MANIFEST })
      )
      const polities = plan.files.find((file) => file.relativePath === '1100/polities.json')

      expect(JSON.parse(polities?.text ?? 'null')).toEqual(
        saveYearDocument(sharedBorderDocument()).polities
      )
    })

    it('lists the year in the manifest it extends, keeping the frame', () => {
      const plan = accepted(
        planYearWrite({ yearSegment: '1100', body: savedBody(), manifestText: EMPTY_MANIFEST })
      )
      const manifest = plan.files.find((file) => file.relativePath === 'index.json')

      expect(JSON.parse(manifest?.text ?? 'null')).toEqual({
        ...JSON.parse(EMPTY_MANIFEST),
        years: [1100],
      })
    })
  })

  describe('variants', () => {
    it('leaves the manifest alone when the year is already listed', () => {
      const listed = JSON.stringify({ ...JSON.parse(EMPTY_MANIFEST), years: [1100] })
      const plan = accepted(
        planYearWrite({ yearSegment: '1100', body: savedBody(), manifestText: listed })
      )

      expect(plan.files.map((file) => file.relativePath)).not.toContain('index.json')
    })

    it('keeps the listed years in order when one is added among them', () => {
      const body = savedBody() as Record<string, Record<string, unknown>>
      for (const file of ['registry', 'polities', 'borders'])
        body[file] = { ...body[file], year: 1150 }
      const listed = JSON.stringify({ ...JSON.parse(EMPTY_MANIFEST), years: [1200, 1100] })
      const plan = accepted(planYearWrite({ yearSegment: '1150', body, manifestText: listed }))
      const manifest = plan.files.find((file) => file.relativePath === 'index.json')

      expect((JSON.parse(manifest?.text ?? 'null') as { years: number[] }).years).toEqual([
        1100, 1150, 1200,
      ])
    })

    it('puts the manifest last, so a year is never listed before its files exist', () => {
      // `s15`: a manifest naming a year whose files are not all written is the one state the atlas cannot
      // read. The naive plan writes the manifest first, where it is easiest to compute.
      const plan = accepted(
        planYearWrite({ yearSegment: '1100', body: savedBody(), manifestText: EMPTY_MANIFEST })
      )

      expect(plan.files.at(-1)?.relativePath).toBe('index.json')
    })
  })

  describe('managed errors', () => {
    it('refuses a year that is not a whole number, with 400', () => {
      const decision = planYearWrite({
        yearSegment: '../etc',
        body: savedBody(),
        manifestText: EMPTY_MANIFEST,
      })

      expect(decision).toEqual({
        accepted: false,
        refusal: { status: 400, reason: '"../etc" is not a year — expected a whole number' },
      })
    })

    it('refuses files that say another year than the one addressed, with 422', () => {
      const decision = planYearWrite({
        yearSegment: '1110',
        body: savedBody(),
        manifestText: EMPTY_MANIFEST,
      })

      expect(decision.accepted).toBe(false)
      expect(decision.accepted ? null : decision.refusal).toEqual({
        status: 422,
        reason: 'the files say year 1100, the save was addressed to 1110',
      })
    })

    it('refuses a file that fails its schema, naming the field', () => {
      const body = savedBody() as { registry: { polities: Record<string, unknown>[] } }
      const first = body.registry.polities[0]
      if (first !== undefined) first.rank = 42
      const decision = planYearWrite({ yearSegment: '1100', body, manifestText: EMPTY_MANIFEST })

      expect(decision.accepted ? null : decision.refusal.status).toBe(422)
      expect(decision.accepted ? '' : decision.refusal.reason).toContain('polities[0].rank')
    })

    it('refuses three files that disagree, the way opening them would', () => {
      const body = savedBody() as { polities: { claims: { rings: number[][] }[] } }
      const ring = body.polities.claims[0]?.rings[0]
      if (ring !== undefined) ring[0] = 999
      const decision = planYearWrite({ yearSegment: '1100', body, manifestText: EMPTY_MANIFEST })

      expect(decision.accepted ? null : decision.refusal.status).toBe(422)
      expect(decision.accepted ? '' : decision.refusal.reason).toContain('consistency')
    })

    it('refuses to write when the manifest is missing, with 409', () => {
      const decision = planYearWrite({ yearSegment: '1100', body: savedBody(), manifestText: null })

      expect(decision.accepted ? null : decision.refusal.status).toBe(409)
    })

    it('refuses to write over a manifest nobody can read, with 409', () => {
      const decision = planYearWrite({
        yearSegment: '1100',
        body: savedBody(),
        manifestText: '{ not json',
      })

      expect(decision.accepted ? null : decision.refusal.status).toBe(409)
      expect(decision.accepted ? '' : decision.refusal.reason).toContain(
        'years/index.json cannot be read'
      )
    })
  })

  describe('unmanaged errors', () => {
    it('refuses a body that is not the three files, with 400', () => {
      for (const body of [null, [], 'text', 3]) {
        const decision = planYearWrite({ yearSegment: '1100', body, manifestText: EMPTY_MANIFEST })

        expect(decision.accepted ? null : decision.refusal.status).toBe(400)
      }
    })

    it('refuses an object missing one of the three files, as a schema failure', () => {
      const { registry, polities } = savedBody() as Record<string, unknown>
      const decision = planYearWrite({
        yearSegment: '1100',
        body: { registry, polities },
        manifestText: EMPTY_MANIFEST,
      })

      expect(decision.accepted ? null : decision.refusal.status).toBe(422)
    })

    it('refuses a stray key rather than writing it into the repository', () => {
      const body = savedBody() as { registry: Record<string, unknown> }
      body.registry.injected = '<script>'
      const decision = planYearWrite({ yearSegment: '1100', body, manifestText: EMPTY_MANIFEST })

      expect(decision.accepted).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('accepts a year before the common era', () => {
      const body = savedBody() as Record<string, Record<string, unknown>>
      for (const file of ['registry', 'polities', 'borders'])
        body[file] = { ...body[file], year: -52 }
      const plan = accepted(
        planYearWrite({ yearSegment: '-52', body, manifestText: EMPTY_MANIFEST })
      )

      expect(plan.files[0]?.relativePath).toBe('-52/registry.json')
    })

    it('refuses a year with a decimal point or a leading plus', () => {
      for (const yearSegment of ['1100.5', '+1100', '', '1100/']) {
        const decision = planYearWrite({
          yearSegment,
          body: savedBody(),
          manifestText: EMPTY_MANIFEST,
        })

        expect(decision.accepted ? null : decision.refusal.status, yearSegment).toBe(400)
      }
    })

    it('saves an empty year — a map nothing has been drawn on yet', () => {
      const body = savedBody() as {
        registry: { polities: unknown[] }
        polities: { anchors: unknown[]; anchorSource: unknown[]; claims: unknown[] }
      }
      body.registry.polities = []
      body.polities.anchors = []
      body.polities.anchorSource = []
      body.polities.claims = []

      expect(
        planYearWrite({ yearSegment: '1100', body, manifestText: EMPTY_MANIFEST }).accepted
      ).toBe(true)
    })
  })
})
