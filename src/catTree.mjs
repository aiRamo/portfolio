import { BufferGeometry, Color, Float32BufferAttribute, Group, IcosahedronGeometry, Mesh, MeshStandardMaterial, Vector3 } from 'three'
import { seededRandom, smooth } from './environment.mjs'

// Sculpture coordinates: the two perches extend to -X, with their presentation
// side toward +Z. Everything is geometry, including the markings and ear insets.
class Facets {
  positions = []
  colors = []
  random = seededRandom(916)

  triangle(a, b, c, tint, variation = .055) {
    const color = new Color(tint).multiplyScalar(1 + (this.random() - .5) * variation)
    for (const p of [a, b, c]) {
      this.positions.push(...p)
      this.colors.push(color.r, color.g, color.b)
    }
  }

  solid(center, scale, tint, detail = 1, rotation = 0, paint) {
    const geometry = new IcosahedronGeometry(1, detail)
    const positions = geometry.attributes.position
    const vertices = []
    for (let i = 0; i < positions.count; i++) {
      let x = positions.getX(i) * scale[0], y = positions.getY(i) * scale[1]
      const z = positions.getZ(i) * scale[2]
      vertices.push([center[0] + x * Math.cos(rotation) - y * Math.sin(rotation), center[1] + x * Math.sin(rotation) + y * Math.cos(rotation), center[2] + z])
    }
    for (let i = 0; i < vertices.length; i += 3) {
      const p = vertices.slice(i, i + 3)
      const centroid = p[0].map((v, j) => (v + p[1][j] + p[2][j]) / 3)
      this.triangle(...p, paint?.(centroid) || tint)
    }
    geometry.dispose()
  }

  // Anatomical cross sections, rather than a row of overlapping spheres.
  // x, centre y/z, vertical radius, transverse radius.
  body(sections, tint, paint, sides = 10, ears = []) {
    const rings = sections.map(([x, y, z, ry, rz], row) => Array.from({ length: sides }, (_, j) => {
      const angle = j / sides * Math.PI * 2 + (row % 2 ? .14 : -.075)
      const radius = 1 + .028 * Math.sin(row * 13 + j * 17)
      const stagger = row > 0 && row < sections.length - 1 ? Math.sin(j * 7 + row * 3) * .035 : 0
      return [x + stagger, y + Math.cos(angle) * ry * radius, z + Math.sin(angle) * rz * radius]
    }))
    for (let row = 0; row < rings.length - 1; row++) for (let j = 0; j < sides; j++) {
      // Ear roots replace skull faces and share their boundary vertices. There
      // is no separate ear plate hovering above the curved head underneath.
      if (ears.some(ear => ear.row === row && j >= ear.start && j < ear.start + 2)) continue
      const a = rings[row][j], b = rings[row][(j + 1) % sides]
      const c = rings[row + 1][j], d = rings[row + 1][(j + 1) % sides]
      for (const tri of (row + j) % 2 ? [[a, b, c], [b, d, c]] : [[a, b, d], [a, d, c]]) {
        const p = tri[0].map((v, k) => (v + tri[1][k] + tri[2][k]) / 3)
        this.triangle(...tri, paint?.(p) || tint)
      }
    }
    const first = sections[0].slice(0, 3), last = sections.at(-1).slice(0, 3)
    for (let j = 0; j < sides; j++) {
      this.triangle(first, rings[0][(j + 1) % sides], rings[0][j], tint)
      this.triangle(last, rings.at(-1)[j], rings.at(-1)[(j + 1) % sides], tint)
    }
    for (const ear of ears) {
      const { row, start } = ear
      const boundary = [rings[row][start], rings[row][(start+1)%sides], rings[row][(start+2)%sides],
        rings[row+1][(start+2)%sides], rings[row+1][(start+1)%sides], rings[row+1][start]]
      this.ear(boundary, ear.tip, tint, ear.inner)
    }
  }

