import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { seededRandom, smooth } from './environment.mjs'

// Long side follows the shore; the front turns twenty degrees toward the overlook.
export const CABIN_SITE = { x: -1, z: -36, rotation: -70 * Math.PI / 180, scale: .85 }
const FIRE_SCALE = .85
export const campClearingAt = (x: number, z: number) => Math.hypot((x + 1) / 5.4, (z + 34) / 7.8) < 1

/** Blender-authored cabin, grounded props and a small continuous fire simulation. */
export async function createLakesideCamp(sampleHeight: (x: number, z: number) => number, signal: AbortSignal) {
  signal.throwIfAborted()
  const response = await fetch(`${import.meta.env.BASE_URL}models/lakeside-cabin.glb`, { signal })
  if (!response.ok) throw new Error(`Cabin asset failed: ${response.status}`)
  const buffer = await response.arrayBuffer()
  signal.throwIfAborted()
  // GLTF parsing cannot be cancelled. An abort here can outlive the parent scene,
  // so release the unattached model ourselves before returning control to it.
  const asset = await new GLTFLoader().parseAsync(buffer, '')
  if (signal.aborted) {
    const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>()
    for (const scene of asset.scenes) scene.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return
      geometries.add(object.geometry)
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        materials.add(material)
        for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value)
      }
    })
    geometries.forEach(geometry => geometry.dispose())
    materials.forEach(material => material.dispose())
    textures.forEach(texture => texture.dispose())
    signal.throwIfAborted()
  }
  const group = new THREE.Group(); group.name = 'Lakeside cabin and campfire'
  const cabin = asset.scene
  const glasses = new Set<THREE.MeshStandardMaterial>()
  cabin.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return
    object.castShadow = object.receiveShadow = true
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      if (material instanceof THREE.MeshStandardMaterial && /^Cabin_Glass(?:\.\d+)?$/.test(material.name)) glasses.add(material)
    }
  })
  // A level floor rests on a deep stone footing; never tilt the building with the ground.
  const cosine = Math.cos(CABIN_SITE.rotation), sine = Math.sin(CABIN_SITE.rotation), scale = CABIN_SITE.scale
  const siteHeight = (x: number, z: number) => sampleHeight(CABIN_SITE.x + (cosine * x + sine * z) * scale, CABIN_SITE.z + (-sine * x + cosine * z) * scale)
  const ground = Math.max(...Array.from({ length: 13 }, (_, i) => -3 + i * .5).flatMap(x =>
    Array.from({ length: 7 }, (_, i) => siteHeight(x, -2.4 + i * .8))))
  // The authored floor is at local .65, so leave .12 above the highest ground.
  cabin.position.set(CABIN_SITE.x, ground - .53 * scale, CABIN_SITE.z)
  cabin.scale.setScalar(scale)
  cabin.rotation.y = CABIN_SITE.rotation
  group.add(cabin)

  const footingParts: THREE.BufferGeometry[] = [], stairParts: THREE.BufferGeometry[] = []
  const addBox = (parts: THREE.BufferGeometry[], x: number, y: number, z: number, width: number, height: number, depth: number) => {
    const geometry = new THREE.BoxGeometry(width, height, depth); geometry.translate(x, y, z); parts.push(geometry)
  }
  // Solid masonry carries the porch beams down to this particular slope.
  for (const x of [-2.91, 2.91]) {
    const bottom = (siteHeight(x, 3.86) - cabin.position.y) / scale - .075, top = .42
    if (top <= bottom) continue
    const courses = Math.max(1, Math.ceil((top - bottom) / .25)), height = (top - bottom) / courses
    for (let row = 0; row < courses; row++) {
      const course = new THREE.CylinderGeometry(.36, .375, height + .012, 4)
      course.rotateY(Math.PI / 4 + (row % 2 ? .025 : -.025))
      course.translate(x, bottom + (row + .5) * height, 3.86); footingParts.push(course)
    }
    addBox(footingParts, x, .39, 3.86, .62, .10, .62)
  }
  // Continue the four authored treads until a final normal riser meets the meadow.
  // Every support is separately rooted; the terrain is not flattened under the steps.
  let lastStep = 3
  for (let step = 0; step < 18; step++) {
    const z = 4.08 + step * .31, top = .60 - step * .16
    const groundAtStep = (siteHeight(0, z) - cabin.position.y) / scale
    if (step >= 4) addBox(stairParts, 0, top - .08, z, 1.85, .16, .43)
    for (const x of [-.75, .75]) {
      const bottom = (siteHeight(x, z) - cabin.position.y) / scale - .04, supportTop = top - .07
      if (supportTop > bottom) addBox(stairParts, x, (bottom + supportTop) / 2, z, .14, supportTop - bottom, .25)
    }
    lastStep = step
    if (step >= 3 && top - groundAtStep <= .16) break
  }
  for (const x of [-.79, .79]) {
    const start = new THREE.Vector3(x, .36, 3.87), end = new THREE.Vector3(x, .40 - lastStep * .16, 4.28 + lastStep * .31)
    const direction = end.clone().sub(start), beam = new THREE.BoxGeometry(.16, .19, direction.length())
    beam.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction.normalize()))
    beam.translate(...start.add(end).multiplyScalar(.5).toArray()); stairParts.push(beam)
  }
  const siteMaterials = new Map<string, THREE.Material>()
  cabin.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) siteMaterials.set(material.name.replace(/\.\d+$/, ''), material)
  })
  for (const [parts, material, name] of [
    [footingParts, siteMaterials.get('Granite_1'), 'Grounded porch masonry'],
    [stairParts, siteMaterials.get('Cedar_2'), 'Grounded extended cabin staircase'],
  ] as const) {
    if (parts.length === 0) continue
    const mesh = new THREE.Mesh(mergeGeometries(parts), material ?? new THREE.MeshStandardMaterial({ color: '#675d46', roughness: .95 }))
    parts.forEach(part => part.dispose()); mesh.name = name; mesh.castShadow = mesh.receiveShadow = true; cabin.add(mesh)
  }

  const random = seededRandom(7192), fire = new THREE.Group()
  fire.name = 'Stone fire ring'
  fire.position.set(1.20, sampleHeight(1.20, -28.7) + .06, -28.7)
  fire.scale.setScalar(FIRE_SCALE)
  group.add(fire)
  const stoneParts: THREE.BufferGeometry[] = [], woodParts: THREE.BufferGeometry[] = []
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2
    const rock = new THREE.IcosahedronGeometry(1, 1)
    rock.scale(.30 + random() * .06, .19 + random() * .05, .25)
    rock.rotateY(a + random()); rock.translate(Math.cos(a) * .81, .13, Math.sin(a) * .81)
    stoneParts.push(rock)
  }
  for (let i = 0; i < 5; i++) {
    const log = new THREE.CylinderGeometry(.10, .14, 1.24, 8)
    log.rotateZ(Math.PI / 2); log.rotateY(i * 1.83); log.translate(0, .17 + i * .035, 0)
    woodParts.push(log)
  }
  function merged(parts: THREE.BufferGeometry[], color: string, name: string) {
    const mesh = new THREE.Mesh(mergeGeometries(parts), new THREE.MeshStandardMaterial({ color, roughness: .95 }))
    parts.forEach(p => p.dispose()); mesh.name = name; mesh.castShadow = mesh.receiveShadow = true
    fire.add(mesh); return mesh
  }
  merged(stoneParts, '#777569', 'Twelve weathered hearth stones')
  merged(woodParts, '#30211b', 'Charred crossed firewood')
  const coals = new THREE.Mesh(new THREE.CircleGeometry(.65, 24), new THREE.MeshStandardMaterial({ color: '#381408', emissive: '#ff4409', emissiveIntensity: .65, roughness: 1 }))
  coals.rotation.x = -Math.PI / 2; coals.position.y = .05; fire.add(coals)
  // Two substantial timber seats pick up the fire's moving light and cast real shadows.
  for (const side of [-1, 1]) {
    const bench = new THREE.Mesh(new THREE.CylinderGeometry(.23 * FIRE_SCALE, .27 * FIRE_SCALE, 2.30 * FIRE_SCALE, 10), new THREE.MeshStandardMaterial({ color: '#704526', roughness: .93 }))
    // Both seat axes follow Z, tangent to opposite sides of the circular hearth.
    // This also avoids the previous XYZ Euler combination leaving them end-on.
    bench.rotation.x = Math.PI / 2
    bench.position.set(fire.position.x + side * 1.85 * FIRE_SCALE, 0, fire.position.z)
    const feet = [-.72, .72].map(offset => new THREE.Vector3(0, offset * FIRE_SCALE, 0).applyQuaternion(bench.quaternion).add(bench.position))
    const footGround = feet.map(point => sampleHeight(point.x, point.z))
    bench.position.y = Math.max(...footGround) + .48 * FIRE_SCALE
    bench.castShadow = bench.receiveShadow = true; group.add(bench)
    for (let i = 0; i < feet.length; i++) {
      const bottom = footGround[i] - .035, top = bench.position.y - .10 * FIRE_SCALE
      const foot = new THREE.Mesh(new THREE.CylinderGeometry(.13 * FIRE_SCALE, .16 * FIRE_SCALE, top - bottom, 7), bench.material)
      foot.position.set(feet[i].x, (top + bottom) / 2, feet[i].z)
      foot.castShadow = foot.receiveShadow = true; group.add(foot)
    }
  }

  const flameUniforms = { time: { value: 0 } }
  const flameMaterial = new THREE.ShaderMaterial({
    uniforms: flameUniforms, transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    vertexShader: `uniform float time; varying float h; varying vec3 n;
      void main(){h=position.y;n=normal;vec3 p=position;
        p.x+=sin(time*4.4+h*7.+position.z*3.)*.14*h;
        p.z+=cos(time*3.1+h*9.)*.12*h;
        p.y*=.87+.13*sin(time*6.+position.x*8.);
        gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
    fragmentShader: `varying float h;varying vec3 n;
      void main(){vec3 tint=mix(vec3(1.,.78,.18),vec3(1.,.10,.008),smoothstep(.12,1.3,h));
        float fade=(1.-smoothstep(.55,1.6,h))*.78;
        gl_FragColor=vec4(tint,fade);}`,
  })
  const flameParts: THREE.BufferGeometry[] = []
  for (let f = 0; f < 5; f++) {
    const geometry = new THREE.SphereGeometry(1, 9, 12)
    const p = geometry.attributes.position
    const height = f === 0 ? 1.65 : .70 + random() * .55
    const angle = f * 2.4
    for (let i = 0; i < p.count; i++) {
      const t = (p.getY(i) + 1) / 2
      const radius = (f === 0 ? .37 : .25) * (1 - t * .66)
      p.setXYZ(i, p.getX(i) * radius + Math.cos(angle) * .29 + Math.sin(t * 4 + f) * .12 * t,
        t * height + .22, p.getZ(i) * radius + Math.sin(angle) * .29)
    }
    geometry.computeVertexNormals(); flameParts.push(geometry)
  }
  const flames = new THREE.Mesh(mergeGeometries(flameParts), flameMaterial)
  flameParts.forEach(p => p.dispose()); flames.name = 'Five moving flame tongues'; fire.add(flames)

  const glow = new THREE.PointLight('#ff8d36', 35, 15 * FIRE_SCALE, 2)
  glow.position.copy(fire.position).add(new THREE.Vector3(0, .95 * FIRE_SCALE, 0))
  glow.castShadow = true; glow.shadow.mapSize.set(256, 256)
  glow.shadow.camera.near = .12; glow.shadow.camera.far = 16
  glow.shadow.bias = -.001; glow.shadow.normalBias = .025
  // Geometry and source position are static; intensity can flicker without six new shadow passes.
  glow.shadow.autoUpdate = false; glow.shadow.needsUpdate = true
  group.add(glow)
  const porch = new THREE.PointLight('#ffad55', 0, 8 * scale, 2)
  porch.position.set(0, 2.15, 3).multiplyScalar(scale).applyAxisAngle(new THREE.Vector3(0, 1, 0), CABIN_SITE.rotation).add(cabin.position); group.add(porch)

  const particleCount = 30, positions = new Float32Array(particleCount * 3)
  const ages = new Float32Array(particleCount), sizes = new Float32Array(particleCount)
  const smokeGeometry = new THREE.BufferGeometry()
  smokeGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage))
  smokeGeometry.setAttribute('age', new THREE.BufferAttribute(ages, 1).setUsage(THREE.DynamicDrawUsage))
  smokeGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1).setUsage(THREE.DynamicDrawUsage))
  const smokeMaterial = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, uniforms: { scale: { value: 600 }, night: { value: 0 }, time: { value: 0 } },
    vertexShader: `attribute float age;attribute float size;uniform float scale;varying float a;varying float seed;
      void main(){a=age;seed=position.y;vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=min(220.,size*scale/max(1.,-mv.z));gl_Position=projectionMatrix*mv;}`,
    fragmentShader: `uniform float night;uniform float time;varying float a;varying float seed;
      void main(){vec2 q=gl_PointCoord*2.-1.;float r=length(q);
        float puff=.80+.15*sin(q.x*8.+seed+time*.2)*cos(q.y*7.-seed);
        float alpha=(1.-smoothstep(.15,puff,r))*smoothstep(0.,.14,a)*(1.-smoothstep(.45,1.,a))*.17;
        vec3 tint=mix(vec3(.65,.67,.64),vec3(.28,.34,.42),night);
        tint=mix(tint,vec3(.63,.34,.15),(1.-smoothstep(0.,.25,a))*night*.55);
        gl_FragColor=vec4(tint,alpha);}`,
  })
  const smoke = new THREE.Points(smokeGeometry, smokeMaterial); smoke.frustumCulled = false
  smoke.name = 'Billowing campfire smoke'; fire.add(smoke)

  const sparkPositions = new Float32Array(18 * 3), sparkGeometry = new THREE.BufferGeometry()
  sparkGeometry.setAttribute('position', new THREE.BufferAttribute(sparkPositions, 3).setUsage(THREE.DynamicDrawUsage))
  const sparkMaterial = new THREE.PointsMaterial({ color: '#ffc15f', size: .035, transparent: true, opacity: .80, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })
  const sparks = new THREE.Points(sparkGeometry, sparkMaterial); sparks.frustumCulled = false; fire.add(sparks)

  return {
    group,
    update(time: number, night: number, camera: THREE.PerspectiveCamera, viewportHeight: number, pixelRatio: number) {
      const darkness = smooth((night - .20) / .65)
      for (const material of glasses) { material.emissiveIntensity = .03 + darkness * 2.7; material.color.setRGB(.70, .35, .095).multiplyScalar(1 - darkness * .20) }
      porch.intensity = darkness * 17 * scale * scale
      glow.intensity = (22 + darkness * 46) * FIRE_SCALE * FIRE_SCALE * (1 + .12 * Math.sin(time * 9.7) + .07 * Math.sin(time * 17.3))
      flameUniforms.time.value = time; coals.material.emissiveIntensity = .65 + .18 * Math.sin(time * 4.1)
      smokeMaterial.uniforms.night.value = night; smokeMaterial.uniforms.time.value = time
      smokeMaterial.uniforms.scale.value = FIRE_SCALE * viewportHeight * pixelRatio / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)))
      for (let i = 0; i < particleCount; i++) {
        const age = (time * .072 + i / particleCount) % 1
        positions.set([age * 2.1 + Math.sin(i * 2.4 + age * 7) * age * .44,
          1.05 + age * 6.5, -.15 - age * .70 + Math.cos(i * 3.1 + age * 8) * age * .35], i * 3)
        ages[i] = age; sizes[i] = .38 + age * 2.25
      }
      smokeGeometry.attributes.position.needsUpdate = smokeGeometry.attributes.age.needsUpdate = smokeGeometry.attributes.size.needsUpdate = true
      for (let i = 0; i < 18; i++) {
        const age = (time * (.31 + i * .003) + i * .137) % 1
        sparkPositions.set([Math.sin(i * 4.8 + age * 9) * .27 + age * .35, .32 + age * 2.4, Math.cos(i * 2.7 + age * 7) * .24], i * 3)
      }
      sparkGeometry.attributes.position.needsUpdate = true
    },
    dispose() { glow.shadow.dispose() },
  }
}
