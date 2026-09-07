import { BufferGeometry, Color, Float32BufferAttribute, Group, Mesh, MeshStandardMaterial, Vector3 } from 'three'

// These are sculpted cross-sections, rather than overlapping spheres. All parts
// end up in one flat-shaded mesh, including the eyes, hooves and antler branches.
const TAU = Math.PI * 2
const v = p => new Vector3(...p)
const skin = new MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: .94 })
skin.name = 'Deer / matte faceted coat'

function sculpt() {
  const positions = [], colors = []
  let face = 0
  function triangle(a, b, c, pigment) {
    const color = pigment instanceof Color ? pigment.clone() : new Color(pigment)
    // Small, deterministic tonal differences give broad facets a natural coat.
    color.multiplyScalar(.95 + .10 * (.5 + .5 * Math.sin(++face * 7.73)))
    for (const point of [a, b, c]) {
      positions.push(point.x, point.y, point.z)
      colors.push(color.r, color.g, color.b)
    }
  }
  function loft(sections, pigment, sides = 9, transform = p => p) {
    const rings = sections.map((section, index) => {
      const before = v(sections[Math.max(0, index - 1)].p)
      const after = v(sections[Math.min(sections.length - 1, index + 1)].p)
      const tangent = after.sub(before).normalize()
      // The coat's long facets track the spine, neck and limbs.
      const across = Math.abs(tangent.x) > .88 ? new Vector3(0, 0, 1) : new Vector3(1, 0, 0)
      across.addScaledVector(tangent, -across.dot(tangent)).normalize()
      const up = new Vector3().crossVectors(tangent, across).normalize()
      return Array.from({ length: sides }, (_, side) => {
        const a = TAU * side / sides
        return transform(v(section.p).addScaledVector(across, Math.cos(a) * section.w).addScaledVector(up, Math.sin(a) * section.h))
      })
    })
    const tint = (a, b, c) => typeof pigment === 'function' ? pigment(a.clone().add(b).add(c).multiplyScalar(1 / 3)) : pigment
    for (let row = 0; row < rings.length - 1; row++) {
      for (let side = 0; side < sides; side++) {
        const next = (side + 1) % sides
        const a = rings[row][side], b = rings[row][next], c = rings[row + 1][side], d = rings[row + 1][next]
        // Alternating diagonals keep the triangulation from reading as stripes.
        if ((row + side) % 2) {
          triangle(a, b, d, tint(a, b, d)); triangle(a, d, c, tint(a, d, c))
        } else {
          triangle(a, b, c, tint(a, b, c)); triangle(b, d, c, tint(b, d, c))
        }
      }
    }
    for (const [ring, section, reverse] of [[rings[0], sections[0], true], [rings.at(-1), sections.at(-1), false]]) {
      const center = transform(v(section.p))
      for (let i = 0; i < sides; i++) {
        const a = ring[i], b = ring[(i + 1) % sides]
        triangle(center, reverse ? b : a, reverse ? a : b, tint(center, a, b))
      }
    }
  }
  function leaf(points, pigment, transform = p => p) {
    const [root, left, tip, right, ridge, back] = points.map(p => transform(v(p)))
    const center = [root, left, tip, right, ridge, back].reduce((sum, p) => sum.add(p), new Vector3()).multiplyScalar(1 / 6)
    for (const [a, b, c] of [[root, left, ridge], [left, tip, ridge], [tip, right, ridge], [right, root, ridge],
      [left, root, back], [tip, left, back], [right, tip, back], [root, right, back]]) {
      const normal = new Vector3().crossVectors(b.clone().sub(a), c.clone().sub(a))
      const outward = a.clone().add(b).add(c).multiplyScalar(1 / 3).sub(center)
      triangle(a, normal.dot(outward) >= 0 ? b : c, normal.dot(outward) >= 0 ? c : b, pigment)
    }
  }
  function geometry() {
    const result = new BufferGeometry()
    result.setAttribute('position', new Float32BufferAttribute(positions, 3))
    result.setAttribute('color', new Float32BufferAttribute(colors, 3))
    result.computeVertexNormals()
    result.computeBoundingBox()
    result.computeBoundingSphere()
    return result
  }
  return { loft, leaf, triangle, geometry }
}

