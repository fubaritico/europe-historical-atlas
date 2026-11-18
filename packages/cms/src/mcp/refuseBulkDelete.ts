import { APIError } from 'payload'

import type { CollectionBeforeOperationHook } from 'payload'

/**
 * How a request that came through the MCP endpoint is told: the plugin marks it (`@payloadcms/plugin-mcp` 3.92,
 * `endpoints/mcp.js`: `req.payloadAPI = 'MCP'`) — a value Payload's own type does not list.
 */
const MCP_API = 'MCP'

/**
 * Over MCP, a deletion is one record at a time, by its id (CMS-454). The plugin's delete tool also takes a `where`
 * (3.92, `mcp/tools/resource/delete.js`), and one call with a wide filter would empty a collection of thirteen
 * thousand sheets — by a model's mistake, or by a sentence slipped into a text it quotes. Refused here, before
 * anything is read. The dev's own deletions, in the admin, one or many, are left as they are.
 *
 * Payload names both deletions `delete` in this hook (3.92, `collections/operations/delete.js` and `deleteByID.js`):
 * the one by id is told by its `id`.
 * @param hook - Payload's hook arguments
 * @param hook.args - the operation's arguments: `id` for one record, `where` for several
 * @param hook.operation - which operation is starting
 * @param hook.req - the request, marked by the plugin when it came through MCP
 * @returns the arguments, unchanged, when the deletion is let through
 * @throws when a deletion by filter is asked over MCP — said to the model, and kept in the console
 */
export const refuseBulkDeleteOverMcp: CollectionBeforeOperationHook = (hook) => {
  const { args, req } = hook
  // Payload marks one member of this hook's operations as deprecated (`read`), and the lint then reads the whole
  // field as deprecated: `delete` is not.
  // eslint-disable-next-line @typescript-eslint/no-deprecated -- only the `read` member is deprecated (Payload 3.92)
  if (hook.operation !== 'delete') return args
  const overMcp = (req.payloadAPI as string) === MCP_API
  // Read loosely: the types say a deletion by id always has one, and the tool's `id` is optional.
  const { id } = args as { id?: unknown }
  const byId = id !== undefined && id !== null
  if (!overMcp || byId) return args
  console.warn('[CMS] a deletion by filter over MCP was refused: one record at a time, by its id')
  throw new APIError(
    'Par MCP, une suppression se fait une fiche à la fois, par son identifiant (`id`), jamais par un filtre (`where`).',
    400,
    undefined,
    true
  )
}
