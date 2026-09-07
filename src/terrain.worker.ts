import { prepareTerrain } from './prepareTerrain.mjs'
self.onmessage = () => {
  try {
    const data = prepareTerrain()
    const transfer = [...Object.values(data.attributes).map(attribute => attribute.array.buffer), data.index.buffer]
    self.postMessage({ data }, { transfer })
  } catch (error) { self.postMessage({ error: error instanceof Error ? error.message : String(error) }) }
}