const section = (p, w, h = w) => ({ p, w, h })
const baseFeet = [
  { x: -.245, z: .48, rear: false }, { x: .245, z: .61, rear: false },
  { x: -.245, z: -.69, rear: true }, { x: .245, z: -.55, rear: true },
]

/**
 * Original deer geometry. Forward is +Z; the hooves touch Y=0. `groundOffsets`
 * can articulate each leg to the actual terrain without tilting the animal.
 * @param {{antlers?: boolean, size?: number, pose?: string, coat?: string,
 *   fawn?: boolean, groundOffsets?: number[], antlerSize?: number, grazeOffset?: number}} [options]
 */
export function createDeer({ antlers = true, size = 1, pose = 'alert', coat = '#90623e', fawn = false, groundOffsets = [0, 0, 0, 0], antlerSize = 1, grazeOffset = 0 } = {}) {
  const model = sculpt()
  const brown = new Color(coat), shadow = brown.clone().multiplyScalar(.77), pale = new Color('#c1a282')
  const cream = new Color('#d9cbb0'), hoof = new Color('#332d28'), nose = new Color('#2a261f')
  const bodyTint = p => p.z < -.69 && p.y > 1.08 && p.y < 1.51 ? cream
    : p.y < 1.10 ? pale : p.y > 1.55 ? shadow : brown
  model.loft([
    section([0, 1.23, -.87], .085, .17), section([0, 1.26, -.73], .25, .32),
    section([0, 1.27, -.50], .33, .39), section([0, 1.28, -.19], .325, .38),
    section([0, 1.31, .15], .295, .35), section([0, 1.34, .41], .27, .37),
    section([0, 1.30, .62], .195, .30), section([0, 1.29, .70], .09, .21),
  ], bodyTint, 10)

  baseFeet.forEach((foot, index) => {
    const ground = groundOffsets[index] ?? 0
    const side = Math.sign(foot.x)
    const groundY = y => y + ground * Math.max(0, 1 - y / 1.1)
    if (foot.rear) {
      model.loft([
        section([side * .23, 1.36, -.53], .15, .20),
        section([side * .285, 1.03, -.55], .105, .15),
        section([side * .28, groundY(.77), -.39], .065, .082),
        section([foot.x, groundY(.44), foot.z - .055], .044, .057),
        section([foot.x, groundY(.19), foot.z - .015], .033, .042),
        section([foot.x, groundY(.115), foot.z + .016], .043, .052),
      ], p => p.y < .38 ? shadow : brown, 7)
    } else {
      model.loft([
        section([side * .215, 1.39, .40], .115, .16),
        section([side * .25, 1.02, .45], .072, .09),
        section([foot.x, groundY(.70), foot.z - .05], .044, .052),
        section([foot.x, groundY(.61), foot.z - .055], .052, .055),
        section([foot.x, groundY(.18), foot.z + .005], .029, .037),
        section([foot.x, groundY(.11), foot.z + .02], .043, .046),
      ], p => p.y < .30 ? shadow : brown, 7)
    }
    model.loft([
      section([foot.x, ground + .018, foot.z + .045], .056, .084),
      section([foot.x, ground + .09, foot.z + .04], .058, .083),
      section([foot.x, ground + .145, foot.z + .018], .04, .053),
    ], hoof, 6)
  })

  const grazing = pose === 'grazing'
  const headOrigin = grazing ? new Vector3(0, (fawn ? .54 : .50) + grazeOffset, 1.12) : new Vector3(0, 2.10, .69)
  const pitch = grazing ? 1.02 : -.12
  const head = p => {
    const headScale = fawn ? 1.12 : 1
    p.multiplyScalar(headScale)
    const y = p.y * Math.cos(pitch) - p.z * Math.sin(pitch)
    const z = p.y * Math.sin(pitch) + p.z * Math.cos(pitch)
    return new Vector3(p.x, y, z).add(headOrigin)
  }
  model.loft(grazing ? [
    section([0, 1.43, .40], .215, .265), section([0, 1.27, .68], .185, .235),
    section([0, .97 + grazeOffset * .35, .90], .125, .18), section([0, .69 + grazeOffset * .65, 1.03], .098, .145),
    section([0, .52 + grazeOffset, 1.13], .09, .115),
  ] : [
    section([0, 1.34, .42], .235, .30), section([0, 1.60, .46], antlers ? .205 : .16, .24),
    section([0, 1.87, .52], antlers ? .15 : .115, .185),
    section([0, 2.07, .65], .095, .14), section([0, 2.16, .72], .105, .12),
  ], p => !grazing && p.z > .62 && p.y < 2.04 ? pale : brown, 9)
  // Angular brow, cheekbone, bridge and tapering muzzle form one continuous head.
  model.loft([
    section([0, .045, -.205], .10, .13), section([0, .055, -.115], .165, .188),
    section([0, .025, .065], .14, .148), section([0, -.065, .225], .087, .093),
    section([0, -.105, .365], .070, .064), section([0, -.11, .397], .063, .055),
  ], brown, 9, head)
  model.loft([
    section([0, -.109, .369], .073, .057), section([0, -.113, .416], .063, .052),
  ], nose, 7, head)
  // A pale lower lip and throat read clearly without cartoon-sized facial features.
  model.loft([
    section([0, -.119, .015], .091, .041), section([0, -.155, .21], .066, .029),
    section([0, -.151, .357], .052, .02),
  ], cream, 6, head)
  for (const side of [-1, 1]) {
    model.loft([
      section([side * .137, .060, .065], .031, .025),
      section([side * .158, .062, .068], .024, .020),
      section([side * .163, .062, .068], .016, .014),
    ], nose, 7, head)
    // Tiny amber catchlight sits on both sides, so the head works in a full orbit.
    model.loft([
      section([side * .161, .068, .076], .006, .008),
      section([side * .166, .068, .076], .004, .005),
    ], '#b9985d', 5, head)
    model.leaf([
      [side * .104, .125, -.085], [side * .19, .365, -.128], [side * .444, .423, -.17],
      [side * .355, .19, -.064], [side * .26, .27, -.021], [side * .26, .27, -.129],
    ], brown, head)
    model.leaf([
      [side * .163, .181, -.047], [side * .216, .326, -.080], [side * .394, .377, -.115],
      [side * .324, .222, -.033], [side * .266, .267, -.012], [side * .266, .267, -.036],
    ], pale, head)
    if (antlers) {
      const antler = p => head(p.multiplyScalar(antlerSize).add(new Vector3(side * .105, .178, -.139)))
      const branch = (points, radius) => model.loft(points.map((p, i) => section(p, radius * (1 - i / (points.length - 1)) + .0025)), '#796044', 6, antler)
      branch([[0, 0, 0], [side * .049, .15, -.055], [side * .145, .29, -.115],
        [side * .26, .43, -.145], [side * .33, .60, -.126], [side * .385, .78, -.03]], .038)
      branch([[side * .025, .095, -.028], [side * .10, .17, .055], [side * .165, .32, .109]], .024)
      branch([[side * .122, .263, -.096], [side * .16, .44, -.045], [side * .185, .58, .025]], .024)
      branch([[side * .228, .391, -.137], [side * .325, .48, -.26], [side * .43, .62, -.30]], .021)
      branch([[side * .316, .565, -.127], [side * .256, .70, -.117], [side * .24, .835, -.055]], .019)
      branch([[side * .352, .675, -.087], [side * .47, .744, -.08], [side * .545, .86, -.032]], .017)
    }
  }
  model.leaf([
    [0, 1.46, -.78], [-.075, 1.38, -.90], [0, 1.06, -1.03], [.075, 1.38, -.90],
    [0, 1.31, -1.026], [0, 1.31, -.89],
  ], brown)
  model.leaf([
    [0, 1.39, -.971], [-.039, 1.30, -1.025], [0, 1.095, -1.033], [.039, 1.30, -1.025],
    [0, 1.25, -1.044], [0, 1.25, -1.026],
  ], cream)
  if (fawn) {
    for (const side of [-1, 1]) {
      for (let row = 0; row < 2; row++) {
        for (let i = 0; i < 6; i++) {
          const z = -.55 + i * .145 + row * .055, y = 1.38 + row * .115
          const x = side * (.326 * Math.sqrt(1 - ((y - 1.29) / .40) ** 2) - Math.max(0, z + .05) * .078 + .007)
          const center = v([x, y, z]), r = .021 + (i % 3) * .005
          const a = v([x + side * .003, y + r, z]), b = v([x, y, z + r * 1.5]), c = v([x + side * .003, y - r, z]), d = v([x, y, z - r * 1.5])
          for (const pair of [[a, b], [b, c], [c, d], [d, a]]) model.triangle(center, ...(side > 0 ? pair : [...pair].reverse()), cream)
        }
      }
    }
  }
  const mesh = new Mesh(model.geometry(), skin)
  mesh.name = fawn ? 'Spotted fawn' : antlers ? 'Antlered stag' : 'Antlerless doe'
  mesh.scale.setScalar(size)
  mesh.castShadow = true
  mesh.receiveShadow = true
  mesh.userData = { species: 'deer', antlers, fawn, pose, size, feet: baseFeet.map((foot, i) => [foot.x, groundOffsets[i] ?? 0, foot.z]) }
  return mesh
}

