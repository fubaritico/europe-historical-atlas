import type { ReactNode } from 'react'

/** One group of [Check this year]'s list, the body of its tab: what it means, its rows. */
export interface CheckGroupProps {
  /** What the group means and what settles it. */
  help: string
  /** The group's own action, beside its help — « Tout aligner ». */
  action?: ReactNode
  /** The rows, as list items. */
  children: ReactNode
}

/**
 * Render a group's body. Its name is its tab's (the dev, 2026-11-27: the groups in tabs, not one long list), so the
 * group carries no heading of its own; the tab's panel is labelled by it.
 * @param props - the help, the action and the rows
 * @param props.help - what the group means
 * @param props.action - the group's own action, if any
 * @param props.children - the rows
 * @returns the group
 */
export function CheckGroup({ help, action, children }: CheckGroupProps) {
  // Render
  return (
    <div className="map-check__group">
      <div className="map-check__heading">
        <p className="map-check__help">{help}</p>
        {action}
      </div>
      <ul className="map-check__rows">{children}</ul>
    </div>
  )
}
