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
 * Phase 0.1 bootstrap — validate the render pipeline with a placeholder before the real relief lands:
 * renderer + scene + camera + animation loop + resize, plus the dev overlays (Stats + lil-gui).
 */
function bootstrap(): void {
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

  scene.add(new AmbientLight(0xffffff, 0.6))
  const sun = new DirectionalLight(0xffffff, 1.2)
  sun.position.set(5, 8, 3)
  scene.add(sun)

  const placeholder = new Mesh(
    new BoxGeometry(1.5, 1.5, 1.5),
    new MeshStandardMaterial({ color: '#8a5a2b' }) // brown (vintage palette)
  )
  scene.add(placeholder)

  const params: DevParams = { rotationSpeed: 0.6, wireframe: false }
  const gui = new GUI({ title: 'europe-map · dev' })
  gui.add(params, 'rotationSpeed', 0, 3, 0.05).name('rotation speed')
  gui.add(params, 'wireframe').onChange((value: boolean) => {
    placeholder.material.wireframe = value
  })

  const stats = new Stats()
  document.body.appendChild(stats.dom)

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
  })

  const timer = new Timer()
  const tick = (): void => {
    timer.update()
    const delta = timer.getDelta()
    placeholder.rotation.y += params.rotationSpeed * delta
    controls.update()
    renderer.render(scene, camera)
    stats.update()
    requestAnimationFrame(tick)
  }
  tick()
}

bootstrap()