export const DEER_PLACEMENTS = [
  { x: 26.4, z: -6.2, yaw: -.80, size: 1.08, antlers: true, pose: 'alert', coat: '#916341' },
  { x: 29.6, z: -8.8, yaw: -.60, size: .98, antlers: true, antlerSize: .86, pose: 'alert', coat: '#826044' },
  { x: 25.6, z: -2.8, yaw: -1.20, size: .91, antlers: false, pose: 'grazing', coat: '#a07750' },
  { x: 28.4, z: -4.7, yaw: 2.05, size: .88, antlers: false, pose: 'alert', coat: '#9d7150' },
  { x: 31.9, z: -10.5, yaw: -1.10, size: .94, antlers: false, pose: 'grazing', coat: '#8f6746' },
  { x: 26.4, z: -10.8, yaw: .55, size: .85, antlers: false, pose: 'alert', coat: '#ac8057' },
  { x: 27.1, z: -3.6, yaw: -1.0, size: .59, antlers: false, fawn: true, pose: 'alert', coat: '#b28350' },
  { x: 30.7, z: -8.0, yaw: 1.9, size: .65, antlers: false, fawn: true, pose: 'grazing', coat: '#ad7848' },
]

/**
 * The sampler may return either a numeric height or { height, slope }.
 * @param {(x: number, z: number) => number | { height: number, slope?: number }} sampleHeight
 */
