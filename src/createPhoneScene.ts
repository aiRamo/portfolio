import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { phoneApps } from './phoneApps'
import { phoneMotionAt, phoneTransitionDuration } from './phoneMotion.mjs'
import { createPhoneScreen, iconXs, iconY, iconSize } from './phoneScreen'
import { createFramePacer, phoneDamping } from './frameSchedule.mjs'
import { sceneMetrics } from './sceneMetrics'

export type PhoneSettings = { selected: number; request: number; active: boolean; reduced: boolean }
export type PhoneController = { update: () => void; dispose: () => void }

function roundedShape(width: number, height: number, radius: number) {
  const shape = new THREE.Shape(), x = -width / 2, y = -height / 2
  shape.moveTo(x + radius, y)
  shape.lineTo(x + width - radius, y); shape.quadraticCurveTo(x + width, y, x + width, y + radius)
  shape.lineTo(x + width, y + height - radius); shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  shape.lineTo(x + radius, y + height); shape.quadraticCurveTo(x, y + height, x, y + height - radius)
  shape.lineTo(x, y + radius); shape.quadraticCurveTo(x, y, x + radius, y)
  return shape
}
const loadImage = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const image = new Image()
  image.onload = () => resolve(image)
  image.onerror = () => reject(new Error(`Unable to load phone asset: ${src}`))
  image.src = src
})