  // Parallel-transport frames keep tails/branches coherent around bends. Rings
  // share positions; flat normals reveal triangles without cracks or seams.
  limb(path, tint, sides = 7, paint, bark = false) {
    const points = path.map(p => new Vector3(...p.slice(0, 3)))
    let normal = new Vector3(0, 0, 1)
    const rings = points.map((point, i) => {
      const tangent = points[Math.min(i + 1, points.length - 1)].clone().sub(points[Math.max(0, i - 1)]).normalize()
      normal.addScaledVector(tangent, -normal.dot(tangent)).normalize()
      const binormal = new Vector3().crossVectors(tangent, normal).normalize()
      return Array.from({ length: sides }, (_, j) => {
        const angle = j / sides * Math.PI * 2 + (bark ? Math.sin(i * 1.9) * .12 : 0)
        const radius = path[i][3] * (bark ? 1 + .09 * Math.sin(j * 13 + i * 7) : 1)
        return point.clone().addScaledVector(normal, Math.cos(angle) * radius).addScaledVector(binormal, Math.sin(angle) * radius).toArray()
      })
    })
    for (let i = 0; i < rings.length - 1; i++) for (let j = 0; j < sides; j++) {
      const a = rings[i][j], b = rings[i][(j + 1) % sides], c = rings[i + 1][j], d = rings[i + 1][(j + 1) % sides]
      const color = paint?.(i) || tint
      this.triangle(a, b, c, color, bark ? .23 : .06)
      this.triangle(b, d, c, color, bark ? .23 : .06)
    }
    for (let j = 0; j < sides; j++) {
      this.triangle(points[0].toArray(), rings[0][(j + 1) % sides], rings[0][j], tint)
      this.triangle(points.at(-1).toArray(), rings.at(-1)[j], rings.at(-1)[(j + 1) % sides], paint?.(path.length - 1) || tint)
    }
  }

  ear(boundary, tip, coat, inner) {
    const center = boundary.reduce((sum, p) => sum.map((v, i) => v + p[i]/boundary.length), [0,0,0])
    // The entire root is sewn into the skull. A narrow, bevelled crest keeps
    // the silhouette short and substantial when viewed from either side.
    const top = boundary.map(p => [tip[0] + (p[0]-center[0])*.12, tip[1], tip[2] + (p[2]-center[2])*.15])
    for (let i = 0; i < boundary.length; i++) {
      const next = (i + 1) % boundary.length
      this.triangle(boundary[i], boundary[next], top[next], coat)
      this.triangle(boundary[i], top[next], top[i], coat)
      this.triangle(tip, top[i], top[next], coat)
    }
    // Inset on the outer ear wall, above the fur at the root. Each triangle is
    // inset in its own plane so the lining cannot detach when orbiting.
    const side = tip[2] > 0 ? 2 : 5, next = (side+1)%boundary.length
    for (const face of [[boundary[side],boundary[next],top[next]],[boundary[side],top[next],top[side]]]) {
      const center = face[0].map((v,k)=>(v+face[1][k]+face[2][k])/3)
      const normal = new Vector3().subVectors(new Vector3(...face[1]),new Vector3(...face[0]))
        .cross(new Vector3().subVectors(new Vector3(...face[2]),new Vector3(...face[0]))).normalize()
      const points = face.map(p=>p.map((v,k)=>center[k]+(v-center[k])*.60+normal.getComponent(k)*.002))
      this.triangle(...points, inner)
    }
  }

  mesh(name) {
    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new Float32BufferAttribute(this.positions, 3))
    geometry.setAttribute('color', new Float32BufferAttribute(this.colors, 3))
    geometry.computeVertexNormals()
    geometry.computeBoundingSphere()
    const mesh = new Mesh(geometry, new MeshStandardMaterial({ vertexColors: true, roughness: .92, flatShading: true }))
    mesh.name = name
    mesh.castShadow = true
    mesh.receiveShadow = true
    return mesh
  }
}

const WOOD = '#756250', BLACK = '#2b2a2e', ORANGE = '#df812e', WHITE = '#eee5df'

