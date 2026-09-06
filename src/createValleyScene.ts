import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { Reflector } from 'three/addons/objects/Reflector.js'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { atmosphere, celestialAt, skyRotationAt, cloudTimeAt, distanceHazeAt, lightingAt, rockCoverageAt, snowCoverageAt, TARN, seededRandom, noise, mix, smooth } from './environment.mjs'
import { makeSkyMaterial, lakeShader, landscapeFinish } from './valleyShaders'
import { graniteMaterial } from './granite'
import { pineMaterial } from './tundra'
import { createTerrainSampler, distantPineGeometry, forestDensityAt, scatterDistantForest } from './forest.mjs'
import { landscapeGeometry } from './landscape.mjs'
import { CLIFF_MASSES, cliffMassGeometry, talusGeometry } from './cliffs.mjs'
import { scrollJourney, skyCameraAt } from './scrollJourney.mjs'
import { createSkyAircraft } from './skyAircraft'

export type SceneSettings = { paused: boolean; reduced: boolean }

export async function createValleyScene(host: HTMLDivElement, settings: { current: SceneSettings }, onReady: () => void, onError: () => void, onProgress: (progress: number) => void, signal: AbortSignal) {
  const cleanups: (() => void)[] = []
  let disposed = false
  const dispose = () => {
    if (disposed) return
    disposed = true
    signal.removeEventListener('abort', dispose)
    cleanups.reverse().forEach(cleanup => cleanup())
  }
  signal.addEventListener('abort', dispose, { once: true })
  const checkpoint = async (progress: number) => {
    signal.throwIfAborted()
    onProgress(progress)
    // Give React and the browser a paint between expensive procedural stages.
    await new Promise(resolve => setTimeout(resolve, 32))
    signal.throwIfAborted()
  }
  try {
    await checkpoint(8)
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'low-power' })
    cleanups.push(() => { renderer.dispose(); renderer.domElement.remove() })
    renderer.setPixelRatio(Math.min(devicePixelRatio, host.clientWidth < 760 ? 1.3 : 1.6))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.shadowMap.autoUpdate = false
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1
    host.appendChild(renderer.domElement)
    let failed = false
    renderer.debug.onShaderError = (gl, program, vertex, fragment) => {
      failed = true
      console.error('Landscape shader failed', gl.getProgramInfoLog(program), gl.getShaderInfoLog(vertex), gl.getShaderInfoLog(fragment))
      onError()
    }

    const scene = new THREE.Scene()
    cleanups.push(() => {
      const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>()
      scene.traverse(object => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Points || object instanceof THREE.LineSegments) {
          geometries.add(object.geometry)
          const list = Array.isArray(object.material) ? object.material : [object.material]
          list.forEach(material => materials.add(material))
        }
        if (object instanceof THREE.InstancedMesh) object.dispose()
      })
      geometries.forEach(geometry => geometry.dispose()); materials.forEach(material => material.dispose())
    })
    scene.fog = new THREE.FogExp2('#a3b4bc', 0.002)
    const camera = new THREE.PerspectiveCamera(49, 1.6, 0.25, 750)
    const composer = new EffectComposer(renderer)
    cleanups.push(() => { composer.passes.forEach(pass => pass.dispose()); composer.dispose() })
    composer.addPass(new RenderPass(scene, camera))
    const finish = new ShaderPass(landscapeFinish)
    composer.addPass(finish)
    composer.addPass(new OutputPass())
    let random = seededRandom(721)
    const world = new THREE.Group()
    scene.add(world)

    const skyMaterial = makeSkyMaterial()
    const sky = new THREE.Mesh(new THREE.SphereGeometry(450, 32, 20), skyMaterial)
    sky.renderOrder = -10
    scene.add(sky)

    const ambient = new THREE.HemisphereLight('#d5e1e7', '#45443b', 1.6)
    scene.add(ambient)
    const skyBounce = new THREE.DirectionalLight('#ffe7b5', 0.7)
    skyBounce.position.set(-50, 85, 70)
    scene.add(skyBounce)
    const sunLight = new THREE.DirectionalLight('#ffdeb0', 3)
    cleanups.push(() => sunLight.shadow.dispose())
    sunLight.castShadow = true
    sunLight.shadow.mapSize.set(1024, 1024)
    Object.assign(sunLight.shadow.camera, { left: -110, right: 110, top: 110, bottom: -110, near: 1, far: 450 })
    sunLight.shadow.camera.updateProjectionMatrix()
    sunLight.shadow.normalBias = 0.25
    sunLight.target.position.set(0, 0, -45)
    scene.add(sunLight, sunLight.target)
    const moonLight = new THREE.DirectionalLight('#99c1ef', 0)
    moonLight.target.position.copy(sunLight.target.position)
    scene.add(moonLight, moonLight.target)
    await checkpoint(16)

    // A continuous landscape extends beyond every edge of the camera's view.
    const landGeometry = landscapeGeometry()
    const landPositions = landGeometry.attributes.position
    const colors = new Float32Array(landPositions.count * 3)
    const rockCoverage = new Float32Array(landPositions.count)
    const snowCoverage = new Float32Array(landPositions.count)
    const grass = new THREE.Color('#77735b'), heather = new THREE.Color('#786466'), rock = new THREE.Color('#92999b')
    const distantBlue = new THREE.Color('#68869b'), sand = new THREE.Color('#697970')
    const color = new THREE.Color()
    for (let i = 0; i < landPositions.count; i++) {
      const x = landPositions.getX(i), z = landPositions.getZ(i), h = landPositions.getY(i)
      const patch = noise(x * 0.18, z * 0.18)
      const exposedCliff = rockCoverageAt(x, z, h)
      rockCoverage[i] = exposedCliff
      color.copy(grass).lerp(heather, smooth((patch - .38) / .40) * .6)
      color.lerp(rock, Math.max(exposedCliff, smooth((h - 25 + patch * 5) / 20)))
      if (h < 1.2) color.copy(sand)
      color.multiplyScalar(0.88 + noise(x * 0.37, z * 0.37) * 0.18)
      color.toArray(colors, i * 3)
    }
    landGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    landGeometry.setAttribute('rockCoverage', new THREE.BufferAttribute(rockCoverage, 1))
    landGeometry.computeVertexNormals()
    const sampleTerrain = createTerrainSampler(landGeometry)
    const forestFloor = new THREE.Color('#45534a')
    for (let i = 0; i < landPositions.count; i++) {
      const x = landPositions.getX(i), z = landPositions.getZ(i), h = landPositions.getY(i)
      snowCoverage[i] = snowCoverageAt(x, z, h, landGeometry.attributes.normal.getY(i))
      const grove = forestDensityAt(x, z, h, sampleTerrain(x, z).slope)
      color.fromArray(colors, i * 3).lerp(forestFloor, grove * .78)
      color.lerp(distantBlue, distanceHazeAt(x, z) * .75).toArray(colors, i * 3)
      rockCoverage[i] *= 1 - grove * .72
    }
    landGeometry.setAttribute('snowCoverage', new THREE.BufferAttribute(snowCoverage, 1))
    // Track the terrain during the yield before its material and mesh exist.
    let terrainAttached = false
    cleanups.push(() => { if (!terrainAttached) landGeometry.dispose() })
    await checkpoint(36)
    const clayReview = import.meta.env.DEV && new URLSearchParams(location.search).has('clay')
    const land = new THREE.Mesh(landGeometry, clayReview
      ? new THREE.MeshStandardMaterial({ color: '#999999', roughness: .95 })
      : graniteMaterial('#ffffff', true))
    land.castShadow = true
    land.receiveShadow = true
    world.add(land)
    terrainAttached = true
    host.dataset.rockReview = clayReview ? 'clay' : 'granite'
    await checkpoint(61)

    const granite = clayReview ? land.material : graniteMaterial('#aca99f')
    const cliffMeshes = CLIFF_MASSES.map(mass => {
      const mesh = new THREE.Mesh(cliffMassGeometry(mass), granite)
      mesh.castShadow = true; mesh.receiveShadow = true
      mesh.geometry.computeBoundingBox()
      world.add(mesh)
      return mesh
    })
    host.dataset.cliffTriangles = String(cliffMeshes.reduce((sum, mesh) => sum + mesh.geometry.index!.count / 3, 0))
    await checkpoint(72)
    const groundRay = new THREE.Raycaster(), down = new THREE.Vector3(0, -1, 0)
    function rootedSurface(x: number, z: number) {
      let surface = sampleTerrain(x, z)
      groundRay.set(new THREE.Vector3(x, 80, z), down)
      for (const cliff of cliffMeshes) {
        const bounds = cliff.geometry.boundingBox!
        if (x < bounds.min.x || x > bounds.max.x || z < bounds.min.z || z > bounds.max.z) continue
        const hit = groundRay.intersectObject(cliff)[0]
        if (hit && hit.point.y > surface.height) {
          const up = Math.max(.001, Math.min(1, hit.face!.normal.y))
          surface = { height: hit.point.y, slope: Math.sqrt(1 - up * up) / up, normalUp: up }
        }
      }
      return surface
    }
    function forestSurface(x: number, z: number) {
      const surface = sampleTerrain(x, z)
      // Exposed granite volumes stay bare; the dense forest occupies the valleys between them.
      if (CLIFF_MASSES.some(mass => Math.hypot((x - mass.x) / mass.width, (z - mass.z) / mass.depth) < 1.28)) {
        return { ...surface, slope: 2, normalUp: .4 }
      }
      return surface
    }
    const tarnGeometry = new THREE.CircleGeometry(1, 128)
    const tarnPositions = tarnGeometry.attributes.position
    for (let i = 1; i < tarnPositions.count; i++) {
      const angle = Math.atan2(tarnPositions.getY(i), tarnPositions.getX(i))
      const bank = 1.018 + Math.sin(angle * 7) * 0.014 + Math.cos(angle * 11) * 0.009
      tarnPositions.setXY(i, tarnPositions.getX(i) * TARN.width * bank, tarnPositions.getY(i) * TARN.length * bank)
    }
    const lake = new Reflector(tarnGeometry, {
      textureWidth: host.clientWidth < 760 ? 512 : 768,
      textureHeight: host.clientWidth < 760 ? 512 : 768,
      clipBias: 0.003, multisample: 0, shader: lakeShader,
    })
    lake.rotation.x = -Math.PI / 2
    lake.position.set(TARN.x, 0, TARN.z)
    world.add(lake)
    cleanups.push(() => lake.getRenderTarget().dispose())
    const waterMaterial = lake.material as THREE.ShaderMaterial

    // Irregular, layered evergreen crowns keep the forest natural at human scale.
    const crownParts: THREE.BufferGeometry[] = []
    for (let tier = 0; tier < 6; tier++) {
      const radius = 1.22 * (1 - tier * 0.125)
      const geometry = new THREE.ConeGeometry(radius, 2.2 - tier * 0.1, 7)
      const positions = geometry.attributes.position
      for (let i = 0; i < positions.count; i++) {
        if (positions.getY(i) < 0) positions.setY(i, positions.getY(i) - random() * 0.35)
      }
      geometry.rotateY(tier * 1.3)
      geometry.translate(Math.sin(tier * 2) * 0.12, 1.5 + tier * 0.74, 0)
      crownParts.push(geometry)
    }
    const crownGeometry = mergeGeometries(crownParts)
    crownParts.forEach(geometry => geometry.dispose())
    const capacity = 220
    const trees = new THREE.InstancedMesh(crownGeometry, pineMaterial(), capacity)
    const trunkGeometry = new THREE.CylinderGeometry(0.055, 0.18, 5.8, 5)
    trunkGeometry.translate(0, 2.9, 0)
    const trunks = new THREE.InstancedMesh(trunkGeometry, new THREE.MeshStandardMaterial({ color: '#514b39', roughness: 1 }), capacity)
    const dummy = new THREE.Object3D()
    let planted = 0
    function plant(x: number, z: number, scale: number) {
      if (planted >= capacity) return
      const surface = rootedSurface(x, z)
      if (surface.slope > .95) return
      dummy.position.set(x, surface.height - 0.1, z)
      dummy.scale.set(scale * (0.75 + random() * 0.25), scale, scale)
      dummy.rotation.set(0, random() * Math.PI * 2, 0)
      dummy.updateMatrix()
      trees.setMatrixAt(planted, dummy.matrix)
      trunks.setMatrixAt(planted, dummy.matrix)
      color.setHSL(0.37 + random() * 0.06, 0.16 + random() * 0.1, 0.13 + random() * 0.07)
      trees.setColorAt(planted, color)
      planted++
    }
    for (let attempt = 0; planted < capacity - 8 && attempt < 15000; attempt++) {
      const x = (random() - 0.5) * 100, z = -31 + random() * 78
      const { height: h, slope } = sampleTerrain(x, z)
      if (h < 1.5 || h > 25 || slope > .9 || (Math.abs(x) < 18 && z > 30)) continue
      if (noise(x * .035, z * .04) < .36) continue
      if (rockCoverageAt(x, z, h) > .55 && (slope > .9 || random() > .12)) continue
      if (Math.abs(x - 30) < 5 && Math.abs(z + 10) < 5) continue
      plant(x, z, .27 + random() * .25 + smooth((z + 15) / 60) * .18)
    }
    // Nearby trees frame the view, rather than enclosing the lake in a model.
    plant(-17, 42, 1.5 * .6); plant(-22, 28, 1.65); plant(-30, 19, 1.3)
    plant(21, 28, 1.7 * .6) // Right shoreline pine beside the cliff, above the scene caption.
    plant(27, 14, 1.65); plant(16, 42, 1.2)
    trees.count = trunks.count = planted
    trees.castShadow = true; trees.receiveShadow = true; trunks.castShadow = true
    world.add(trees, trunks)

    const distantTrees = scatterDistantForest(forestSurface)
    const distantMaterial = pineMaterial()
    distantMaterial.vertexColors = true
    const distantForest = new THREE.InstancedMesh(distantPineGeometry(), distantMaterial, distantTrees.length)
    const haze = new THREE.Color('#587080')
    distantTrees.forEach((tree, i) => {
      dummy.position.set(tree.x, tree.y, tree.z)
      dummy.scale.set(tree.scale * tree.width, tree.scale, tree.scale * tree.width)
      dummy.rotation.set(0, tree.rotation, 0)
      dummy.updateMatrix()
      distantForest.setMatrixAt(i, dummy.matrix)
      color.setHSL(.39 + tree.tint * .025, .15 + tree.tint * .06, .16 + tree.tint * .055)
      color.lerp(haze, distanceHazeAt(tree.x, tree.z) * .4)
      distantForest.setColorAt(i, color)
    })
    // A single instanced canopy keeps dense distant groves inexpensive in the reflection pass.
    distantForest.receiveShadow = true
    distantForest.computeBoundingSphere()
    world.add(distantForest)
    host.dataset.distantTrees = String(distantTrees.length)
    host.dataset.distantTreeTriangles = String(distantForest.geometry.index!.count / 3)
    await checkpoint(86)

    // Keep the existing rock and star placement stable when vegetation density changes.
    random = seededRandom(11845176)
    const stoneGeometry = talusGeometry()
    const stones = new THREE.InstancedMesh(stoneGeometry, granite, 500)
    let stoneCount = 0
    for (const mass of CLIFF_MASSES) for (let i = 0; i < 125; i++) {
      const angle = (mass.x < 0 ? 0 : Math.PI) + (random() - .5) * 2.9
      const spread = random(), radius = 1.04 + spread * .38
      const x = mass.x + Math.cos(angle) * mass.width * radius
      const z = mass.z + Math.sin(angle) * mass.depth * radius
      const surface = sampleTerrain(x, z)
      if (surface.height < .35 || surface.slope > 1.2) continue
      const scale = (.25 + random() ** 2 * 1.1) * (1 - spread * .5)
      dummy.position.set(x, surface.height + scale * .13, z)
      dummy.scale.set(scale * 1.25, scale * .68, scale)
      dummy.rotation.set((random() - .5) * .4, random() * Math.PI * 2, (random() - .5) * .35)
      dummy.updateMatrix(); stones.setMatrixAt(stoneCount++, dummy.matrix)
    }
    stones.count = stoneCount
    stones.castShadow = true; stones.receiveShadow = true
    world.add(stones)
    for (const [x, z, size] of [[-13, 55, 2.9], [13, 55, 2.5], [-20, 49, 3.6]]) {
      const boulder = new THREE.Mesh(talusGeometry(size * 100, 4), granite)
      boulder.position.set(x, sampleTerrain(x, z).height - 0.1, z)
      boulder.scale.set(size, size * 0.55, size * 0.9)
      boulder.rotation.set(0.2, size, 0.2)
      boulder.receiveShadow = true
      boulder.castShadow = true
      world.add(boulder)
    }

    const bladeGeometry = new THREE.PlaneGeometry(0.055, 0.85, 1, 2)
    bladeGeometry.translate(0, 0.42, 0)
    const blades = new THREE.InstancedMesh(bladeGeometry, new THREE.MeshStandardMaterial({ color: '#a79873', roughness: 1, side: THREE.DoubleSide }), 750)
    let bladeCount = 0
    for (let i = 0; i < 750; i++) {
      const x = -30 + random() * 60, z = 40 + random() * 22
      const height = sampleTerrain(x, z).height
      if (height < .1 || (rockCoverageAt(x, z, height) > .7 && noise(x * .6, z * .6) < .73)) continue
      dummy.position.set(x, height, z)
      dummy.scale.setScalar(0.45 + random() * 0.8)
      dummy.rotation.set(0, random() * 6, (random() - 0.5) * 0.5)
      dummy.updateMatrix()
      blades.setMatrixAt(bladeCount++, dummy.matrix)
    }
    blades.count = bladeCount
    world.add(blades)

    // The actual star field rotates as a single celestial sphere, with short exposure trails.
    const starSphere = new THREE.Group()
    const starPositions: number[] = [], starSizes: number[] = [], starColors: number[] = [], trailPositions: number[] = []
    for (let i = 0; i < 1650; i++) {
      const y = random() * 2 - 1, angle = random() * Math.PI * 2
      const radius = Math.sqrt(1 - y * y)
      const point = new THREE.Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius).multiplyScalar(390)
      starPositions.push(...point.toArray())
      starSizes.push(0.8 + random() ** 4 * 2.5)
      color.setHSL(0.12 + random() * 0.52, 0.13, 0.7 + random() * 0.25)
      starColors.push(color.r, color.g, color.b)
      const tail = point.clone().applyAxisAngle(new THREE.Vector3(0, 0, 1), 0.015)
      trailPositions.push(...point.toArray(), ...tail.toArray())
    }
    const starGeometry = new THREE.BufferGeometry()
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3))
    starGeometry.setAttribute('size', new THREE.Float32BufferAttribute(starSizes, 1))
    starGeometry.setAttribute('color', new THREE.Float32BufferAttribute(starColors, 3))
    const starMaterial = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, vertexColors: true,
      uniforms: { opacity: { value: 0 }, time: { value: 0 }, pixelRatio: { value: renderer.getPixelRatio() } },
      vertexShader: `attribute float size;uniform float pixelRatio;varying vec3 vColor;varying float sparkle;uniform float time;
        void main(){vColor=color;sparkle=.85+.15*sin(time*.7+position.x);gl_PointSize=size*pixelRatio;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader: `uniform float opacity;varying vec3 vColor;varying float sparkle;
        void main(){float point=1.-smoothstep(.05,.5,length(gl_PointCoord-.5));gl_FragColor=vec4(vColor,point*opacity*sparkle);}`,
    })
    starSphere.add(new THREE.Points(starGeometry, starMaterial))
    const trailGeometry = new THREE.BufferGeometry()
    trailGeometry.setAttribute('position', new THREE.Float32BufferAttribute(trailPositions, 3))
    const trailMaterial = new THREE.LineBasicMaterial({ color: '#acbfd5', transparent: true, opacity: 0, depthWrite: false })
    starSphere.add(new THREE.LineSegments(trailGeometry, trailMaterial))
    scene.add(starSphere)
    const aircraft = createSkyAircraft(scene, host)
    await checkpoint(94)
    await document.fonts.ready
    await checkpoint(97)

    const observer = new THREE.Vector3(), look = new THREE.Vector3(), pointer = new THREE.Vector2(), eyeDrift = new THREE.Vector2()
    let needsRender = true, visible = true, aspect = 1.6
    let renderedWidth = 0, renderedHeight = 0
    function resize() {
      const width = host.clientWidth, height = host.clientHeight
      if (!width || !height || (width === renderedWidth && height === renderedHeight)) return
      renderedWidth = width; renderedHeight = height
      aspect = width / height
      const view = skyCameraAt(aspect, scrollJourney.progress)
      observer.fromArray(view.position); look.fromArray(view.target)
      camera.position.copy(observer); camera.lookAt(look)
      camera.aspect = aspect; camera.fov = view.fov; camera.updateProjectionMatrix()
      renderer.setSize(width, height); composer.setSize(width, height)
      finish.uniforms.resolution.value.set(width * renderer.getPixelRatio(), height * renderer.getPixelRatio())
      needsRender = true
    }
    // Buffer resizing clears the canvas. Do it immediately before drawing, never
    // in a ResizeObserver callback between two visible frames.
    const resizeObserver = new ResizeObserver(() => { needsRender = true }); resizeObserver.observe(host)
    cleanups.push(() => resizeObserver.disconnect())
    const intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) needsRender = true }, { rootMargin: '80px' })
    intersection.observe(host)
    cleanups.push(() => intersection.disconnect())
    const onPointer = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return
      const box = host.getBoundingClientRect()
      pointer.set((event.clientX - box.left) / box.width - 0.5, (event.clientY - box.top) / box.height - 0.5)
    }
    const onLeave = () => pointer.set(0, 0)
    const onLost = (event: Event) => { event.preventDefault(); failed = true; onError() }
    addEventListener('pointermove', onPointer); document.documentElement.addEventListener('pointerleave', onLeave)
    renderer.domElement.addEventListener('webglcontextlost', onLost)
    cleanups.push(() => {
      removeEventListener('pointermove', onPointer); document.documentElement.removeEventListener('pointerleave', onLeave)
      renderer.domElement.removeEventListener('webglcontextlost', onLost)
    })
    const sunDirection = new THREE.Vector3(), moonDirection = new THREE.Vector3(), projected = new THREE.Vector3()
    const dayFog = new THREE.Color('#a3b4bc'), duskFog = new THREE.Color('#dd8b70'), nightFog = new THREE.Color('#31475d')
    const daySun = new THREE.Color('#ffd28b'), sunsetSun = new THREE.Color('#ff713b')
    const dayAmbient = new THREE.Color('#dce8ed'), nightAmbient = new THREE.Color('#91aed5')
    let frame = 0, previous = 0, elapsed = 0, ambientTime = 0, lastPhase = -1, lastPan = -1, delivered = false, trailStrength = 0, renderedFrames = 0
    cleanups.push(() => cancelAnimationFrame(frame))
    function render(now: number) {
      frame = requestAnimationFrame(render)
      if (document.hidden || !visible || failed) { previous = now; return }
      if (now - previous < (host.clientWidth < 760 ? 1000 / 30 : 1000 / 50) && !needsRender) return
      const dt = Math.min((now - previous) / 1000, 0.1); previous = now
      resize()
      const { phase, moving } = atmosphere
      const pan = scrollJourney.progress
      // Cloud drift and ripples are intentional environmental motion; Pause still freezes both.
      const frozen = settings.current.paused
      if (frozen && phase === lastPhase && pan === lastPan && trailStrength < .002 && !needsRender) return
      if (!frozen || moving) elapsed += dt
      if (!frozen) ambientTime += dt
      const cloudTime = cloudTimeAt(phase, ambientTime)
      const { night, twilight, golden, stars, altitude } = lightingAt(phase)
      const celestial = celestialAt(phase, aspect)
      sunDirection.fromArray(celestial.sun); moonDirection.fromArray(celestial.moon)
      // Tiny eye movement at the overlook; the ground and mountains never orbit or bob.
      const drift = frozen || settings.current.reduced ? 0 : 1 - smooth(pan)
      const view = skyCameraAt(aspect, pan)
      observer.fromArray(view.position); look.fromArray(view.target)
      eyeDrift.x = THREE.MathUtils.damp(eyeDrift.x, pointer.x * .5 * drift, 3, dt)
      eyeDrift.y = THREE.MathUtils.damp(eyeDrift.y, -pointer.y * .14 * drift, 3, dt)
      camera.position.copy(observer); camera.position.x += eyeDrift.x; camera.position.y += eyeDrift.y
      camera.lookAt(look.x + pointer.x * 1.1 * drift, look.y - pointer.y * 0.6 * drift, look.z)
      camera.updateMatrixWorld()
      aircraft.update(dt, pan, frozen && !moving, night, twilight, camera, renderer.getPixelRatio())
      // Once it is outside the frustum, omit terrain and the lake's reflection pass entirely.
      world.visible = pan < .995
      sky.position.copy(camera.position)
      starSphere.position.copy(camera.position)
      starSphere.rotation.set(0.18, 0.2, skyRotationAt(phase, settings.current.reduced ? 0 : ambientTime))
      starMaterial.uniforms.opacity.value = stars * 0.92
      starMaterial.uniforms.time.value = elapsed
      // Exposure trails fade with actual angular speed, alongside the stars' eased slowdown.
      const angularSpeed = lastPhase < 0 || dt <= 0 ? 0 : Math.max(0, phase - lastPhase) / dt
      trailStrength = .36 * smooth(angularSpeed / 1.3)
      trailMaterial.opacity = stars * trailStrength
      skyMaterial.uniforms.sun.value.copy(sunDirection)
      skyMaterial.uniforms.moon.value.copy(moonDirection)
      skyMaterial.uniforms.night.value = night
      skyMaterial.uniforms.twilight.value = twilight
      skyMaterial.uniforms.golden.value = golden
      skyMaterial.uniforms.time.value = cloudTime
      skyMaterial.uniforms.ascent.value = smooth(pan)
      scene.fog!.color.copy(dayFog).lerp(nightFog, night).lerp(duskFog, twilight * 0.7)
      ambient.color.copy(dayAmbient).lerp(nightAmbient, night)
      ambient.intensity = mix(1.35, 0.55, night)
      skyBounce.color.copy(dayAmbient).lerp(nightAmbient, night).lerp(sunsetSun, twilight * 0.3)
      skyBounce.intensity = mix(0.7, 0.19, night)
      sunLight.color.copy(daySun).lerp(sunsetSun, twilight)
      sunLight.intensity = 2.7 * smooth((altitude + 0.08) / 0.65)
      sunLight.position.copy(sunDirection).multiplyScalar(190).add(sunLight.target.position)
      moonLight.intensity = 0.85 * night * smooth(-altitude / 0.35)
      moonLight.position.copy(moonDirection).multiplyScalar(190).add(moonLight.target.position)
      const source = sunDirection.y > 0 ? sunDirection : moonDirection
      waterMaterial.uniforms.time.value = elapsed
      waterMaterial.uniforms.night.value = night
      waterMaterial.uniforms.twilight.value = twilight
      waterMaterial.uniforms.lightDirection.value.copy(source)
      waterMaterial.uniforms.lightColor.value.copy(sunLight.color).lerp(moonLight.color, night)
      waterMaterial.uniforms.eye.value.copy(camera.position)
      projected.copy(source).multiplyScalar(400).add(camera.position).project(camera)
      document.documentElement.style.setProperty('--light-x', `${(projected.x * 0.5 + 0.5) * 100}%`)
      document.documentElement.style.setProperty('--light-y', `${(0.5 - projected.y * 0.5) * 100}%`)
      renderer.toneMappingExposure = mix(1.0, 0.93, night)
      host.dataset.skyPhase = String(phase)
      host.dataset.night = String(night)
      host.dataset.waterTime = elapsed.toFixed(3)
      host.dataset.cloudTime = cloudTime.toFixed(3)
      host.dataset.ambientTime = ambientTime.toFixed(3)
      host.dataset.starRotation = String(starSphere.rotation.z)
      host.dataset.cameraPan = pan.toFixed(4)
      host.dataset.cameraPitch = (view.pitch * 180 / Math.PI).toFixed(2)
      host.dataset.groundVisible = String(world.visible)
      host.dataset.lightBelow = String(projected.y < -1)
      renderer.shadowMap.needsUpdate = phase !== lastPhase || needsRender
      try {
        composer.render()
        host.dataset.renderedFrames = String(++renderedFrames)
        if (!delivered && !failed) { delivered = true; onProgress(100); onReady() }
      } catch (error) { failed = true; console.error('Landscape rendering failed', error); onError() }
      lastPhase = phase; lastPan = pan; needsRender = false
    }
    frame = requestAnimationFrame(render)

    return dispose
  } catch (error) { dispose(); throw error }
}