export async function createPhoneScene(host: HTMLDivElement, settings: { current: PhoneSettings }, signal: AbortSignal, report: (phase: string) => void, select: (index: number) => void): Promise<PhoneController | null> {
  const images = await Promise.all(phoneApps.map(async app => {
    const [screen, icon] = await Promise.all([loadImage(app.screenshot), loadImage(app.icon)])
    return { screen, icon }
  }))
  if (signal.aborted) return null
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  renderer.setClearColor(0, 0)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.25
  host.appendChild(renderer.domElement)
  const scene = new THREE.Scene(), phone = new THREE.Group()
  scene.add(phone)
  const camera = new THREE.PerspectiveCamera(35, 1, .1, 40)
  const room = new RoomEnvironment(), generator = new THREE.PMREMGenerator(renderer)
  const environment = generator.fromScene(room, .04)
  scene.environment = environment.texture
  room.dispose(); generator.dispose()
  scene.add(new THREE.HemisphereLight('#f1f7ff', '#667081', 2.6))
  const key = new THREE.DirectionalLight('#fff4df', 3.4); key.position.set(-4, 5, 7); scene.add(key)
  const rim = new THREE.DirectionalLight('#9fccff', 2.5); rim.position.set(4, 1, -2); scene.add(rim)
  const metal = new THREE.MeshStandardMaterial({ color: '#9ca5af', metalness: 1, roughness: .23 })
  const glass = new THREE.MeshPhysicalMaterial({ color: '#080b10', roughness: .15, metalness: .2, clearcoat: 1 })
  const body = new THREE.Mesh(new THREE.ExtrudeGeometry(roundedShape(2.72, 5.72, .35), { depth: .23, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: .018, bevelThickness: .018, curveSegments: 12 }), metal)
  body.position.z = -.13; phone.add(body)
  const front = new THREE.Mesh(new THREE.ShapeGeometry(roundedShape(2.67, 5.67, .33), 18), glass)
  front.position.z = .132; phone.add(front)
  const back = new THREE.Mesh(new THREE.ShapeGeometry(roundedShape(2.65, 5.65, .32), 12), new THREE.MeshStandardMaterial({ color: '#323b46', metalness: .65, roughness: .3, side: THREE.DoubleSide }))
  back.position.z = -.15; phone.add(back)
  for (const [x, y, length] of [[-1.385, 1.28, .2], [-1.385, .7, .47], [-1.385, .06, .47], [1.385, .62, .72]]) {
    const button = new THREE.Mesh(new THREE.BoxGeometry(.055, length, .11), metal)
    button.position.set(x, y, -.005); phone.add(button)
  }
  const screen = createPhoneScreen(renderer, images)
  const geometry = new THREE.ShapeGeometry(roundedShape(2.48, 5.29, .26), 18)
  const positions = geometry.attributes.position, uvs = geometry.attributes.uv
  for (let i = 0; i < positions.count; i++) uvs.setXY(i, positions.getX(i) / 2.48 + .5, positions.getY(i) / 5.29 + .5)
  const display = new THREE.Mesh(geometry, screen.material)
  display.position.z = .155; phone.add(display)
  const island = new THREE.Mesh(new THREE.ShapeGeometry(roundedShape(.7, .16, .08), 12), new THREE.MeshBasicMaterial({ color: '#06080c' }))
  island.position.set(0, 2.46, .17); phone.add(island)
  const lens = new THREE.Mesh(new THREE.CircleGeometry(.031, 20), new THREE.MeshPhysicalMaterial({ color: '#192f49', metalness: .7, roughness: .06, clearcoat: 1 }))
  lens.position.set(.25, 2.46, .175); phone.add(lens)

  const pacer = createFramePacer(), metrics = sceneMetrics(renderer, host)
  let active = -1, target = -1, request = 0, from = -1, elapsed = phoneTransitionDuration, frame = 0, disposed = false, lost = false, clock = 0, lastPhase = ''
  let prepared = false, dirty = true
  let pointerX = 0, pointerY = 0, rotationX = .055, rotationY = -.25
  const paint = () => {
    const motion = target < 0 ? { phase: 'home', app: 0, tap: 0 } : phoneMotionAt(elapsed, from >= 0)
    const index = motion.phase === 'closing' ? from : target
    const showingApp = motion.phase === 'closing' || motion.phase === 'opening' || motion.phase === 'app'
    screen.update(target, index, showingApp ? motion.app : -1, motion.tap, showingApp && index === 0)
    if (lastPhase !== motion.phase) { lastPhase = motion.phase; host.dataset.phonePhase = motion.phase; report(motion.phase) }
    if (motion.phase === 'app') { active = target; host.dataset.phoneApp = phoneApps[target].id }
  }
  const render = () => {
    phone.rotation.set(rotationX, rotationY, -.018)
    phone.position.y = settings.current.reduced ? 0 : Math.sin(clock * .65) * .028
    if (!prepared || disposed || lost) return
    metrics?.begin(performance.now())
    renderer.render(scene, camera)
    metrics?.end()
  }
  const tick = (now: number) => {
    frame = 0
    if (disposed || lost || !settings.current.active || document.hidden) return
    const delta = pacer.step(now, 60, dirty)
    if (delta === null) { frame = requestAnimationFrame(tick); return }
    dirty = false; clock += delta
    if (request !== settings.current.request) {
      request = settings.current.request
      if (target !== settings.current.selected) {
        from = elapsed >= phoneTransitionDuration ? active : -1
        target = settings.current.selected; elapsed = 0
        host.dataset.phoneApp = ''; lastPhase = ''
        paint()
      }
    }
    if (elapsed < phoneTransitionDuration) { elapsed = Math.min(phoneTransitionDuration, elapsed + delta); paint() }
    const reduce = settings.current.reduced
    const tilt = elapsed < phoneTransitionDuration ? Math.sin(elapsed / phoneTransitionDuration * Math.PI) * .1 : 0
    const goalX = .045 + (reduce ? 0 : pointerY * .04), goalY = -.22 + (reduce ? 0 : pointerX * .12) + tilt
    const damping = phoneDamping(delta)
    rotationX += (goalX - rotationX) * damping
    rotationY += (goalY - rotationY) * damping
    render()
    if (!reduce || elapsed < phoneTransitionDuration || Math.abs(goalX - rotationX) + Math.abs(goalY - rotationY) > .0001) frame = requestAnimationFrame(tick)
  }
  const update = () => {
    if (disposed || lost || !prepared) return
    dirty = true
    if (!settings.current.active || document.hidden) { cancelAnimationFrame(frame); frame = 0; pacer.reset(); return }
    if (!frame) { pacer.reset(); frame = requestAnimationFrame(tick) }
  }
  const resize = () => {
    const width = host.clientWidth, height = host.clientHeight
    if (!width || !height) return
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
    renderer.setSize(width, height); camera.aspect = width / height
    // Fit both dimensions, including the beveled frame and tilt, in a narrow column.
    const halfFov = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
    camera.position.set(0, .02, Math.max(3.05, 1.56 / camera.aspect) / halfFov + .3)
    camera.updateProjectionMatrix(); render()
  }
  const pointer = (event: PointerEvent) => {
    host.style.cursor = hitIcon(event) >= 0 ? 'pointer' : ''
    if (event.pointerType !== 'mouse') return
    const rect = host.getBoundingClientRect(); pointerX = (event.clientX - rect.left) / rect.width * 2 - 1; pointerY = (event.clientY - rect.top) / rect.height * 2 - 1
  }
  const raycaster = new THREE.Raycaster(), pointerPosition = new THREE.Vector2()
  const hitIcon = (event: MouseEvent) => {
    if (!settings.current.active || target >= 0) return -1
    const rect = renderer.domElement.getBoundingClientRect()
    if (!rect.width || !rect.height) return -1
    raycaster.setFromCamera(pointerPosition.set((event.clientX - rect.left) / rect.width * 2 - 1, 1 - (event.clientY - rect.top) / rect.height * 2), camera)
    const hit = raycaster.intersectObject(display)[0]
    if (!hit?.uv) return -1
    const x = hit.uv.x * 900, y = (1 - hit.uv.y) * 1920
    return iconXs.findIndex(left => x >= left && x <= left + iconSize && y >= iconY && y <= iconY + 190)
  }
  const click = (event: MouseEvent) => {
    const index = hitIcon(event)
    if (index >= 0) { select(index); host.style.cursor = '' }
  }
  const leave = () => { pointerX = pointerY = 0; host.style.cursor = '' }
  const observer = new ResizeObserver(resize); observer.observe(host)
  host.addEventListener('pointermove', pointer); host.addEventListener('pointerleave', leave)
  host.addEventListener('click', click)
  document.addEventListener('visibilitychange', update)
  const contextLost = (event: Event) => { event.preventDefault(); lost = true; report('unavailable'); cancelAnimationFrame(frame); frame = 0 }
  renderer.domElement.addEventListener('webglcontextlost', contextLost)
  const controller = { update, dispose: () => {
    if (disposed) return
    disposed = true; cancelAnimationFrame(frame); observer.disconnect()
    host.removeEventListener('pointermove', pointer); host.removeEventListener('pointerleave', leave); document.removeEventListener('visibilitychange', update)
    host.removeEventListener('click', click); host.style.cursor = ''
    renderer.domElement.removeEventListener('webglcontextlost', contextLost)
    const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>()
    phone.traverse(object => { if (object instanceof THREE.Mesh) { geometries.add(object.geometry); for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material) } })
    geometries.forEach(geometry => geometry.dispose()); materials.forEach(material => material.dispose())
    screen.dispose(); environment.dispose(); renderer.dispose(); renderer.domElement.remove()
  } }
  const abort = () => controller.dispose()
  signal.addEventListener('abort', abort, { once: true })
  try {
    paint(); resize()
    await screen.prepare(signal)
    await renderer.compileAsync(scene, camera)
    signal.throwIfAborted()
    if (lost) throw new Error('Phone rendering context was lost')
    prepared = true; render(); update()
    return controller
  } catch (error) { controller.dispose(); throw error }
  finally { signal.removeEventListener('abort', abort) }
}
