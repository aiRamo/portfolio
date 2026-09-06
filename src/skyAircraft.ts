import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { createAirTraffic, flightPositionAt, flightFrameAt, aircraftLightsAt, CONTRAIL_SECONDS } from './airTraffic.mjs'
import { mix, smooth } from './terrainMath.mjs'

type Flight = ReturnType<ReturnType<typeof createAirTraffic>['advance']>['flights'][number]

/** Tiny aircraft and dissipating twin trails, rendered in the distant sky behind the page. */
export function createSkyAircraft(scene: THREE.Scene, host: HTMLDivElement) {
  const preview = import.meta.env.DEV && new URLSearchParams(location.search).has('flight-preview')
  const traffic = createAirTraffic({ preview })
  const visuals = new Map<number, ReturnType<typeof createAircraftVisual>>()
  return {
    update(dt: number, pan: number, paused: boolean, night: number, twilight: number, camera: THREE.PerspectiveCamera, pixelRatio: number) {
      const inSky = pan >= .995
      const state = traffic.advance(dt, !paused)
      const fade = smooth((pan - .92) / .075)
      const activeIds = new Set(state.flights.map(flight => flight.id))
      for (const [id, visual] of visuals) if (!activeIds.has(id)) {
        visual.dispose()
        visuals.delete(id)
      }
      let count = 0
      for (const flight of state.flights) {
        let visual = visuals.get(flight.id)
        if (!visual) {
          visual = createAircraftVisual(scene)
          visuals.set(flight.id, visual)
        }
        const age = state.clock - flight.start
        visual.update(flight, age, fade, night, twilight, camera, pixelRatio, host)
        const point = flightPositionAt(flight, age)
        if (inSky && age <= flight.duration && point.x >= -1 && point.x <= 1) count++
      }
      host.dataset.aircraftCount = String(count)
      host.dataset.aircraftActive = String(state.flights.length)
      host.dataset.aircraftNext = state.nextIn.toFixed(1)
      host.dataset.aircraftTime = state.clock.toFixed(3)
    },
  }
}

