import type { PerspectiveCamera, Vector3 } from 'three'

/**
 * Minimal controls contract this module depends on (interface segregation): just the orbit target and a
 * way to re-sync. Any implementation (OrbitControls, a mock) that exposes these is substitutable.
 */
export interface CameraControls {
  /** The point the camera orbits / looks at, in world space. */
  target: Vector3
  /** Re-sync the controls after the camera or target was mutated externally. */
  update(): void
}

/**
 * NOTE: everything below (CameraState, CameraStatePort, readCameraState, applyCameraState,
 * createSessionStorageCameraStore) is a pose-based viewpoint store, currently NOT wired in production —
 * the live camera is `controls/mapControls` (target + zoom). It is retained for the Milestone 1.4 fly-to
 * feature (push/pop a viewpoint stack). Only `CameraControls` above is consumed today (by mapControls).
 */

/**
 * Serializable snapshot of a viewpoint — enough to restore it byte-for-byte before the first render.
 */
export interface CameraState {
  /** Camera world position `[x, y, z]`. */
  position: [number, number, number]
  /** Camera orientation as a quaternion `[x, y, z, w]`. */
  quaternion: [number, number, number, number]
  /** Perspective vertical field of view, in degrees. */
  fov: number
  /** Orbit target `[x, y, z]`. */
  target: [number, number, number]
}

/**
 * Pluggable persistence seam for the camera viewpoint. Swap the implementation (sessionStorage, an
 * in-memory mock, `import.meta.hot.data`) without touching the consumer.
 */
export interface CameraStatePort {
  /**
   * Persist a viewpoint snapshot.
   * @param state - the snapshot to store
   */
  save(state: CameraState): void
  /**
   * Read the last persisted snapshot.
   * @returns the stored snapshot, or `null` when absent/unreadable
   */
  load(): CameraState | null
}

/**
 * Capture the current viewpoint as a serializable snapshot.
 * @param camera - the perspective camera to read
 * @param controls - the controls providing the orbit target
 * @returns a snapshot of the viewpoint
 */
export function readCameraState(camera: PerspectiveCamera, controls: CameraControls): CameraState {
  return {
    position: [camera.position.x, camera.position.y, camera.position.z],
    quaternion: [
      camera.quaternion.x,
      camera.quaternion.y,
      camera.quaternion.z,
      camera.quaternion.w,
    ],
    fov: camera.fov,
    target: [controls.target.x, controls.target.y, controls.target.z],
  }
}

/**
 * Apply a viewpoint snapshot to a camera + controls, synchronously (call before the first render for a
 * zero-transition restore).
 * @param camera - the perspective camera to mutate
 * @param controls - the controls whose target to restore
 * @param state - the snapshot to apply
 */
export function applyCameraState(
  camera: PerspectiveCamera,
  controls: CameraControls,
  state: CameraState
): void {
  camera.position.set(...state.position)
  camera.quaternion.set(...state.quaternion)
  camera.fov = state.fov
  camera.updateProjectionMatrix()
  controls.target.set(...state.target)
  controls.update()
}

/**
 * Runtime shape guard — protects against corrupt/foreign stored data.
 * @param value - the parsed JSON value
 * @returns whether `value` is a well-formed {@link CameraState}
 */
function isCameraState(value: unknown): value is CameraState {
  if (typeof value !== 'object' || value === null) return false
  const o = value as Record<string, unknown>
  return (
    Array.isArray(o.position) &&
    o.position.length === 3 &&
    Array.isArray(o.quaternion) &&
    o.quaternion.length === 4 &&
    typeof o.fov === 'number' &&
    Array.isArray(o.target) &&
    o.target.length === 3
  )
}

/**
 * Create a {@link CameraStatePort} backed by `sessionStorage` (survives a full page refresh / F5).
 * Read/write failures (private mode, quota, corrupt JSON) degrade to a clean no-op / `null`.
 * @param key - the storage key
 * @returns a sessionStorage-backed camera store
 */
export function createSessionStorageCameraStore(key = 'europe-map:camera'): CameraStatePort {
  return {
    save(state: CameraState): void {
      try {
        sessionStorage.setItem(key, JSON.stringify(state))
      } catch (error) {
        console.warn('CameraStateStore: save failed', error)
      }
    },
    load(): CameraState | null {
      try {
        const raw = sessionStorage.getItem(key)
        if (raw === null) return null
        const parsed: unknown = JSON.parse(raw)
        return isCameraState(parsed) ? parsed : null
      } catch (error) {
        console.warn('CameraStateStore: load failed', error)
        return null
      }
    },
  }
}
