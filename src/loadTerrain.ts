import * as THREE from 'three'
import type { prepareTerrain } from './prepareTerrain.mjs'

export function loadTerrain(signal: AbortSignal) {
  return new Promise<{ geometry: THREE.BufferGeometry; forest: ReturnType<typeof prepareTerrain>['forest'] }>((resolve, reject) => {
    signal.throwIfAborted()
    const worker = new Worker(new URL('./terrain.worker.ts', import.meta.url), { type: 'module' })
    const finish = () => { worker.terminate(); signal.removeEventListener('abort', abort) }
    const abort = () => { finish(); reject(signal.reason) }
    signal.addEventListener('abort', abort, { once: true })
    worker.onerror = () => { finish(); reject(new Error('Terrain preparation failed')) }
    worker.onmessage = ({ data: message }: MessageEvent<{ data?: ReturnType<typeof prepareTerrain>; error?: string }>) => {
      finish()
      if (!message.data) { reject(new Error(message.error || 'Terrain preparation failed')); return }
      const { attributes, index, grid, forest } = message.data
      const geometry = new THREE.BufferGeometry()
      for (const [name, attribute] of Object.entries(attributes)) geometry.setAttribute(name, new THREE.BufferAttribute(attribute.array, attribute.itemSize))
      geometry.setIndex(new THREE.BufferAttribute(index, 1)); geometry.userData = grid
      resolve({ geometry, forest })
    }
    worker.postMessage(null)
  })
}
