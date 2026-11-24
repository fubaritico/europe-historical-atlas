import { APIError } from 'payload'

import type { CollectionBeforeOperationHook } from 'payload'

/**
 * How a request that came through the MCP endpoint is told: the plugin marks it (`@payloadcms/plugin-mcp` 3.92,
 * `endpoints/mcp.js`: `req.payloadAPI = 'MCP'`) — a value Payload's own type does not list.
 */
export const MCP_API = 'MCP'

/**
 * Over MCP, a record leaves one at a time, by its id — deleted (CMS-454) or put in the bin (CMS-508). The plugin's
 * delete and update tools both take a `where` (3.92, `mcp/tools/resource/delete.js`, `update.js`), and one call with a
 * wide filter would empty a collection of thirteen thousand sheets — by a model's mistake, or by a sentence slipped
 * into a text it quotes. Refused here, before anything is read. Since CMS-508 the key no longer deletes at all; the
 * deletion stays refused here all the same, should a key be given it again. An update by filter that does not touch
 * `deletedAt` is left alone, and so are the dev's own gestures, in the admin, one record or many.
 *
 * Payload names both deletions `delete` in this hook, and both updates `update` (3.92, `collections/operations/`): the
 * one by id is told by its `id`.
 * @param hook - Payload's hook arguments
 * @param hook.args - the operation's arguments: `id` for one record, `where` for several, `data` for an update
 * @param hook.operation - which operation is starting
 * @param hook.req - the request, marked by the plugin when it came through MCP
 * @returns the arguments, unchanged, when the gesture is let through
 * @throws when a deletion, or a putting in the bin, by filter is asked over MCP — said to the model, and kept in the
 *   console
 */
export const refuseBulkRemovalOverMcp: CollectionBeforeOperationHook = (hook) => {
  const { args, req } = hook
  // Payload marks one member of this hook's operations as deprecated (`read`), and the lint then reads the whole
  // field as deprecated: `delete` and `update` are not.
  // eslint-disable-next-line @typescript-eslint/no-deprecated -- only the `read` member is deprecated (Payload 3.92)
  const operation = hook.operation
  const overMcp = (req.payloadAPI as string) === MCP_API
  // Read loosely: the types say an operation by id always has one, and the tools' `id` is optional.
  const { id, data } = args as { id?: unknown; data?: { deletedAt?: unknown } }
  const byId = id !== undefined && id !== null
  const removing =
    operation === 'delete' ||
    (operation === 'update' && data?.deletedAt !== undefined && data.deletedAt !== null)
  if (!overMcp || byId || !removing) return args
  console.warn(
    `[CMS] a ${operation} by filter over MCP was refused: one record at a time, by its id`
  )
  throw new APIError(
    'Par MCP, une fiche à la fois, par son identifiant (`id`), jamais par un filtre (`where`) : une mise à la corbeille comme une suppression.',
    400,
    undefined,
    true
  )
}
