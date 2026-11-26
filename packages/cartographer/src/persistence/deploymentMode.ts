/**
 * Whether the Cartographer runs on the author's machine or online — the dev's rule, 2026-11-25 (CARTO-498): *the
 * address decides*. On the machine, a polity is added to the CMS of that machine and the base exported by hand (the
 * flow offline); online, a contribution goes through a pull request (REPO-533).
 *
 * Read once, at the composition root, and handed down: nothing else reads the address to decide. It steers the
 * interface only — online, the server is what refuses a contributor a gesture he has no right to.
 */

/** Where the Cartographer runs. */
export type DeploymentMode = 'offline' | 'online'

/** The names a page served from this very machine carries — the same as the dev server's `LOOPBACK_HOST`. */
const LOOPBACK_NAMES: ReadonlySet<string> = new Set(['localhost', '127.0.0.1', '[::1]'])

/**
 * Where the Cartographer runs, from the name of the host its page was served from.
 * @param hostname - `location.hostname`
 * @returns `offline` on this machine, `online` anywhere else
 */
export function deploymentModeOf(hostname: string): DeploymentMode {
  return LOOPBACK_NAMES.has(hostname) ? 'offline' : 'online'
}
