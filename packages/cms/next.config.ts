import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { withPayload } from '@payloadcms/next/withPayload'

import type { NextConfig } from 'next'

/**
 * Next config of the contribution tool — Payload's, plus `core`, which ships TypeScript sources (its `exports` point at
 * `src/*.ts`) and so has to be compiled by Next like this package's own files. Turbopack's root is the workspace, so it
 * sees `core` beside this package; `agentRules` off, because Next would otherwise write its own `AGENTS.md` and
 * `CLAUDE.md` here, beside the repository's.
 */
const nextConfig: NextConfig = {
  transpilePackages: ['@europe-historical-atlas/core'],
  turbopack: { root: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..') },
  agentRules: false,
  // The tool has no page of its own at the root: `/` goes to the admin, where everything is.
  redirects: () => Promise.resolve([{ source: '/', destination: '/admin', permanent: false }]),
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
