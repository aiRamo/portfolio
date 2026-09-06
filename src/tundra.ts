import * as THREE from 'three'

/** Evergreen needles take their natural color from each tree instance. */
export function pineMaterial() {
  return new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .95, flatShading: true })
}
