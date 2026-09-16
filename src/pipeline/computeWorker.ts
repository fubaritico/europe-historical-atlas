/**
 * The compute worker's entry point. Wiring only — three lines, all of them unreachable from a test,
 * which is exactly why everything else lives in `computeServer` and `inlineCompute`.
 *
 * Note the yield: inside a worker there is no paint to wait for, so phases run back to back. The frame
 * wait belongs to whoever is driving a progress panel, which is never this thread.
 */

import { serveCompute } from './computeServer'
import { createInlineMapCompute } from './inlineCompute'

import type { WorkerScope } from './computeProtocol'

serveCompute(globalThis as unknown as WorkerScope, createInlineMapCompute())
