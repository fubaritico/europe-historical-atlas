import { useState } from 'react'

import { CityFiltersDialog } from './CityFiltersDialog'
import { FiltersFunnel } from './FiltersFunnel'

import type { CityFiltersProps } from '../cityFiltersProps'

/**
 * The advanced filters (CARTO-370): the funnel at the right of the name filter, and the dialogue it opens. Whether it is
 * open is its own — one writer, one reader, no slice; the holders ticked are the store's.
 * @param props - what the filters offer, the holders ticked, and the callbacks
 * @returns the funnel, and the dialogue while open
 */
export function CityFilters(props: CityFiltersProps) {
  // State
  const [open, setOpen] = useState(false)

  // Handlers
  const handleOpen = () => {
    setOpen(true)
  }
  const handleClose = () => {
    setOpen(false)
  }

  // Render
  return (
    <>
      <FiltersFunnel ticked={props.ticked.size} onOpen={handleOpen} />
      <CityFiltersDialog open={open} onClose={handleClose} {...props} />
    </>
  )
}