function tree() {
  const f = new Facets()
  const branch = path => {
    // Uneven intermediate rings give the bark a triangular, carved surface,
    // instead of the long flat panels of an extruded polygon.
    const rings = []
    for (let i = 0; i < path.length - 1; i++) {
      rings.push(path[i])
      if (path[i][3] > .20) {
        const middle = path[i].map((v, k) => v * .52 + path[i + 1][k] * .48)
        middle[0] += .045 * Math.sin(i * 5)
        middle[2] += .065 * Math.cos(i * 4)
        middle[3] *= 1.045
        rings.push(middle)
      }
    }
    rings.push(path.at(-1))
    f.limb(rings, WOOD, 9, undefined, true)
  }
  branch([[.35, -.14, 0, .90], [.52, .65, -.06, .74], [.82, 1.45, -.10, .60], [.90, 2.2, -.15, .55], [1.02, 3.1, -.17, .47], [1.11, 4.02, -.16, .39], [.98, 4.8, -.19, .30], [1.10, 5.57, -.18, .24], [.85, 6.25, -.20, .17], [.75, 6.84, -.20, .14], [.85, 7.18, -.19, .065]])
  // The two broad forked limbs support the cats all the way under their bodies.
  branch([[.75, .80, 0, .65], [-.12, 1.42, .04, .49], [-.90, 1.88, .02, .38], [-1.75, 2.28, .03, .28], [-2.58, 2.54, .02, .20], [-3.37, 2.86, 0, .13], [-4.02, 3.04, -.08, .065], [-4.35, 3.30, -.08, .015]])
  branch([[.91, 2.66, -.04, .48], [.35, 3.58, .01, .43], [-.42, 4.03, 0, .37], [-1.2, 4.43, -.015, .32], [-2.08, 4.71, -.01, .24], [-2.85, 4.94, -.02, .15], [-3.38, 5.20, -.03, .08], [-3.55, 5.31, -.05, .025]])
  branch([[-3.32, 2.85, -.01, .12], [-3.52, 3.22, -.06, .09], [-3.45, 3.60, -.09, .065], [-3.65, 3.94, -.11, .018]])
  branch([[-2.96, 2.72, -.04, .10], [-3.45, 2.61, -.27, .06], [-3.78, 2.59, -.34, .015]])
  branch([[1.01, 4.96, -.21, .25], [1.55, 5.65, -.25, .14], [1.91, 6.30, -.30, .045], [1.94, 6.45, -.32, .012]])
  branch([[.93, 5.51, -.20, .17], [.47, 6.01, -.48, .075], [.37, 6.30, -.50, .025]])
  branch([[1.03, 3.65, -.23, .32], [1.78, 4.25, -.25, .20], [2.24, 4.93, -.24, .09], [2.54, 5.22, -.27, .022]])
  branch([[1.9, 4.43, -.26, .13], [2.55, 4.70, -.25, .075], [2.82, 4.80, -.20, .025]])
  branch([[.74, 1.31, -.27, .38], [1.53, 2.11, -.28, .25], [2.24, 2.52, -.29, .14], [3.04, 2.80, -.24, .075], [3.38, 2.72, -.19, .018]])
  branch([[2.29, 2.56, -.29, .13], [2.42, 3.18, -.32, .065], [2.81, 3.69, -.27, .018]])
  branch([[.65, .22, .03, .30], [1.30, .70, .35, .17], [1.61, 1.46, .35, .065], [1.90, 1.92, .24, .018]])
  branch([[.16, .67, .14, .22], [-.46, 1.21, .34, .15], [-.73, 1.93, .43, .065], [-.59, 2.28, .42, .018]])
  for (const [x, z, bend] of [[-1.2,.7,-.5],[1.7,.7,1.1],[.2,1.23,-.1],[-.8,-1,-.2],[1.4,-.9,1]]) {
    branch([[.45,.55,0,.40],[bend,.19,z*.55,.24],[x,-.13,z,.045]])
  }
  return f.mesh('weathered-forked-tree')
}

