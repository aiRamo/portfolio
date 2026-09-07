import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { SHORE_UNDERSTORY } from './shoreUnderstoryPlacements.mjs'

/** Five original Blender plant models: 32 rooted plants in five draw calls. */
export async function createShoreUnderstory(sampleHeight: (x: number, z: number) => number, signal: AbortSignal) {
  const group = new THREE.Group(); group.name = 'Shoreline willows, cattails, wild roses, heather and sedge'
  const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>()
  const dummy = new THREE.Object3D(), up = new THREE.Vector3(0, 1, 0), normal = new THREE.Vector3()
  const yaw = new THREE.Quaternion(), tint = new THREE.Color()
  try {
    for (const kind of ['shrub', 'cattail', 'flower', 'heather', 'grass'] as const) {
      signal.throwIfAborted()
      const response = await fetch(`${import.meta.env.BASE_URL}models/shore-${kind}.glb`, { signal })
      if (!response.ok) throw new Error(`Shore ${kind} failed: ${response.status}`)
      const buffer = await response.arrayBuffer(); signal.throwIfAborted()
      const asset = await new GLTFLoader().parseAsync(buffer, '')
      asset.scene.updateMatrixWorld(true)
      const parts: THREE.BufferGeometry[] = []
      asset.scene.traverse(object => {
        if (!(object instanceof THREE.Mesh)) return
        geometries.add(object.geometry)
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material)
        const part = object.geometry.clone().applyMatrix4(object.matrixWorld)
        geometries.add(part); parts.push(part)
      })
      signal.throwIfAborted()
      const geometry = mergeGeometries(parts)
      geometries.add(geometry)
      const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .94, flatShading: true })
      materials.add(material)
      const plants = new THREE.InstancedMesh(geometry, material, SHORE_UNDERSTORY[kind].length)
      plants.name = `Blender shoreline ${kind}`
      plants.castShadow = plants.receiveShadow = true
      group.add(plants)
      SHORE_UNDERSTORY[kind].forEach((plant, index) => {
        const { x, z, scale } = plant
        // Follow the local bank plane so the spread of stems meets the ground.
        const dx = sampleHeight(x + .35, z) - sampleHeight(x - .35, z)
        const dz = sampleHeight(x, z + .35) - sampleHeight(x, z - .35)
        normal.set(-dx / .7, 1, -dz / .7).normalize()
        dummy.position.set(x, sampleHeight(x, z) - .015, z)
        dummy.quaternion.setFromUnitVectors(up, normal).multiply(yaw.setFromAxisAngle(up, plant.yaw))
        dummy.scale.set(scale * (index % 3 === 0 ? 1.10 : .95), scale, scale)
        dummy.updateMatrix(); plants.setMatrixAt(index, dummy.matrix)
        tint.setRGB(1 - (index % 3) * .035, 1 - (index % 4) * .018, .92 + (index % 3) * .04)
        plants.setColorAt(index, tint)
      })
      plants.computeBoundingSphere()
      // The parent valley owns the final meshes; release the authoring copies.
      for (const g of [...geometries]) if (g !== geometry) { g.dispose(); geometries.delete(g) }
      for (const m of [...materials]) if (m !== material) { m.dispose(); materials.delete(m) }
      geometries.delete(geometry); materials.delete(material)
    }
    return group
  } catch (error) {
    group.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return
      geometries.add(object.geometry)
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material)
      if (object instanceof THREE.InstancedMesh) object.dispose()
    })
    geometries.forEach(geometry => geometry.dispose()); materials.forEach(material => material.dispose())
    throw error
  }
}
