import GUI from 'lil-gui'
import {
  AmbientLight,
  BoxGeometry,
  Color,
  DirectionalLight,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  Timer,
  WebGLRenderer,
} from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import Stats from 'three/addons/libs/stats.module.js'

import {
  applyCameraState,
  createSessionStorageCameraStore,
  readCameraState,
} from './camera/cameraState'

/**
 * Dev-tunable parameters, exposed live through the lil-gui panel.
 */
interface DevParams {
  /** Placeholder mesh rotation speed, in radians per second. */
  rotationSpeed: number
  /** Render the placeholder as a wireframe. */
  wireframe: boolean
}

/**
 * Phase 0.1/0.2 bootstrap — renderer + scene + camera + loop + resize + dev overlays, with the camera
 * viewpoint persisted across reloads/HMR (restored synchronously before the first render → zero
 * transition). Returns a teardown that fully disposes the scene (safe HMR, no GPU leak).
 * @returns the teardown function
 */
function bootstrap(): () => void {
  const canvas = document.querySelector<HTMLCanvasElement>('#scene')
  if (!canvas) throw new Error('Canvas #scene not found in index.html')

  const renderer = new WebGLRenderer({ canvas, antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(window.innerWidth, window.innerHeight)

  const scene = new Scene()
  scene.background = new Color('#efe6d2') // parchment placeholder (vintage palette)

  const camera = new PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100)
  camera.position.set(3, 3, 4)

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true

  // Restore the persisted viewpoint BEFORE the first render → zero camera transition on reload/HMR.
  const cameraStore = createSessionStorageCameraStore()
  const persisted = cameraStore.load()
  if (persisted) applyCameraState(camera, controls, persisted)

  const saveCamera = (): void => {
    cameraStore.save(readCameraState(camera, controls))
  }
  controls.addEventListener('end', saveCamera)
  window.addEventListener('beforeunload', saveCamera)

  scene.add(new AmbientLight(0xffffff, 0.6))
  const sun = new DirectionalLight(0xffffff, 1.2)
  sun.position.set(5, 8, 3)
  scene.add(sun)

  const geometry = new BoxGeometry(1.5, 1.5, 1.5)
  const material = new MeshStandardMaterial({ color: '#8a5a2b' }) // brown (vintage palette)
  const placeholder = new Mesh(geometry, material)
  scene.add(placeholder)

  const params: DevParams = { rotationSpeed: 0.6, wireframe: false }
  const gui = new GUI({ title: 'europe-map · dev' })
  gui.add(params, 'rotationSpeed', 0, 3, 0.05).name('rotation speed')
  gui.add(params, 'wireframe').onChange((value: boolean) => {
    material.wireframe = value
  })

  const stats = new Stats()
  document.body.appendChild(stats.dom)

  const onResize = (): void => {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
  }
  window.addEventListener('resize', onResize)

  const timer = new Timer()
  let frame = 0
  const tick = (): void => {
    timer.update()
    placeholder.rotation.y += params.rotationSpeed * timer.getDelta()
    controls.update()
    renderer.render(scene, camera)
    stats.update()
    frame = requestAnimationFrame(tick)
  }
  tick()

  return (): void => {
    saveCamera() // capture the exact current viewpoint before we tear down
    cancelAnimationFrame(frame)
    controls.removeEventListener('end', saveCamera)
    window.removeEventListener('beforeunload', saveCamera)
    window.removeEventListener('resize', onResize)
    controls.dispose()
    gui.destroy()
    stats.dom.remove()
    geometry.dispose()
    material.dispose()
    renderer.dispose()
  }
}

const dispose = bootstrap()

// Vite HMR: tear the old instance down (which persists the viewpoint) then let the module re-run and
// restore it — no full reload, no camera transition.
if (import.meta.hot) {
  import.meta.hot.dispose(dispose)
  import.meta.hot.accept()
}