function blackCat() {
  const f = new Facets()
  // Low chest, curved back and haunch merge into a single asymmetric outline.
  f.body([[-2.94,2.91,0,.27,.24],[-2.62,3.02,0,.49,.39],[-2.28,2.94,0,.48,.48],[-1.85,2.88,0,.57,.54],[-1.43,2.79,0,.55,.51],[-1.09,2.63,0,.35,.37],[-.96,2.52,0,.13,.20]], BLACK)
  f.solid([-1.55,2.65,.30], [.60,.52,.39], BLACK)
  f.body([[-3.22,3.30,.02,.16,.21],[-3.08,3.39,.015,.29,.33],[-2.94,3.48,0,.40,.39],[-2.55,3.45,0,.39,.36],[-2.40,3.30,0,.22,.23]], BLACK, undefined, 12, [
    {row:2,start:0,tip:[-2.81,3.98,.25],inner:'#75585e'},
    {row:2,start:10,tip:[-2.69,3.98,-.25],inner:'#55464e'},
  ])
  f.solid([-3.16,3.25,.12], [.17,.145,.235], '#252429', 1)
  f.solid([-3.32,3.29,.08], [.05,.045,.065], '#15171c', 0)
  // Narrow eye lies on the near cheek plane, not a large cartoon eyeball.
  f.triangle([-3.12,3.50,.222],[-2.99,3.47,.307],[-3.07,3.465,.270], '#746f48')
  f.solid([-2.83,2.65,.27], [.24,.12,.19], BLACK)
  f.solid([-2.53,2.54,.41], [.27,.12,.19], BLACK)
  f.limb([[-1.12,2.52,-.17,.14],[-.96,2.39,.11,.135],[-1.02,2.26,.40,.125],[-1.34,2.24,.57,.12],[-1.75,2.31,.59,.115],[-2.15,2.42,.56,.10],[-2.50,2.52,.51,.075],[-2.73,2.56,.43,.035]], BLACK, 7)
  return f.mesh('black-cat-lower-perch')
}

function orangeCat() {
  const f = new Facets()
  const bib = ([x,y]) => y < 5.13 + .075 * Math.cos(x * 2) ? WHITE : ORANGE
  // Broad, low-slung torso: its white underside wraps around the supporting
  // branch, with a continuous contact area from the chest to the rump.
  f.body([[-2.60,5.10,0,.38,.46],[-2.12,5.24,0,.72,.73],[-1.64,5.29,0,.93,.98],[-1.15,5.32,0,1.06,1.12],[-.64,5.24,0,1.04,1.07],[-.18,5.04,0,.87,.87],[.10,4.85,0,.52,.51]], ORANGE, bib, 12)
  // Reaching foreleg is behind the near shoulder, white mitten just above the kitten.
  f.limb([[-2.11,5.18,-.13,.24],[-2.44,4.85,.00,.23],[-2.82,4.51,.16,.17],[-3.20,4.14,.31,.125],[-3.37,3.99,.36,.10]], ORANGE, 7, i => i >= 3 ? WHITE : ORANGE)
  f.solid([-3.38,3.99,.37], [.17,.12,.145], WHITE)
  // Tiny folded hocks and mittens disappear into the heavy belly; the body,
  // rather than long hind legs, carries the cat's weight against the perch.
  for (const side of [-1,1]) {
    f.solid([-.24,4.52,.68*side], [.24,.18,.22], ORANGE, 1, .15)
    f.solid([-.41,4.37,.79*side], [.18,.10,.15], WHITE)
  }
  f.limb([[-2.05,5.27,.47,.31],[-1.61,4.98,.67,.29],[-1.93,4.73,.77,.20],[-2.17,4.63,.80,.13]], ORANGE, 8)
  f.solid([-2.22,4.62,.81], [.225,.13,.19], WHITE)
  for (const x of [-2.32,-2.21,-2.10]) f.solid([x,4.58,.93], [.046,.065,.062], '#e1d8d3', 0)
  // Head tilts into the reaching gesture: swept brow, cheeks, short muzzle.
  f.body([[-3.12,5.08,.02,.12,.19],[-2.98,5.19,.01,.27,.34],[-2.80,5.34,0,.43,.44],[-2.38,5.39,0,.45,.46],[-2.16,5.28,0,.33,.34]], ORANGE, ([x,y,z]) => y < 5.17 && z > -.12 && x > -2.94 ? WHITE : ORANGE, 12, [
    {row:2,start:0,tip:[-2.70,5.94,.28],inner:'#c78e77'},
    {row:2,start:10,tip:[-2.50,5.94,-.28],inner:'#a9725a'},
  ])
  // White bib follows the rounded neck rather than sitting on top as a decal.
  f.body([[-2.83,5.06,.015,.12,.20],[-2.53,5.00,0,.24,.37],[-2.25,5.04,0,.34,.46],[-2.04,5.09,0,.22,.34]], WHITE, undefined, 9)
  f.solid([-3.03,5.06,.08], [.19,.105,.19], '#efb87c', 0)
  f.solid([-3.18,5.09,.08], [.065,.045,.07], '#a66d55', 0)
  f.triangle([-2.97,5.34,.28],[-2.77,5.30,.37],[-2.89,5.28,.337], '#5a5536')
  f.triangle([-2.91,5.325,.305],[-2.87,5.30,.341],[-2.91,5.29,.327], '#282d28')
  // Thick tail falls over the near side of the perch, ending in a pale tip.
  const tail = [[-.05,5.01,.16,.235],[.22,4.76,.42,.26],[.34,4.50,.61,.25],[.43,4.23,.75,.24],[.46,3.96,.86,.23],[.42,3.69,.91,.22],[.34,3.43,.94,.205],[.24,3.20,.95,.185],[.13,3.03,.93,.15],[.05,2.95,.88,.035]]
  f.limb(tail, ORANGE, 9, i => i >= 7 ? WHITE : i % 2 ? '#efb36b' : '#c77328')
  return f.mesh('orange-cat-upper-perch')
}