export function createDeerHerd(sampleHeight = () => 0, { placements = DEER_PLACEMENTS } = {}) {
  const group = new Group()
  group.name = 'Lakeside herd / eight deer'
  const height = (x, z) => {
    const result = sampleHeight(x, z)
    return typeof result === 'number' ? result : result.height
  }
  placements.forEach((placement, index) => {
    const { yaw = 0, size = 1 } = placement
    let { x, z } = placement
    // Shift outward from wet ground and toward gentler meadow if a shoreline edit
    // moves a saved position. Keep a small herd instead of scattering up a cliff.
    const suitability = (px, pz) => {
      const h = height(px, pz)
      const slope = Math.hypot(height(px + .5, pz) - height(px - .5, pz), height(px, pz + .5) - height(px, pz - .5))
      return (h < .6 ? 100 + (.6 - h) * 10 : 0) + Math.max(0, slope - .32) * 16
    }
    let best = suitability(x, z)
    for (const [dx, dz] of [[-1, 0], [-2, -.5], [-3, -1], [0, -2], [-1, -2], [-2, -3], [1, -2]]) {
      const score = suitability(placement.x + dx, placement.z + dz) + Math.hypot(dx, dz) * .15
      if (score < best) { x = placement.x + dx; z = placement.z + dz; best = score }
    }
    const y = height(x, z)
    const groundOffsets = baseFeet.map(foot => {
      const px = x + size * (foot.x * Math.cos(yaw) + foot.z * Math.sin(yaw))
      const pz = z + size * (-foot.x * Math.sin(yaw) + foot.z * Math.cos(yaw))
      return (height(px, pz) - y) / size
    })
    const grazeOffset = (height(x + Math.sin(yaw) * 1.30 * size, z + Math.cos(yaw) * 1.30 * size) - y) / size
    const deer = createDeer({ ...placement, groundOffsets, grazeOffset })
    deer.position.set(x, y + .007, z)
    deer.rotation.y = yaw
    deer.name = `${String(index + 1).padStart(2, '0')} / ${deer.name}`
    group.add(deer)
  })
  group.userData = { herdSize: group.children.length, habitat: 'right shoreline among juvenile pines' }
  return group
}
