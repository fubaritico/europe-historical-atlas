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
        planYearWrite({ mapSegment: '1100', body: savedBody(), manifestText: EMPTY_MANIFEST })
      )

      expect([plan.map, plan.year]).toEqual(['1100', 1100])
      expect(plan.files.map((file) => file.relativePath)).toEqual([
        '1100/registry.json',
        '1100/polities.json',
        '1100/borders.json',
        'index.json',
      ])
    })

    it('writes files that read back as what the editor saved', () => {
      const plan = accepted(
        planYearWrite({ mapSegment: '1100', body: savedBody(), manifestText: EMPTY_MANIFEST })
      )
      const polities = plan.files.find((file) => file.relativePath === '1100/polities.json')

      expect(JSON.parse(polities?.text ?? 'null')).toEqual(
        saveYearDocument(sharedBorderDocument()).polities
      )
    })

    it('lists the year in the manifest it extends, keeping the frame', () => {
      const plan = accepted(
        planYearWrite({ mapSegment: '1100', body: savedBody(), manifestText: EMPTY_MANIFEST })
      )
      const manifest = plan.files.find((file) => file.relativePath === 'index.json')

      expect(JSON.parse(manifest?.text ?? 'null')).toEqual({
        ...JSON.parse(EMPTY_MANIFEST),
        years: [1100],
      })
    })
  })

  describe('variants', () => {
    // s19: a working map is any folder; the atlas reads only the years the manifest lists.
    it('writes a working map into its own folder, without reading or touching the manifest', () => {
      const plan = accepted(
        planYearWrite({
          mapSegment: '1100-backup-2026-11-02',
          body: savedBody(),
          manifestText: null,
        })
      )

      expect([plan.map, plan.year]).toEqual(['1100-backup-2026-11-02', 1100])
      expect(plan.files.map((file) => file.relativePath)).toEqual([
        '1100-backup-2026-11-02/registry.json',
        '1100-backup-2026-11-02/polities.json',
        '1100-backup-2026-11-02/borders.json',
      ])
    })

    it('writes a working map whatever year its files declare', () => {
      const plan = accepted(
        planYearWrite({ mapSegment: '1200-essai', body: savedBody(), manifestText: EMPTY_MANIFEST })
      )

      expect(plan.year).toBe(1100)
    })

    it('leaves the manifest alone when the year is already listed', () => {
      const listed = JSON.stringify({ ...JSON.parse(EMPTY_MANIFEST), years: [1100] })
      const plan = accepted(
        planYearWrite({ mapSegment: '1100', body: savedBody(), manifestText: listed })
      )

      expect(plan.files.map((file) => file.relativePath)).not.toContain('index.json')
    })

    it('keeps the listed years in order when one is added among them', () => {
      const body = savedBody() as Record<string, Record<string, unknown>>
      for (const file of ['registry', 'polities', 'borders'])
        body[file] = { ...body[file], year: 1150 }
      const listed = JSON.stringify({ ...JSON.parse(EMPTY_MANIFEST), years: [1200, 1100] })
      const plan = accepted(planYearWrite({ mapSegment: '1150', body, manifestText: listed }))
      const manifest = plan.files.find((file) => file.relativePath === 'index.json')

      expect((JSON.parse(manifest?.text ?? 'null') as { years: number[] }).years).toEqual([
        1100, 1150, 1200,
      ])
    })

    it('puts the manifest last, so a year is never listed before its files exist', () => {
      // `s15`: a manifest naming a year whose files are not all written is the one state the atlas cannot
      // read. The naive plan writes the manifest first, where it is easiest to compute.
      const plan = accepted(
        planYearWrite({ mapSegment: '1100', body: savedBody(), manifestText: EMPTY_MANIFEST })
      )

      expect(plan.files.at(-1)?.relativePath).toBe('index.json')
    })
  })

  describe('managed errors', () => {
    it('refuses a name that would climb out of years/, with 400', () => {
      const decision = planYearWrite({
        mapSegment: '../etc',
        body: savedBody(),
        manifestText: EMPTY_MANIFEST,
      })

      expect(decision).toEqual({
        accepted: false,
        refusal: {
          status: 400,
          reason:
            '"../etc" is not a map\'s name — letters, digits, "-", "_" and "." only, starting with a letter or a digit',
        },
      })
    })

    it('refuses a name with a slash or a leading dot, with 400', () => {
      for (const mapSegment of ['1100/x', '.hidden', 'a/../b']) {
        const decision = planYearWrite({
          mapSegment,
          body: savedBody(),
          manifestText: EMPTY_MANIFEST,
        })

        expect(decision.accepted ? null : decision.refusal.status, mapSegment).toBe(400)
      }
    })

    // s19: a folder named 1200 holding 1100 would be published by the atlas as 1200.
    it('refuses a map named as a year whose files declare another year, with 422', () => {
      const decision = planYearWrite({
        mapSegment: '1110',
        body: savedBody(),
        manifestText: EMPTY_MANIFEST,
      })

      expect(decision.accepted ? null : decision.refusal).toEqual({
        status: 422,
        reason:
          'A map named 1110 is the map of the year 1110, which the atlas publishes — this map is 1100. Choose another name',
      })
    })

    it('refuses a file that fails its schema, naming the field', () => {
      const body = savedBody() as { registry: { polities: Record<string, unknown>[] } }
      const first = body.registry.polities[0]
      if (first !== undefined) first.rank = 42
      const decision = planYearWrite({ mapSegment: '1100', body, manifestText: EMPTY_MANIFEST })

      expect(decision.accepted ? null : decision.refusal.status).toBe(422)
      expect(decision.accepted ? '' : decision.refusal.reason).toContain('polities[0].rank')
    })

    it('refuses three files that disagree, the way opening them would', () => {
      const body = savedBody() as { polities: { claims: { rings: number[][] }[] } }
      const ring = body.polities.claims[0]?.rings[0]
      if (ring !== undefined) ring[0] = 999
      const decision = planYearWrite({ mapSegment: '1100', body, manifestText: EMPTY_MANIFEST })

      expect(decision.accepted ? null : decision.refusal.status).toBe(422)
      expect(decision.accepted ? '' : decision.refusal.reason).toContain('consistency')
    })

    it('refuses to write when the manifest is missing, with 409', () => {
      const decision = planYearWrite({ mapSegment: '1100', body: savedBody(), manifestText: null })

      expect(decision.accepted ? null : decision.refusal.status).toBe(409)
    })

    it('refuses to write over a manifest nobody can read, with 409', () => {
      const decision = planYearWrite({
        mapSegment: '1100',
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
        const decision = planYearWrite({ mapSegment: '1100', body, manifestText: EMPTY_MANIFEST })

        expect(decision.accepted ? null : decision.refusal.status).toBe(400)
      }
    })

    it('refuses an object missing one of the three files, as a schema failure', () => {
      const { registry, polities } = savedBody() as Record<string, unknown>
      const decision = planYearWrite({
        mapSegment: '1100',
        body: { registry, polities },
        manifestText: EMPTY_MANIFEST,
      })

      expect(decision.accepted ? null : decision.refusal.status).toBe(422)
    })

    it('refuses a stray key rather than writing it into the repository', () => {
      const body = savedBody() as { registry: Record<string, unknown> }
      body.registry.injected = '<script>'
      const decision = planYearWrite({ mapSegment: '1100', body, manifestText: EMPTY_MANIFEST })

      expect(decision.accepted).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('accepts a year before the common era', () => {
      const body = savedBody() as Record<string, Record<string, unknown>>
      for (const file of ['registry', 'polities', 'borders'])
        body[file] = { ...body[file], year: -52 }
      const plan = accepted(
        planYearWrite({ mapSegment: '-52', body, manifestText: EMPTY_MANIFEST })
      )

      expect(plan.files[0]?.relativePath).toBe('-52/registry.json')
    })

    it('refuses a name with a leading plus, an empty one, and one ending in a slash', () => {
      for (const mapSegment of ['+1100', '', '1100/']) {
        const decision = planYearWrite({
          mapSegment,
          body: savedBody(),
          manifestText: EMPTY_MANIFEST,
        })

        expect(decision.accepted ? null : decision.refusal.status, mapSegment).toBe(400)
      }
    })

    it('takes a name with dots — a copy names itself so', () => {
      const plan = accepted(
        planYearWrite({
          mapSegment: '1100.copy.2026-11-02T18-30-12',
          body: savedBody(),
          manifestText: null,
        })
      )

      expect(plan.files[0]?.relativePath).toBe('1100.copy.2026-11-02T18-30-12/registry.json')
    })

    it('refuses a name past 128 characters', () => {
      const decision = planYearWrite({
        mapSegment: `a${'b'.repeat(128)}`,
        body: savedBody(),
        manifestText: null,
      })

      expect(decision.accepted ? null : decision.refusal.status).toBe(400)
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
        planYearWrite({ mapSegment: '1100', body, manifestText: EMPTY_MANIFEST }).accepted
      ).toBe(true)
    })
  })
})
