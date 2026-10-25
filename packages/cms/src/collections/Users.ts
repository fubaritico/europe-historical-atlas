import type { CollectionConfig } from 'payload'

/** Who may sign in to the contribution tool. Payload adds the email and the password. */
export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: 'Contributeur', plural: 'Contributeurs' },
  admin: { useAsTitle: 'email' },
  auth: true,
  fields: [],
}
