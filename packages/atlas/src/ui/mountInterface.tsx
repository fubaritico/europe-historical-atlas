import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { AtlasInterface } from './components/AtlasInterface'

import type { AtlasInterfaceProps } from './components/AtlasInterface'

/** A mounted interface. */
export interface MountedInterface {
  /** Unmount it, and take its element off the page. */
  dispose(): void
}

/**
 * Mount the atlas's React interface beside the canvas, in an element of its own appended to the host — never around
 * the canvas, which is not a React component (the dev, 2026-11-01). `StrictMode` stays on in development, so an effect
 * whose cleanup leaves something behind shows at once.
 * @param host - where the interface's element goes — the document body
 * @param props - what the interface needs
 * @returns its teardown
 */
export function mountInterface(host: HTMLElement, props: AtlasInterfaceProps): MountedInterface {
  const element = document.createElement('div')
  element.className = 'atlas-interface-root'
  host.append(element)
  const root = createRoot(element)
  root.render(
    <StrictMode>
      <AtlasInterface {...props} />
    </StrictMode>
  )
  return {
    dispose(): void {
      root.unmount()
      element.remove()
    },
  }
}
