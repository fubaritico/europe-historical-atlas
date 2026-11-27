import { Badge } from '@fubaritico/react/Badge'
import { Tabs } from '@fubaritico/react/Tabs'

import { useTranslation } from '../../../hooks/useTranslation'
import { MAP_CHECK_MESSAGES } from '../i18n'

import { ToAlignGroup } from './ToAlignGroup'
import { ToConfirmGroup } from './ToConfirmGroup'
import { ToEnterGroup } from './ToEnterGroup'
import { UntiedGroup } from './UntiedGroup'

import type { MapCheck } from '../hooks/useMapCheck'
import type { ReactNode } from 'react'

/** What the tabs need: the check's result and actions, and the CMS's pages. */
export interface CheckTabsProps {
  /** The map against the CMS, read. */
  alignment: NonNullable<MapCheck['alignment']>
  /** The check, for its actions. */
  check: MapCheck
  /**
   * The address of a territory's page in the CMS's admin.
   * @param id - the territory's number
   * @returns the address
   */
  pageOf: (id: number) => string
}

/** One tab: its value — the key of its label too — its count and its group. */
interface CheckTab {
  /** The tab's value, its panel's, and its label's key. */
  value: 'toAlign' | 'toConfirm' | 'toEnter' | 'untied'
  /** How many polities are in it — a tab with none is not made. */
  count: number
  /** Its group. */
  panel: ReactNode
}

/**
 * The four groups of [Check this year] in tabs (the dev, 2026-11-27: one long list to scroll « fait juste peur ») — a
 * tab only for a group with a polity in it, its count in a badge in the tab's corner (the dev, 2026-11-27: a
 * capsule, wide enough for 125), in the groups' order, the first open. A tab emptied by an alignment goes,
 * and the design system's tabs open its neighbour.
 * @param props - the alignment, the check and the CMS's pages
 * @param props.alignment - the map against the CMS
 * @param props.check - the check's actions
 * @param props.pageOf - the address of a territory's page
 * @returns the tabs, or nothing when every group is empty (the status says so)
 */
export function CheckTabs({ alignment, check, pageOf }: CheckTabsProps) {
  // Context
  const t = useTranslation(MAP_CHECK_MESSAGES)

  // Derived
  const { toAlign, toConfirm, toEnterInCms, untied } = alignment
  const { alignAll, alignOne, openPolity: onOpen } = check
  const tabs: CheckTab[] = [
    {
      value: 'toAlign' as const,
      count: toAlign.length,
      panel: <ToAlignGroup rows={toAlign} onAlignAll={alignAll} onOpen={onOpen} />,
    },
    {
      value: 'toConfirm' as const,
      count: toConfirm.length,
      panel: <ToConfirmGroup rows={toConfirm} onAlign={alignOne} onOpen={onOpen} />,
    },
    {
      value: 'toEnter' as const,
      count: toEnterInCms.length,
      panel: <ToEnterGroup rows={toEnterInCms} pageOf={pageOf} onOpen={onOpen} />,
    },
    {
      value: 'untied' as const,
      count: untied.length,
      panel: <UntiedGroup rows={untied} onOpen={onOpen} />,
    },
  ].filter(({ count }) => count > 0)
  const first = tabs[0]

  // Render
  if (first === undefined) return null

  return (
    <Tabs defaultValue={first.value}>
      <Tabs.List aria-label={t('groups')}>
        {tabs.map(({ value, count }) => (
          <Tabs.Trigger key={value} value={value}>
            {t(value)}
            <Badge size="sm" variant="secondary-dark" className="map-check__count">
              {count}
            </Badge>
          </Tabs.Trigger>
        ))}
      </Tabs.List>
      {tabs.map(({ value, panel }) => (
        <Tabs.Panel key={value} value={value} className="map-check__panel">
          {panel}
        </Tabs.Panel>
      ))}
    </Tabs>
  )
}
