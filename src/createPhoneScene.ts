import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { phoneApps } from './phoneApps'
import { phoneMotionAt, phoneTransitionDuration } from './phoneMotion.mjs'

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
  const screenCanvas = document.createElement('canvas'); screenCanvas.width = 900; screenCanvas.height = 1920
  const context = screenCanvas.getContext('2d')!
  const texture = new THREE.CanvasTexture(screenCanvas); texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy())
  const geometry = new THREE.ShapeGeometry(roundedShape(2.48, 5.29, .26), 18)
  const positions = geometry.attributes.position, uvs = geometry.attributes.uv
  for (let i = 0; i < positions.count; i++) uvs.setXY(i, positions.getX(i) / 2.48 + .5, positions.getY(i) / 5.29 + .5)
  const display = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }))
  display.position.z = .155; phone.add(display)
  const island = new THREE.Mesh(new THREE.ShapeGeometry(roundedShape(.7, .16, .08), 12), new THREE.MeshBasicMaterial({ color: '#06080c' }))
  island.position.set(0, 2.46, .17); phone.add(island)
  const lens = new THREE.Mesh(new THREE.CircleGeometry(.031, 20), new THREE.MeshPhysicalMaterial({ color: '#192f49', metalness: .7, roughness: .06, clearcoat: 1 }))
  lens.position.set(.25, 2.46, .175); phone.add(lens)

  const iconXs = [155, 380, 605], iconY = 690, iconSize = 140
  let active = -1, target = -1, request = 0, from = -1, elapsed = phoneTransitionDuration, previous = 0, frame = 0, disposed = false, lost = false, clock = 0, lastPhase = ''
  let pointerX = 0, pointerY = 0, rotationX = .055, rotationY = -.25
  const roundedRect = (x: number, y: number, width: number, height: number, radius: number) => { context.beginPath(); context.roundRect(x, y, width, height, radius) }
  const home = (tap: number) => {
    const gradient = context.createLinearGradient(0, 0, 900, 1920)
    gradient.addColorStop(0, '#153d55'); gradient.addColorStop(.5, '#244b60'); gradient.addColorStop(1, '#12202f')
    context.fillStyle = gradient; context.fillRect(0, 0, 900, 1920)
    for (let i = 0; i < 4; i++) {
      context.fillStyle = ['#52717c', '#385d6b', '#234353', '#193342'][i]
      context.beginPath(); context.moveTo(-50, 1500 + i * 55)
      context.bezierCurveTo(120, 950 + i * 135, 270, 1410, 430, 1130 + i * 120)
      context.bezierCurveTo(590, 920 + i * 160, 660, 1290, 950, 1080 + i * 175)
      context.lineTo(950, 1950); context.lineTo(-50, 1950); context.fill()
    }
    context.textAlign = 'center'; context.fillStyle = '#f5f7f4'
    context.font = '500 100px sans-serif'; context.fillText('9:41', 450, 355)
    context.font = '30px sans-serif'; context.fillText('Built for the world outside.', 450, 419)
    phoneApps.forEach((app, i) => {
      const press = i === target && tap > 0 ? 1 - Math.sin(tap * Math.PI) * .1 : 1
      const size = iconSize * press, x = iconXs[i] + (iconSize - size) / 2, y = iconY + (iconSize - size) / 2
      context.save(); roundedRect(x, y, size, size, 32); context.clip(); context.drawImage(images[i].icon, x, y, size, size); context.restore()
      context.font = '25px sans-serif'; context.fillStyle = '#fff'; context.fillText(app.short, iconXs[i] + 70, iconY + 185)
      if (i === target && tap > 0) {
        context.strokeStyle = `rgba(255,255,255,${Math.sin(tap * Math.PI) * .85})`; context.lineWidth = 4
        context.beginPath(); context.arc(iconXs[i] + 70, iconY + 70, 82 + tap * 32, 0, Math.PI * 2); context.stroke()
        context.fillStyle = `rgba(255,255,255,${Math.sin(tap * Math.PI) * .4})`
        context.beginPath(); context.arc(iconXs[i] + 70, iconY + 70, 28, 0, Math.PI * 2); context.fill()
      }
    })
    context.fillStyle = '#ffffff19'; roundedRect(190, 1680, 520, 100, 50); context.fill()
    context.font = '25px sans-serif'; context.fillStyle = '#e1ecee'; context.fillText('Three apps. One connected world.', 450, 1741)
  }
  const appWindow = (index: number, progress: number) => {
    const x = iconXs[index] * (1 - progress), y = iconY * (1 - progress)
    const width = iconSize + (900 - iconSize) * progress, height = iconSize + (1920 - iconSize) * progress
    context.save(); roundedRect(x, y, width, height, 34 * (1 - progress)); context.clip()
    context.translate(x, y); context.scale(width / 900, height / 1920)
    context.fillStyle = index === 0 ? '#ffffff' : index === 1 ? '#1e1e1e' : '#131b22'; context.fillRect(0, 0, 900, 1920)
    const image = images[index].screen, fit = Math.min(900 / image.width, 1770 / image.height)
    context.drawImage(image, (900 - image.width * fit) / 2, 108 + (1770 - image.height * fit) / 2, image.width * fit, image.height * fit)
    context.restore()
  }
  const paint = () => {
    const motion = target < 0 ? { phase: 'home', app: 0, tap: 0 } : phoneMotionAt(elapsed, from >= 0)
    home(motion.tap)
    if (motion.phase === 'closing' && from >= 0) appWindow(from, motion.app)
    if (motion.phase === 'opening' || motion.phase === 'app') appWindow(target, motion.app)
    const light = (motion.phase === 'app' || motion.phase === 'opening') && target === 0 || motion.phase === 'closing' && from === 0
    context.fillStyle = light ? '#15212a' : '#f6f8f9'; context.textAlign = 'left'; context.font = 'bold 24px sans-serif'; context.fillText('9:41', 65, 75)
    context.fillRect(754, 53, 9, 18); context.fillRect(768, 47, 9, 24); context.fillRect(782, 40, 9, 31)
    context.strokeStyle = context.fillStyle; context.lineWidth = 3; roundedRect(812, 45, 45, 23, 5); context.stroke(); context.fillRect(818, 51, 30, 11)
    roundedRect(315, 1896, 270, 8, 4); context.fill()
    texture.needsUpdate = true
    if (lastPhase !== motion.phase) { lastPhase = motion.phase; host.dataset.phonePhase = motion.phase; report(motion.phase) }
    if (motion.phase === 'app') { active = target; host.dataset.phoneApp = phoneApps[target].id }
  }
  const render = () => {
    phone.rotation.set(rotationX, rotationY, -.018)
    phone.position.y = settings.current.reduced ? 0 : Math.sin(clock * .65) * .028
    renderer.render(scene, camera)
  }
  const tick = (now: number) => {
    frame = 0
    if (disposed || lost || !settings.current.active || document.hidden) return
    const delta = Math.min((now - previous) / 1000, .05); previous = now; clock += delta
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
    rotationX += ((.045 + (reduce ? 0 : pointerY * .04)) - rotationX) * .08
    rotationY += ((-.22 + (reduce ? 0 : pointerX * .12) + tilt) - rotationY) * .08
    render(); frame = requestAnimationFrame(tick)
  }
  const update = () => {
    if (disposed || lost) return
    if (!settings.current.active || document.hidden) { cancelAnimationFrame(frame); frame = 0; return }
    if (!frame) { previous = performance.now(); frame = requestAnimationFrame(tick) }
  }
  const resize = () => {
    const width = host.clientWidth, height = host.clientHeight
    if (!width || !height) return
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
  const raycaster = new THREE.Raycaster()
  const hitIcon = (event: MouseEvent) => {
    if (!settings.current.active || target >= 0) return -1
    const rect = renderer.domElement.getBoundingClientRect()
    if (!rect.width || !rect.height) return -1
    raycaster.setFromCamera(new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, 1 - (event.clientY - rect.top) / rect.height * 2), camera)
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
  paint(); resize(); update()
  return { update, dispose: () => {
    disposed = true; cancelAnimationFrame(frame); observer.disconnect()
    host.removeEventListener('pointermove', pointer); host.removeEventListener('pointerleave', leave); document.removeEventListener('visibilitychange', update)
    host.removeEventListener('click', click); host.style.cursor = ''
    renderer.domElement.removeEventListener('webglcontextlost', contextLost)
    const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>()
    phone.traverse(object => { if (object instanceof THREE.Mesh) { geometries.add(object.geometry); for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material) } })
    geometries.forEach(geometry => geometry.dispose()); materials.forEach(material => material.dispose())
    texture.dispose(); environment.dispose(); renderer.dispose(); renderer.domElement.remove()
  } }
}
