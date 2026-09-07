import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { createBirdTraffic, birdPositionAt, MAX_FLOCK_BIRDS } from './birdTraffic.mjs'
import { observerCamera } from './environment.mjs'

/** Closed, faceted birds with independently articulated wings, in two draw calls. */
export function createSkyBirds(scene: THREE.Scene, host: HTMLDivElement) {
  const preview = import.meta.env.DEV && new URLSearchParams(location.search).has('bird-preview')
  const traffic = createBirdTraffic({ preview })
  const group = new THREE.Group()
  group.name = 'Periodic right-to-left bird flock'
  // Lay out a permanent flight corridor above the valley using the opening view.
  // Neither scrolling, pointer drift, nor viewport resizing moves this world frame.
  const home = observerCamera(16 / 9)
  group.position.fromArray(home.position)
  group.quaternion.setFromRotationMatrix(new THREE.Matrix4().lookAt(group.position,
    new THREE.Vector3().fromArray(home.target), new THREE.Vector3(0, 1, 0)))
  const depth = 230
  const halfHeight = depth * Math.tan(THREE.MathUtils.degToRad(home.fov / 2))
  const halfWidth = halfHeight * 16 / 9
  const scale = 1.65
  scene.add(group)
  group.updateMatrixWorld(true)
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .98,
    metalness: 0, flatShading: true, fog: false })
  const bodyGeometry = createBirdBody(), wingGeometry = createBirdWing()
  const bodies = new THREE.InstancedMesh(bodyGeometry, material, MAX_FLOCK_BIRDS)
  const wings = new THREE.InstancedMesh(wingGeometry, material, MAX_FLOCK_BIRDS * 2)
  bodies.name = 'Faceted bird bodies'; wings.name = 'Independently flapping feathered wings'
  for (const mesh of [bodies, wings]) {
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    mesh.frustumCulled = false
    mesh.count = 0
    group.add(mesh)
  }
  const bird = new THREE.Object3D(), wing = new THREE.Object3D()
  const wingMatrix = new THREE.Matrix4()
  const projected = new THREE.Vector3()
  host.dataset.birdModel = 'closed-faceted-body-and-articulated-wings'
  host.dataset.birdDrawCalls = '2'
  return {
    update(dt: number, paused: boolean, camera: THREE.PerspectiveCamera) {
      const state = traffic.advance(dt, !paused)
      group.visible = state.flocks.length > 0
      let count = 0, visible = 0
      for (const flock of state.flocks) {
        const age = state.clock - flock.start
        for (let i = 0; i < flock.count; i++) {
          const point = birdPositionAt(flock, age, i)
          // A little body yaw reveals volume; independent banks and wing phases
          // keep the formation alive without changing its steady leftward course.
          bird.position.set(point.x * halfWidth, point.y * halfHeight, -depth + point.depth)
          bird.rotation.set(.10 * Math.sin(age * .7 + point.phase),
            .22 + Math.sin(age * .35 + point.phase) * .12,
            -flock.slope * .20 + Math.sin(age * .62 + point.phase) * .035)
          bird.scale.setScalar(scale * point.scale)
          bird.updateMatrix()
          bodies.setMatrixAt(count, bird.matrix)
          const beat = age * (6.4 + .17 * Math.sin(point.phase)) + point.phase
          const glide = .72 + .28 * Math.sin(age * .34 + point.phase)
          const flap = Math.sin(beat) * .88 * glide - .12
          for (let side = 0; side < 2; side++) {
            wing.position.set(-.04, .035, 0)
            wing.rotation.set(side ? Math.PI - flap : flap, 0, 0)
            wing.updateMatrix()
            wingMatrix.multiplyMatrices(bird.matrix, wing.matrix)
            wings.setMatrixAt(count * 2 + side, wingMatrix)
          }
          projected.copy(bird.position).applyMatrix4(group.matrixWorld).project(camera)
          if (Math.abs(projected.x) <= 1 && Math.abs(projected.y) <= 1 && Math.abs(projected.z) <= 1) visible++
          count++
        }
      }
      bodies.count = count; wings.count = count * 2
      if (count && group.visible) {
        bodies.instanceMatrix.needsUpdate = true
        wings.instanceMatrix.needsUpdate = true
      }
      host.dataset.birdCount = String(visible)
      host.dataset.birdActive = String(count)
      host.dataset.birdFlocks = String(state.flocks.length)
      host.dataset.birdNext = state.nextIn.toFixed(1)
      host.dataset.birdTime = state.clock.toFixed(3)
    },
  }
}

