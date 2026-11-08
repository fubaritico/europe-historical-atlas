import { describe, expect, it } from 'vitest'

import { OPENING_SLICES, createOpeningBar, openEditor } from './opening'

import type { OpeningStep } from './opening'
import type { ProgressReport } from '@europe-historical-atlas/core/pipeline/mapCompute'

/** A sink that keeps every report, in order. */
const recorder = () => {
  const told: [number, OpeningStep][] = []
  return {
    told,
    report: (fraction: number, step: OpeningStep) => {
      told.push([fraction, step])
    },
  }
}

describe('createOpeningBar', () => {
  describe('happy path', () => {
    it('lays the bake half-way through on the middle of the relief slice', () => {
      const { told, report } = recorder()

      createOpeningBar(report).bake(0.5, 'bake')

      const [from, to] = OPENING_SLICES.relief
      expect(told).toEqual([[from + (to - from) / 2, 'relief']])
    })
  })

  describe('variants', () => {
    it('starts a step at the start of its slice when no progress inside it is given', () => {
      const { told, report } = recorder()

      createOpeningBar(report).step('coast')

      expect(told).toEqual([[OPENING_SLICES.coast[0], 'coast']])
    })
  })

  describe('edge cases', () => {
    it('never goes back: a report below the value shown keeps the value shown', () => {
      const { told, report } = recorder()
      const bar = createOpeningBar(report)

      bar.bake(0.9, 'bake')
      bar.bake(0.2, 'bake')

      expect(told[1]?.[0]).toBe(told[0]?.[0])
    })

    it('keeps a fraction out of [0, 1] inside its step', () => {
      const { told, report } = recorder()
      const bar = createOpeningBar(report)

      bar.step('download', 3)

      expect(told).toEqual([[OPENING_SLICES.download[1], 'download']])
    })

    it('lays the four slices end to end, from 0 to 1', () => {
      const order: OpeningStep[] = ['download', 'relief', 'coast', 'surface']

      expect(order.map((step) => OPENING_SLICES[step])).toEqual([
        [0, OPENING_SLICES.relief[0]],
        [OPENING_SLICES.relief[0], OPENING_SLICES.coast[0]],
        [OPENING_SLICES.coast[0], OPENING_SLICES.surface[0]],
        [OPENING_SLICES.surface[0], 1],
      ])
    })
  })
})

describe('openEditor', () => {
  describe('happy path', () => {
    it('reports the four steps in order, the bake in between, and hands back both loads', async () => {
      const { told, report } = recorder()

      const opened = await openEditor(
        {
          loadBackdrop: (onBake: ProgressReport) => {
            onBake(0, 'bake')
            onBake(0.5, 'bake')
            return Promise.resolve('backdrop')
          },
          loadVectors: (backdrop) => Promise.resolve(`${backdrop} vectors`),
          afterPaint: () => Promise.resolve(),
        },
        report
      )

      expect(told.map(([, step]) => step)).toEqual([
        'download',
        'relief',
        'relief',
        'coast',
        'surface',
      ])
      expect(opened).toEqual({ backdrop: 'backdrop', vectors: 'backdrop vectors' })
    })
  })

  describe('variants', () => {
    it('hands back only once the last step has been painted', async () => {
      const { told, report } = recorder()
      let paint = (): void => undefined
      let opened = false

      const opening = openEditor(
        {
          loadBackdrop: () => Promise.resolve('backdrop'),
          loadVectors: () => Promise.resolve('vectors'),
          afterPaint: () =>
            new Promise<void>((painted) => {
              paint = painted
            }),
        },
        report
      ).then(() => {
        opened = true
      })
      await Promise.resolve()
      await Promise.resolve()

      expect(told.at(-1)?.[1]).toBe('surface')
      expect(opened).toBe(false)

      paint()
      await opening

      expect(opened).toBe(true)
    })
  })

  describe('managed errors', () => {
    it('lets a failed bake reject the opening, after saying the download had started', async () => {
      const { told, report } = recorder()

      await expect(
        openEditor(
          {
            loadBackdrop: () => Promise.reject(new Error('the mask is missing')),
            loadVectors: () => Promise.resolve('vectors'),
            afterPaint: () => Promise.resolve(),
          },
          report
        )
      ).rejects.toThrow('the mask is missing')
      expect(told).toEqual([[0, 'download']])
    })
  })

  describe('unmanaged errors', () => {
    it('lets a throw in the vectors reject the opening, without announcing the drawing', async () => {
      const { told, report } = recorder()

      await expect(
        openEditor(
          {
            loadBackdrop: () => Promise.resolve('backdrop'),
            loadVectors: () => Promise.reject(new TypeError('rivers is not iterable')),
            afterPaint: () => Promise.resolve(),
          },
          report
        )
      ).rejects.toThrow('rivers is not iterable')
      expect(told.map(([, step]) => step)).not.toContain('surface')
    })
  })
})
