import { mkdirSync, writeFileSync } from 'node:fs'
import { createDeer, createDeerHerd } from '../src/deer.mjs'
import { landscapeGeometry } from '../src/landscape.mjs'
import { createTerrainSampler } from '../src/forest.mjs'

const terrain = landscapeGeometry(), sample = createTerrainSampler(terrain)
const herd = createDeerHerd((x, z) => sample(x, z).height)
const serialize = mesh => {
  mesh.updateMatrixWorld(true)
  return { name: mesh.name, positions: [...mesh.geometry.attributes.position.array],
    normals: [...mesh.geometry.attributes.normal.array], colors: [...mesh.geometry.attributes.color.array],
    matrixWorld: mesh.matrixWorld.toArray(), metadata: mesh.userData }
}
const data = { coordinateSystem: 'THREE_Y_UP', meshes: herd.children.map(serialize),
  studies: Object.fromEntries(Object.entries({ stag: { antlers: true }, doe: { antlers: false },
    grazing: { antlers: false, pose: 'grazing' }, fawn: { antlers: false, fawn: true, size: .59 },
  }).map(([name, options]) => [name, serialize(createDeer(options))])) }
const output = new URL('../outputs/', import.meta.url)
mkdirSync(output, { recursive: true })
writeFileSync(new URL('deer-review.json', output), JSON.stringify(data))
terrain.dispose()
console.log('Exported exact site herd and anatomy studies for Blender.')
