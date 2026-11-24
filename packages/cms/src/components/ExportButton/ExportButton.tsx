'use client'

import { Button, toast } from '@payloadcms/ui'
import { useRef, useState } from 'react'

import { runExport } from './exportClient'

/**
 * « Exporter la base », at the top right of every page of the admin (`admin.components.actions`, CMS-499): runs the
 * export `pnpm export:content` runs, and says what it wrote — or which record it refused and why, nothing written.
 * Greyed and saying so while it runs; a second click before the screen greys it is held by a ref, set on the click
 * itself (review QUAL-002). It does not commit the files.
 * @returns the button
 */
export function ExportButton() {
  const [running, setRunning] = useState(false)
  const inFlight = useRef(false)

  const exportBase = async () => {
    if (inFlight.current) {
      console.warn('[CMS] « Exporter la base » clicked while an export runs: ignored')
      return
    }
    inFlight.current = true
    setRunning(true)
    try {
      const answer = await runExport()
      if (answer.ok) toast.success(answer.message)
      else toast.error(answer.message)
    } finally {
      inFlight.current = false
      setRunning(false)
    }
  }

  return (
    <Button
      buttonStyle="secondary"
      size="small"
      margin={false}
      disabled={running}
      onClick={() => {
        void exportBase()
      }}
    >
      {running ? 'Export en cours…' : 'Exporter la base'}
    </Button>
  )
}
