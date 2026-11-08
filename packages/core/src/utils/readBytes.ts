/**
 * A response's body read chunk by chunk, each chunk counted (ATLAS-333): the atlas's loading bar moves through the
 * download of the relief and the mask instead of jumping at its end.
 *
 * **The total is ours, never the server's** (the dev, 2026-11-08): a host that compresses the file in transit
 * announces the compressed size, so `Content-Length` would count wrong. The size is written beside the file, in its
 * metadata (`bytes`), and checked against the file by a test.
 */

/**
 * Told how far a download has got.
 * @param received - the bytes received so far
 * @param total - the bytes the file holds, from its metadata
 */
export type ByteReport = (received: number, total: number) => void

/** A download to count: the size its metadata states, and where each chunk's count goes. */
export interface CountedDownload {
  /** The bytes the file holds, from its metadata — at least one. */
  readonly total: number
  /** Where each chunk's count goes. */
  readonly report: ByteReport
}

/**
 * Read a response's body, telling each chunk received when the download is counted.
 * @param response - the response, its body not yet read
 * @param counted - the size and the report, when a bar counts this download; read whole and untold otherwise
 * @returns the body's bytes
 */
export async function readBytes(
  response: Response,
  counted?: CountedDownload
): Promise<ArrayBuffer> {
  // A body that cannot be streamed is read whole, untold, as without a count: what it holds is checked the same way
  // after, and the bar's step ends when it is in.
  if (counted === undefined || response.body === null) return response.arrayBuffer()
  const { total, report } = counted
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let received = 0
  // The size told before the first chunk: a bar counting two downloads knows both totals before either moves it
  // (review ARCH-002).
  report(0, total)
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    received += value.byteLength
    report(received, total)
  }
  const bytes = new Uint8Array(received)
  let at = 0
  for (const chunk of chunks) {
    bytes.set(chunk, at)
    at += chunk.byteLength
  }
  return bytes.buffer
}
