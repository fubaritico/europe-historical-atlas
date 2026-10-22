import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { pickLocale } from '@europe-historical-atlas/core/i18n/locale'

import { createLocaleStore } from '../../i18n/localeStore'
import { LocaleProvider } from '../components/LocaleProvider'

import { WORKBENCH_ENTRIES } from './entries'
import { Workbench } from './Workbench'

// The same sheets as the application, through the same module — so a plate here is lit by exactly the
// cascade the editor uses. See `styles/sheets.ts`.
import '../styles/sheets'

/**
 * The workbench's entry: a second page of the Cartographer, served by the same `pnpm dev:cartographer`
 * at `/workbench.html`, where a piece of the chrome is mounted alone, on literal data, to be built and
 * judged without loading the backdrop.
 *
 * **Why not Storybook** — the dev's call on 2026-10-09, after weighing it: `CLAUDE.md` refuses it for this
 * repository, its dependencies would land in the committed lockfile even with its config ignored, and its
 * own preview page would need our stylesheet order copied into it — the order that two layers' worth of
 * traps showed does not forgive a copy. This page goes through `styles/sheets`, so it cannot drift.
 *
 * **Named `entry.tsx`, not `workbench.tsx`**: macOS's file system ignores case, so the latter *is*
 * `Workbench.tsx`, the component — writing one overwrote the other on 2026-10-09.
 *
 * **Not shipped**: Vite builds `index.html` alone unless told otherwise, so `pnpm build` never sees this
 * page. It is a development tool, in the same family as the atlas's dev panel.
 *
 * A missing `#root` throws, for the reason `main.tsx` gives.
 */
const container = document.getElementById('root')

if (!container) {
  throw new Error('Workbench: #root is missing from workbench.html — nothing to mount into.')
}

// The browser's language, as the application takes it (`main.tsx`).
const locale = pickLocale(navigator.languages)
document.documentElement.lang = locale

createRoot(container).render(
  <StrictMode>
    <LocaleProvider store={createLocaleStore(locale)}>
      <Workbench entries={WORKBENCH_ENTRIES} />
    </LocaleProvider>
  </StrictMode>
)
