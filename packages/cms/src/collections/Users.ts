import type { CollectionConfig } from 'payload'

/** Who may sign in to the contribution tool. Payload adds the email and the password. */
export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: 'Contributeur', plural: 'Contributeurs' },
  admin: { useAsTitle: 'email' },
  // Two hours, written out (CARTO-567, the dev's rule of 2026-11-26): a session the Cartographer stops prolonging — no
  // gesture for two hours — runs out, and its author signs in again. Payload's default is the same; said, not assumed.
  auth: { tokenExpiration: 7200 },
  fields: [],
}