function coloredPart(geometry: THREE.BufferGeometry, color: string) {
  const result = geometry.index ? geometry.toNonIndexed() : geometry
  if (result !== geometry) geometry.dispose()
  result.deleteAttribute('uv')
  const colors = new Float32Array(result.attributes.position.count * 3), tint = new THREE.Color(color)
  for (let i = 0; i < result.attributes.position.count; i++) tint.toArray(colors, i * 3)
  result.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  return result
}

export function createBirdBody() {
  const parts: THREE.BufferGeometry[] = []
  const ellipsoid = (size: number[], position: number[], color: string, detail = 1) => {
    const geometry = new THREE.IcosahedronGeometry(1, detail)
    geometry.scale(size[0], size[1], size[2])
    geometry.translate(position[0], position[1], position[2])
    parts.push(coloredPart(geometry, color))
  }
  ellipsoid([.40, .19, .17], [.015, 0, 0], '#765335')
  ellipsoid([.25, .105, .145], [-.13, -.11, 0], '#ac956f')
  ellipsoid([.19, .17, .145], [-.34, .105, 0], '#88603c')
  ellipsoid([.105, .08, .135], [-.395, .085, 0], '#453e32', 0)
  // Tapered beak, two eyes and a broad tail are visible around the full model.
  const beak = new THREE.ConeGeometry(.059, .19, 5)
  beak.rotateZ(Math.PI / 2); beak.translate(-.575, .07, 0)
  parts.push(coloredPart(beak, '#3c3426'))
  for (const side of [-1, 1]) {
    ellipsoid([.025, .025, .014], [-.395, .145, side * .125], '#171b18', 0)
    ellipsoid([.017, .012, .008], [-.407, .157, side * .135], '#e4c9a0', 0)
  }
  const tail = new THREE.CylinderGeometry(.145, .035, .43, 4, 1)
  tail.rotateZ(-Math.PI / 2); tail.scale(1, .24, 1)
  tail.translate(.51, .015, 0)
  parts.push(coloredPart(tail, '#504a39'))
  const result = mergeGeometries(parts)!
  parts.forEach(part => part.dispose())
  return result
}

export function createBirdWing() {
  // A closed wing with a raised spar and individual primary-feather points.
  // Equal top/bottom thickness permits mirrored articulation without a negative
  // instance scale, keeping lighting and face winding correct on either wing.
  const outline = [
    [-.18,.08], [-.29,.36], [-.26,.61], [-.15,.83], [.06,1.15],
    [.15,1.03], [.20,1.13], [.26,.98], [.31,1.04], [.34,.86],
    [.39,.90], [.38,.70], [.40,.68], [.31,.40], [.23,.11],
  ]
  const positions: number[] = [], colors: number[] = []
  const palette = ['#6f5639', '#97734a', '#b28a51', '#493e2d', '#66513a'].map(color => new THREE.Color(color))
  const vertex = (x: number, y: number, z: number, color: THREE.Color) => {
    positions.push(x, y, z); colors.push(color.r, color.g, color.b)
  }
  for (let i = 0; i < outline.length; i++) {
    const a = outline[i], b = outline[(i + 1) % outline.length]
    const tint = palette[i > 3 && i < 12 ? 3 + i % 2 : i % 3]
    // Both sides join at the feather perimeter: a watertight beveled lens.
    vertex(.055,.058,.44,tint); vertex(a[0],0,a[1],tint); vertex(b[0],0,b[1],tint)
    vertex(.055,-.058,.44,tint); vertex(b[0],0,b[1],tint); vertex(a[0],0,a[1],tint)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.computeVertexNormals()
  return geometry
}
