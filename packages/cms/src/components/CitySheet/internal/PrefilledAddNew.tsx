import { PlusIcon, Tooltip, useDocumentDrawer } from '@payloadcms/ui'
import { useState } from 'react'

import type { CollectionSlug, Data } from 'payload'

/** What Payload's drawer hands its `onSave` — the record saved, and whether it was just created. */
interface DrawerSave {
  /** The record as saved. */
  readonly doc: { readonly id: number | string }
  /** `create` for a new record. */
  readonly operation: string
}

/**
 * The « + » joined to a relationship field, opening Payload's own drawer **with some of the new record already
 * filled** (CMS-495; the dev, 2026-11-23: the drawer of a name of the time opens on the sheet's place). Payload's own
 * « + » (`elements/AddNewRelation`, 3.92) hands its drawer no initial data, so this one stands in its place: the same
 * classes, the same icon and tooltip, the same drawer (`useDocumentDrawer`), and the same answer — a record created in
 * it becomes the field's value, the drawer staying open on it, as Payload's does.
 * @param props - the collection, the data, the texts, the answer
 * @param props.collection - the collection the record is created in
 * @param props.initialData - what the new record's form opens with — read each time the drawer opens
 *   (`DocumentDrawer/DrawerContent`, 3.92), so a place changed on the sheet is the one the next drawer opens on
 * @param props.label - the button's name and tooltip: « Créer un nom d’époque pour ce lieu »
 * @param props.onCreate - called with the id of the record created
 * @returns the button and its drawer
 */
export function PrefilledAddNew({
  collection,
  initialData,
  label,
  onCreate,
}: {
  collection: CollectionSlug
  initialData: Data
  label: string
  onCreate: (id: number | string) => void
}) {
  const [DocumentDrawer, DocumentDrawerToggler] = useDocumentDrawer({ collectionSlug: collection })
  const [showTooltip, setShowTooltip] = useState(false)

  // Handlers — an update saved in the drawer leaves the field as it is; only a creation chooses
  const handleSave = ({ doc, operation }: DrawerSave) => {
    if (operation === 'create') onCreate(doc.id)
  }

  // Render
  return (
    <div className="relationship-add-new">
      <DocumentDrawerToggler
        className="relationship-add-new__add-button"
        aria-label={label}
        onClick={() => {
          setShowTooltip(false)
        }}
        onMouseEnter={() => {
          setShowTooltip(true)
        }}
        onMouseLeave={() => {
          setShowTooltip(false)
        }}
      >
        <Tooltip className="relationship-add-new__tooltip" show={showTooltip}>
          {label}
        </Tooltip>
        <PlusIcon />
      </DocumentDrawerToggler>
      <DocumentDrawer initialData={initialData} onSave={handleSave} />
    </div>
  )
}
