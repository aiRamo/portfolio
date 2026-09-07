import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { DEER_PLACEMENTS } from './deer.mjs'

export const SHORE_PINES = {
  mature: [
    { x: -13.5, z: -25.8, scale: 1, yaw: .4 },
    { x: 22.2, z: -14.4, scale: .91, yaw: 2.6 },
    // A close, staggered group in the clearing immediately right of the cabin.
    { x: 7.6, z: -32.8, scale: .94, yaw: 1.3 },
    { x: 10.5, z: -31.6, scale: .82, yaw: 4.1 },
  ],
  juvenile: [
    { x: 22.8, z: -9.7, scale: .62, yaw: .8 },
    { x: 24.6, z: -13.8, scale: .78, yaw: 1.7 },
    { x: 28.6, z: -14.0, scale: .60, yaw: 3.1 },
    { x: 33.5, z: -12.4, scale: .94, yaw: 4.7 },
    { x: 32.8, z: -8.4, scale: .72, yaw: .3 },
    { x: 23.9, z: -2.4, scale: .62, yaw: 2.2 },
    { x: 25.3, z: .6, scale: .53, yaw: 4.2 },
    { x: 28.6, z: -.6, scale: .72, yaw: 1.3 },
    { x: -8.8, z: -30.3, scale: .74, yaw: 1.1 },
    { x: -14.7, z: -20.6, scale: .81, yaw: 3.4 },
    { x: -17.4, z: -16.7, scale: .52, yaw: 5.2 },
    { x: -19.8, z: 37.2, scale: .88, yaw: 2.9 },
    { x: 21.7, z: 34.9, scale: .69, yaw: 1.8 },
    { x: 17.9, z: 43.8, scale: .54, yaw: 5.8 },
    { x: 5.5, z: -29.8, scale: 1.15, yaw: 2.2 },
  ],
}

/** Keep scattered rocks and old procedural trees out of the new trunks and herd. */
export function shoreHabitatClearAt(x: number, z: number) {
  return [...SHORE_PINES.mature, ...SHORE_PINES.juvenile].some(p => Math.hypot(x - p.x, z - p.z) < .8)
    || DEER_PLACEMENTS.some(p => Math.hypot(x - p.x, z - p.z) < 1.15)
}

/** Both Blender models are instanced: all nineteen shore trees cost two draw calls. */
export async function createShorePines(sampleHeight: (x: number, z: number) => number, signal: AbortSignal) {
  const group = new THREE.Group(); group.name = 'Mature and juvenile shoreline pines'
  const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>()
  try {
    for (const kind of ['mature', 'juvenile'] as const) {
      signal.throwIfAborted()
      const response = await fetch(`${import.meta.env.BASE_URL}models/shore-pine-${kind}.glb`, { signal })
      if (!response.ok) throw new Error(`Shore pine failed: ${response.status}`)
      const buffer = await response.arrayBuffer(); signal.throwIfAborted()
      const asset = await new GLTFLoader().parseAsync(buffer, '')
      asset.scene.updateMatrixWorld(true)
      const parts: THREE.BufferGeometry[] = []
      asset.scene.traverse(object => {
        if (!(object instanceof THREE.Mesh)) return
        geometries.add(object.geometry)
        for (const m of Array.isArray(object.material) ? object.material : [object.material]) materials.add(m)
        const part = object.geometry.clone().applyMatrix4(object.matrixWorld)
        parts.push(part); geometries.add(part)
      })
      signal.throwIfAborted()
      const geometry = mergeGeometries(parts)
      geometries.add(geometry)
      const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .97, flatShading: true })
      materials.add(material)
      const trees = new THREE.InstancedMesh(geometry, material, SHORE_PINES[kind].length)
      trees.name = `Blender ${kind} shore pines`; trees.castShadow = trees.receiveShadow = true
      const dummy = new THREE.Object3D()
      SHORE_PINES[kind].forEach((tree, i) => {
        dummy.position.set(tree.x, sampleHeight(tree.x, tree.z) - .045, tree.z)
        dummy.rotation.set(0, tree.yaw, 0)
        dummy.scale.set(tree.scale * (i % 2 ? .91 : 1), tree.scale, tree.scale)
        dummy.updateMatrix(); trees.setMatrixAt(i, dummy.matrix)
      })
      trees.computeBoundingSphere(); group.add(trees)
      // The parent valley owns the final two meshes; release authoring copies now.
      for (const g of [...geometries]) if (g !== geometry) { g.dispose(); geometries.delete(g) }
      for (const m of [...materials]) if (m !== material) { m.dispose(); materials.delete(m) }
      geometries.delete(geometry); materials.delete(material)
    }
    return group
  } catch (error) {
    group.traverse(object => {
      if (object instanceof THREE.Mesh) {
        geometries.add(object.geometry)
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material)
      }
      if (object instanceof THREE.InstancedMesh) object.dispose()
    })
    geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose())
    throw error
  }
}
