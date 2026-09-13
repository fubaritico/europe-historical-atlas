/**
 * Serializable snapshot of the map camera — the ground target and the zoom level fully determine the pose
 * (yaw is locked north; pitch and distance derive from zoom), so this is all we persist.
 */
export interface MapCameraState {
  /** Ground target `[x, y, z]` (y is always 0). */
  target: [number, number, number]
  /** Zoom level in `[0, 1]` (0 = out, 1 = in). */
  zoom: number
}

/**
 * Pluggable persistence seam for the map camera. Swap the implementation (sessionStorage, an in-memory
 * mock) without touching the controls.
 */
export interface MapCameraStatePort {
  /**
   * Persist a snapshot.
   * @param state - the snapshot to store
   */
  save(state: MapCameraState): void
  /**
   * Read the last persisted snapshot.
   * @returns the stored snapshot, or `null` when absent/unreadable/foreign
   */
  load(): MapCameraState | null
}

/**
 * Runtime shape guard — protects against corrupt/foreign/tampered stored data. Rejects non-finite numbers
 * (`NaN`/`±Infinity`) so a bad restore can never propagate through the clamp/lerp math into the pose.
 * @param value - the parsed JSON value
 * @returns whether `value` is a well-formed {@link MapCameraState}
 */
function isMapCameraState(value: unknown): value is MapCameraState {
  if (typeof value !== 'object' || value === null) return false
  const o = value as Record<string, unknown>
  return (
    Array.isArray(o.target) &&
    o.target.length === 3 &&
    o.target.every((n) => typeof n === 'number' && Number.isFinite(n)) &&
    typeof o.zoom === 'number' &&
    Number.isFinite(o.zoom)
  )
}

/**
 * Create a {@link MapCameraStatePort} backed by `sessionStorage` (survives a full refresh / F5 and HMR).
 * Read/write failures (private mode, quota, corrupt JSON) degrade to a clean no-op / `null`.
 * @param key - the storage key
 * @returns a sessionStorage-backed map camera store
 */
export function createSessionStorageMapCameraStore(
  key = 'europe-map:map-camera'
): MapCameraStatePort {
  return {
    save(state: MapCameraState): void {
      try {
        sessionStorage.setItem(key, JSON.stringify(state))
      } catch (error) {
        console.warn('MapCameraStore: save failed', error)
      }
    },
    load(): MapCameraState | null {
      try {
        const raw = sessionStorage.getItem(key)
        if (raw === null) return null
        const parsed: unknown = JSON.parse(raw)
        return isMapCameraState(parsed) ? parsed : null
      } catch (error) {
        console.warn('MapCameraStore: load failed', error)
        return null
      }
    },
  }
}