function createAircraftVisual(scene: THREE.Scene) {
  const group = new THREE.Group()
  group.visible = false
  scene.add(group)
  const airframe = new THREE.Group()
  group.add(airframe)

  const fuselage = new THREE.CapsuleGeometry(.065, 1.62, 3, 6)
  fuselage.rotateZ(-Math.PI / 2)
  const surfaces = new THREE.BufferGeometry()
  surfaces.setAttribute('position', new THREE.Float32BufferAttribute([
    .22,0,0, -.40,.85,0, -.64,.85,0, .22,0,0, -.64,.85,0, -.30,0,0,
    .22,0,0, -.64,-.85,0, -.40,-.85,0, .22,0,0, -.30,0,0, -.64,-.85,0,
    -.62,0,0, -.90,.32,0, -.96,.32,0, -.62,0,0, -.96,-.32,0, -.90,-.32,0,
    -.65,0,0, -.88,0,.30, -.97,0,0,
  ], 3))
  surfaces.computeVertexNormals()
  // Match attribute sets before merging the small silhouette.
  fuselage.deleteAttribute('uv')
  const hullParts = fuselage.toNonIndexed()
  const hull = mergeGeometries([hullParts, surfaces])
  fuselage.dispose(); hullParts.dispose(); surfaces.dispose()
  const bodyMaterial = new THREE.MeshBasicMaterial({ color: '#e1ebf1', transparent: true, opacity: .15,
    side: THREE.DoubleSide, depthWrite: false, fog: false, toneMapped: false })
  const body = new THREE.Mesh(hull, bodyMaterial)
  body.renderOrder = 3
  airframe.add(body)

  const lightsGeometry = new THREE.BufferGeometry()
  lightsGeometry.setAttribute('position', new THREE.Float32BufferAttribute([
    -.40,.85,.03, -.40,-.85,.03, -.91,0,.05, -.05,0,.09, -.42,.82,.05, -.42,-.82,.05,
  ], 3))
  lightsGeometry.setAttribute('color', new THREE.Float32BufferAttribute([
    1,.09,.05, .06,1,.35, .85,.91,1, 1,.04,.015, .86,.94,1, .86,.94,1,
  ], 3))
  lightsGeometry.setAttribute('kind', new THREE.Float32BufferAttribute([0,0,0,1,2,2], 1))
  const lightsMaterial = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, depthTest: false, vertexColors: true, toneMapped: false,
    blending: THREE.AdditiveBlending,
    uniforms: { night: { value: 0 }, navigation: { value: .75 }, beacon: { value: 0 }, strobe: { value: 0 }, pixelRatio: { value: 1 }, visibility: { value: 1 } },
    vertexShader: `attribute float kind; uniform float pixelRatio; varying vec3 tint; varying float lightKind;
      void main(){tint=color;lightKind=kind;gl_PointSize=(kind>1.5?7.:5.5)*pixelRatio;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `uniform float night;uniform float navigation;uniform float beacon;uniform float strobe;uniform float visibility;varying vec3 tint;varying float lightKind;
      void main(){float r=length(gl_PointCoord-.5)*2.;float halo=exp(-r*r*5.5);float core=1.-smoothstep(.02,.28,r);
      float pulse=lightKind>1.5?strobe:lightKind>.5?beacon:navigation;
      gl_FragColor=vec4(tint,(core*.95+halo*.48)*pulse*night*visibility);}`,
  })
  const lights = new THREE.Points(lightsGeometry, lightsMaterial)
  lights.frustumCulled = false
  lights.renderOrder = 4
  airframe.add(lights)

  const segments = 64, verticesPerTrail = (segments + 1) * 2
  const positions = new Float32Array(verticesPerTrail * 2 * 3)
  const uv = new Float32Array(verticesPerTrail * 2 * 2), indices: number[] = []
  for (let trail = 0; trail < 2; trail++) for (let i = 0; i <= segments; i++) {
    const a = trail * verticesPerTrail + i * 2
    uv.set([i / segments, -1, i / segments, 1], a * 2)
    if (i < segments) indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
  }
  const trailGeometry = new THREE.BufferGeometry()
  trailGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage))
  trailGeometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  trailGeometry.setIndex(indices)
  const trailMaterial = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, depthTest: false, side: THREE.DoubleSide, toneMapped: false,
    uniforms: { night: { value: 0 }, twilight: { value: 0 }, opacity: { value: 1 }, seed: { value: 0 } },
    vertexShader: `varying vec2 trailUV;void main(){trailUV=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `varying vec2 trailUV;uniform float night;uniform float twilight;uniform float opacity;uniform float seed;
      void main(){float age=trailUV.x;float edge=exp(-trailUV.y*trailUV.y*3.5)*(1.-smoothstep(.7,1.,abs(trailUV.y)));
      float broken=.82+.18*sin(age*83.+seed)*sin(age*37.-seed);
      float fade=pow(1.-age,1.55)*smoothstep(0.,.035,age);
      vec3 tint=mix(vec3(.94,.97,1.),vec3(.36,.48,.68),night);tint=mix(tint,vec3(1.,.74,.51),twilight*.4);
      gl_FragColor=vec4(tint,edge*fade*broken*mix(.40,.055,night)*opacity);}`,
  })
  const contrails = new THREE.Mesh(trailGeometry, trailMaterial)
  contrails.frustumCulled = false
  contrails.renderOrder = 2
  group.add(contrails)

  return {
    update(flight: Flight, age: number, fade: number, night: number, twilight: number, camera: THREE.PerspectiveCamera, pixelRatio: number, host: HTMLDivElement) {
      group.visible = fade > 0
      if (!group.visible) return
      const depth = 280, halfHeight = depth * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)), halfWidth = halfHeight * camera.aspect
      const pixel = halfHeight * 2 / host.clientHeight
      // Roughly nine pixels long on a desktop: the wake is easier to see than the airframe.
      const scale = pixel * (host.clientWidth < 760 ? 3.6 : 4.5)
      const point = flightPositionAt(flight, age)
      const { forward, normal, angle } = flightFrameAt(flight, camera.aspect)
      group.position.copy(camera.position); group.quaternion.copy(camera.quaternion)
      airframe.position.set(point.x * halfWidth, point.y * halfHeight, -depth)
      airframe.rotation.z = angle
      airframe.scale.setScalar(scale)
      airframe.visible = age <= flight.duration
      const pulse = aircraftLightsAt(age)
      lightsMaterial.uniforms.night.value = night
      lightsMaterial.uniforms.navigation.value = pulse.navigation
      lightsMaterial.uniforms.beacon.value = pulse.beacon
      lightsMaterial.uniforms.strobe.value = pulse.strobe
      lightsMaterial.uniforms.pixelRatio.value = pixelRatio
      lightsMaterial.uniforms.visibility.value = fade
      bodyMaterial.opacity = mix(.17,.035,night) * fade
      trailMaterial.uniforms.night.value = night
      trailMaterial.uniforms.twilight.value = twilight
      trailMaterial.uniforms.opacity.value = fade
      trailMaterial.uniforms.seed.value = flight.seed
      for (let trail = 0; trail < 2; trail++) for (let i = 0; i <= segments; i++) {
        const history = i / segments * CONTRAIL_SECONDS
        const emitted = Math.max(0, Math.min(flight.duration, age - history))
        const sample = flightPositionAt(flight, emitted)
        const spread = pixel * (.40 + (history / CONTRAIL_SECONDS) ** 1.6 * 3.8)
        const drift = Math.sin(emitted * .72 + flight.seed) * pixel * 2.4 * (history / CONTRAIL_SECONDS) ** 2
        const across = (trail ? -.24 : .24) * scale + drift
        const x = sample.x * halfWidth - forward.x * .25 * scale + normal.x * across
        const y = sample.y * halfHeight - forward.y * .25 * scale + normal.y * across
        const a = (trail * verticesPerTrail + i * 2) * 3
        positions.set([
          x - normal.x * spread, y - normal.y * spread, -depth,
          x + normal.x * spread, y + normal.y * spread, -depth,
        ], a)
      }
      trailGeometry.attributes.position.needsUpdate = true
    },
    dispose() {
      scene.remove(group)
      hull.dispose(); lightsGeometry.dispose(); trailGeometry.dispose()
      bodyMaterial.dispose(); lightsMaterial.dispose(); trailMaterial.dispose()
    },
  }
}
