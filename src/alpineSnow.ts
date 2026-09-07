import * as THREE from 'three'
import snowUrl from './generated/alpine-snow.png'

const width = 1536, height = 768
let snowData: Uint8Array | undefined

export async function prepareAlpineSnow(signal: AbortSignal) {
  if (snowData) return
  const response = await fetch(snowUrl, { signal })
  if (!response.ok) throw new Error('Unable to load the snow surface')
  const bitmap = await createImageBitmap(await response.blob(), { colorSpaceConversion: 'none' })
  try {
    signal.throwIfAborted()
    if (bitmap.width !== width || bitmap.height !== height) throw new Error('Invalid snow surface dimensions')
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height
    const context = canvas.getContext('2d', { willReadFrequently: true })!
    context.drawImage(bitmap, 0, 0)
    const pixels = context.getImageData(0, 0, width, height).data
    const data = new Uint8Array(width * height)
    for (let i = 0; i < data.length; i++) data[i] = pixels[i * 4]
    snowData = data
  } finally { bitmap.close() }
}

/** Preserve the original single-channel data texture, orientation, and filtering. */
export function alpineSnowTexture() {
  if (!snowData) throw new Error('Snow surface must be prepared before creating the terrain material')
  const texture = new THREE.DataTexture(snowData, width, height, THREE.RedFormat)
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.needsUpdate = true
  return texture
}
