import * as THREE from 'three'
import { alpineSnowAt } from './alpine.mjs'

const width = 1536, height = 768
let snowData: Uint8Array | undefined

/** Static world-space accumulation: sharper edges without extra geometry or per-frame erosion. */
export function alpineSnowTexture() {
  if (!snowData) {
    snowData = new Uint8Array(width * height)
    for (let row = 0; row < height; row++) for (let column = 0; column < width; column++) {
      const x = -255 + (column + .5) / width * 510
      const z = -340 + (row + .5) / height * 240
      const { potential } = alpineSnowAt(x, z)
      snowData[row * width + column] = Math.round(THREE.MathUtils.clamp(.5 + potential * .5, 0, 1) * 255)
    }
  }
  const texture = new THREE.DataTexture(snowData, width, height, THREE.RedFormat)
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.needsUpdate = true
  return texture
}
