import { describe, expect, it, vi } from 'vitest'

import { readBytes } from './readBytes'

/**
 * A response whose body arrives in the chunks given.
 * @param chunks - the chunks, in order
 * @returns the response
 */
function chunked(...chunks: number[][]): Response {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(Uint8Array.from(chunk))
      controller.close()
    },
  })
  return new Response(body)
}

describe('readBytes', () => {
  describe('happy path', () => {
    it('reads the whole body, in order', async () => {
      const bytes = await readBytes(chunked([1, 2], [3], [4, 5, 6]), {
        total: 6,
        report: () => undefined,
      })
      expect(Array.from(new Uint8Array(bytes))).toEqual([1, 2, 3, 4, 5, 6])
    })

    it('tells the size first, then each chunk received against it', async () => {
      const told: [number, number][] = []
      await readBytes(chunked([1, 2], [3], [4, 5, 6]), {
        total: 6,
        report: (received, total) => told.push([received, total]),
      })
      expect(told).toEqual([
        [0, 6],
        [2, 6],
        [3, 6],
        [6, 6],
      ])
    })
  })

  describe('variants', () => {
    it('reads the body whole, telling nothing, when the download is not counted', async () => {
      const bytes = await readBytes(chunked([7], [8]))
      expect(Array.from(new Uint8Array(bytes))).toEqual([7, 8])
    })

    // Review QUAL-002: a body that cannot be streamed is read whole, never a count claimed for it.
    it('reads a body that cannot be streamed whole, telling nothing', async () => {
      const report = vi.fn()
      const response = {
        body: null,
        arrayBuffer: () => Promise.resolve(Uint8Array.from([9]).buffer),
      } as unknown as Response
      const bytes = await readBytes(response, { total: 1, report })
      expect([Array.from(new Uint8Array(bytes)), report.mock.calls.length]).toEqual([[9], 0])
    })
  })

  describe('edge cases', () => {
    it('counts what arrived, not the total, when the file is not the size its metadata says', async () => {
      const told: number[] = []
      const bytes = await readBytes(chunked([1, 2, 3]), {
        total: 10,
        report: (received) => told.push(received),
      })
      expect([bytes.byteLength, told]).toEqual([3, [0, 3]])
    })

    it('reads an empty body as no bytes, telling only its size', async () => {
      const told: number[] = []
      const bytes = await readBytes(chunked(), {
        total: 1,
        report: (received) => told.push(received),
      })
      expect([bytes.byteLength, told]).toEqual([0, [0]])
    })
  })

  // L3, L4: N/A — nothing is refused here; a body shorter than its grid is refused by its reader after.
})