function footing() {
  const f = new Facets(), random = seededRandom(254)
  for (let i = 0; i < 21; i++) {
    const angle = i / 21 * Math.PI * 2
    const radius = .75 + random() * .63, size = (i % 4 === 0 ? .34 : .12) + random() * .34
    f.solid([.40 + Math.cos(angle) * radius, size * .34 - .08, Math.sin(angle) * radius * .78], [size * 1.3,size*.76,size], i % 3 ? '#888581' : '#74787a', 0, random())
  }
  for (let i = 0; i < 35; i++) {
    const angle = random()*Math.PI*2, radius=.65+random()*.67
    const x=.40+Math.cos(angle)*radius, z=Math.sin(angle)*radius*.77
    const h=.22+random()*.49, lean=(random()-.5)*.40
    f.triangle([x-.035,-.08,z],[x+.05,-.08,z+.02],[x+lean,h,z+.10], i%3 ? '#817445' : '#a29254')
    f.triangle([x+.05,-.08,z+.02],[x-.035,-.08,z],[x+lean,h,z+.10], '#6d633e')
  }
  return f.mesh('roots-rocks-and-tundra-grass')
}

export function createCatTree() {
  const group = new Group()
  group.name = 'clifftop-cat-tree'
  group.add(tree(), blackCat(), orangeCat(), footing())
  return group
}

/** Seat the roots and loose stones against the actual rendered cliff surface. */
export function createClifftopCats(heightAt) {
  const group = createCatTree()
  const x = -26.1, z = 33.7, scale = .94, yaw = .52
  const ground = heightAt(x, z)
  // Interpolate a small cached support grid. Raycasting every duplicated triangle
  // vertex would add seconds to initialization for this otherwise inexpensive prop.
  const samples = new Map(), step = .4
  const sample = (ix, iz) => {
    const key = `${ix},${iz}`
    if (!samples.has(key)) samples.set(key, heightAt(ix * step, iz * step))
    return samples.get(key)
  }
  const supportAt = (wx, wz) => {
    const gx = wx / step, gz = wz / step, ix = Math.floor(gx), iz = Math.floor(gz)
    const tx = gx - ix, tz = gz - iz
    return (sample(ix, iz) * (1-tx) + sample(ix+1, iz) * tx) * (1-tz)
      + (sample(ix, iz+1) * (1-tx) + sample(ix+1, iz+1) * tx) * tz
  }
  group.position.set(x, ground - .07, z)
  group.rotation.y = yaw
  group.scale.setScalar(scale)
  for (const mesh of group.children) {
    if (mesh.name !== 'weathered-forked-tree' && mesh.name !== 'roots-rocks-and-tundra-grass') continue
    const positions = mesh.geometry.attributes.position
    for (let i = 0; i < positions.count; i++) {
      const px = positions.getX(i), py = positions.getY(i), pz = positions.getZ(i)
      if (py > .80) continue
      const wx = x + scale * (Math.cos(yaw) * px + Math.sin(yaw) * pz)
      const wz = z + scale * (-Math.sin(yaw) * px + Math.cos(yaw) * pz)
      const amount = mesh.name === 'roots-rocks-and-tundra-grass' ? 1 : 1 - smooth((py - .08) / .72)
      positions.setY(i, py + (supportAt(wx, wz) - ground) / scale * amount)
    }
    mesh.geometry.computeVertexNormals()
    mesh.geometry.computeBoundingSphere()
  }
  return group
}
