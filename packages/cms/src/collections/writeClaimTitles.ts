import { linkLabel, titleLabel } from '../fields/claimTitles'
import { relationId } from '../fields/relationId'

import type { EventDateFields } from '../fields/historicalDate'
import type { CollectionBeforeChangeHook } from 'payload'

/**
 * Write a title's name from its holder's and its territory's French names and its date, at every save — never typed.
 * A title missing one of them is left to those fields' own rules, which refuse the save.
 * @param args - Payload's hook arguments
 * @param args.data - the title as it will be saved, every field filled from the saved one on an update
 * @param args.req - the request, whose Payload reads the person and the territory
 * @returns the data, with its name
 */
export const writeTitleLabel: CollectionBeforeChangeHook = async ({ data, req }) => {
  const person = relationId(data.person)
  const territory = relationId(data.territory)
  const date = data.date as EventDateFields | undefined
  if (person === null || territory === null || date === undefined) return data
  const [holder, land] = await Promise.all([
    req.payload.findByID({ collection: 'people', id: person, depth: 0, locale: 'fr', req }),
    req.payload.findByID({ collection: 'territories', id: territory, depth: 0, locale: 'fr', req }),
  ])
  const label = titleLabel(holder.name, land.name, date)
  return label === null ? data : { ...data, label }
}

/**
 * Write a link's name from its two titles' names, at every save — « … → personne » for a link that says the title
 * answers to no one, whose suzerain is then emptied: a sovereign link holds no suzerain, so nothing reads it two ways.
 * A link naming a suzerain it does not hold is left to the suzerain's own rule, which refuses the save.
 * @param args - Payload's hook arguments
 * @param args.data - the link as it will be saved
 * @param args.req - the request, whose Payload reads the titles
 * @returns the data, with its name
 */
export const writeLinkLabel: CollectionBeforeChangeHook = async ({ data, req }) => {
  const vassal = relationId(data.vassal)
  if (vassal === null) return data
  const below = named(
    await req.payload.findByID({ collection: 'titles', id: vassal, depth: 0, req })
  )
  if (data.answersTo === 'no-one') return { ...data, suzerain: null, label: linkLabel(below, null) }
  const suzerain = relationId(data.suzerain)
  if (suzerain === null) return data
  const above = named(
    await req.payload.findByID({ collection: 'titles', id: suzerain, depth: 0, req })
  )
  return { ...data, label: linkLabel(below, above) }
}

/**
 * A title's name, which its own save always writes — one without it is a title this code did not save.
 * @param title - the title read
 * @param title.id - its id
 * @param title.label - its name
 * @returns the name
 * @throws when it has none, so the link is refused rather than named after nothing
 */
function named(title: { id: number | string; label?: string | null }): string {
  if (title.label === undefined || title.label === null || title.label === '') {
    throw new Error(
      `[CMS] the title ${String(title.id)} has no name: save it again before linking it`
    )
  }
  return title.label
}
