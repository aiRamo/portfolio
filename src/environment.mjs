import { clamp, mix, smooth, noise } from './terrainMath.mjs'
import { alpineHeightAt, alpineSnowAt } from './alpine.mjs'
export { clamp, mix, smooth, noise }
export const DAY_PHASE = Math.PI * 0.66
export const HALF_DAY_MS = 5000
export const atmosphere = { phase: DAY_PHASE, night: 0, twilight: 0, moving: false }

/** Advance the sky toward the next selected time, including interrupted transitions. */
export function nextPhase(from, dark) {
  const base = DAY_PHASE + (dark ? Math.PI : 0)
  return base + Math.ceil((from - base - 1e-8) / (Math.PI * 2)) * Math.PI * 2
}

/** Keep the spring's initial lift, then coast to rest without overshooting or reversing. */
export function easeSkyProgress(progress) {
  const t = clamp(progress)
  // Velocity is 56*t*(1-t)^6: positive inside the interval and zero at both ends.
  return 1 - (1 - t) ** 7 * (1 + 7 * t)
}

/** Spend more of the timelapse near the horizon, where the light changes most. */
export function makeSkyTimeline(from, to) {
  const stops = [{ phase: from, time: 0 }]
  let total = 0
  for (let i = 1; i <= 160; i++) {
    const phase = mix(from, to, i / 160)
    const midpoint = mix(from, to, (i - .5) / 160)
    total += 1 + 3.5 * lightingAt(midpoint).twilight
    stops.push({ phase, time: total })
  }
  return progress => {
    const time = easeSkyProgress(progress) * total
    const index = time >= total ? stops.length - 1 : Math.max(1, stops.findIndex(stop => stop.time >= time))
    const a = stops[index - 1], b = stops[index]
    return mix(a.phase, b.phase, (time - a.time) / (b.time - a.time))
  }
}

export function lightingAt(phase) {
  const altitude = Math.sin(phase)
  const night = 1 - smooth((altitude + 0.48) / 1.12)
  const twilight = Math.exp(-Math.pow((altitude - 0.035) / 0.40, 2))
  const golden = Math.exp(-Math.pow((altitude - 0.30) / 0.55, 2))
  const stars = 1 - smooth((altitude + 0.42) / 0.25)
  return { night, twilight, golden, stars, altitude }
}

export function celestialAt(phase, aspect = 1.6) {
  const width = Math.min(1, aspect * (aspect < .8 ? .75 : .63))
  const x = -Math.cos(phase) * 0.61 * width
  const y = Math.sin(phase) * 0.42
  const length = Math.hypot(x, y, 1.15)
  return { sun: [x / length, y / length, -1.15 / length], moon: [-x / length, -y / length, -1.15 / length] }
}

export function skyRotationAt(phase, elapsed = 0) { return -phase - elapsed * 0.0006 }

/** Cloud travel uses the exact celestial phase, plus the usual slow ambient drift. */
export function cloudTimeAt(phase, elapsed = 0) {
  const halfDayTravel = HALF_DAY_MS / 1000 * 37
  return elapsed + (phase - DAY_PHASE) / Math.PI * halfDayTravel
}

/** Atmospheric color builds continuously with distance from the overlook. */
export function distanceHazeAt(x, z) {
  const distance = Math.max(0, Math.hypot(x + 6, z - 62) - 75)
  return 1 - Math.exp(-Math.pow(distance / 190, 2))
}

export const TARN = { x: 0, z: 13, width: 24, length: 37 }
export function lakeCenter(_z) { return TARN.x }
export function lakeWidth(z) { return TARN.width * Math.sqrt(Math.max(0, 1 - ((z - TARN.z) / TARN.length) ** 2)) }

export function mountainHeight(x, z) {
  return alpineHeightAt(x, z)
}

const ridgeProfiles = {
  left: [[-77, 0], [-64, 12], [-53, 16], [-43, 24], [-34, 18], [-25, 23], [-13, 10], [-4, 0]],
  right: [[-87, 0], [-74, 15], [-61, 22], [-49, 30], [-38, 23], [-28, 28], [-15, 15], [-3, 0]],
}

/** Broken arêtes and straight scree faces replace the two rounded middle-distance hills. */
export function jaggedRidgeHeight(x, z, side) {
  const profile = side < 0 ? ridgeProfiles.left : ridgeProfiles.right
  if (z <= profile[0][0] || z >= profile[profile.length - 1][0]) return 0
  const index = profile.findIndex(point => point[0] >= z)
  const [za, ha] = profile[index - 1], [zb, hb] = profile[index]
  const crest = mix(ha, hb, (z - za) / (zb - za))
  const center = side < 0 ? -39 : 45
  const width = side < 0 ? 31 : 39
  const flank = Math.max(0, 1 - Math.abs(x - center) / width)
  const folds = Math.abs(Math.sin(z * .21 + x * .075)) * 1.4 * flank * (1 - flank)
  return Math.max(0, crest * flank - folds)
}

export function terrainHeight(x, z) {
  const hills = [
    [-33, 31, 35, 29, 25], [39, 16, 31, 35, 30], [61, -6, 24, 40, 37],
    [-45, -83, 20, 54, 39], [38, -110, 23, 67, 44], [-72, -142, 30, 72, 48],
  ]
  let h = 1.5 + noise(x * 0.035, z * 0.035) * 3
  for (const [px, pz, height, width, depth] of hills) {
    const distance = Math.hypot((x - px) / width, (z - pz) / depth)
    // Near granite shoulders have ledged tops and steeper exposed faces.
    const profile = pz >= -40 ? smooth((1 - distance) / .65) * (1 - .09 * distance * distance) : smooth(1 - Math.min(1, distance))
    h = Math.max(h, height * profile)
  }
  h = Math.max(h, jaggedRidgeHeight(x, z, -1), jaggedRidgeHeight(x, z, 1))
  h = Math.max(h, mountainHeight(x, z))
  const cliff = smooth((z + 110) / 35) * smooth((Math.abs(x) - 13) / 12) * smooth((h - 4) / 10)
  h += (noise(x * 0.19, z * 0.19) - 0.45) * Math.min(h * 0.06, 1.5) * (1 - cliff * .82)
  h += (noise(x * 0.58, z * 0.58) - 0.5) * Math.min(h * 0.035, 0.9) * (1 - cliff * .92)
  if (cliff > 0) {
    // Long structural joints carve into a single mass, with broad weathered surfaces between.
    const jointAxis = z + x * .16 + (noise(x * .025, z * .035) - .5) * 1.7
    let clefts = 0
    for (const [line, width, depth] of [[-68,.8,2.8],[-49,.65,3.6],[-31,.95,3.1],[-14,.7,4.2],[3,.8,3.6],[19,.55,4.5],[33,.75,3.7],[46,.65,3.2],[59,.8,2.7]]) {
      clefts += depth * Math.exp(-Math.pow((jointAxis - line) / width, 2))
    }
    const broad = (noise(x * .075, z * .11) - .5) * 1.5
    const bedding = x * .10 + z * .13 + noise(x * .07, z * .04) * .7
    const layer = (h + bedding) / 6.4
    const shelf = (Math.floor(layer) + smooth((layer % 1 - .13) / .74)) * 6.4 - bedding
    h += cliff * (broad - Math.min(clefts, h * .09) + (shelf - h) * .45)
    h += cliff * (noise(x * .45, z * .38) - .5) * .13
  }
  const basin = Math.hypot((x - TARN.x) / TARN.width, (z - TARN.z) / TARN.length)
  h = mix(-1.6, h, smooth((basin - 0.87) / 0.28))
  h += smooth((z - 45) / 17) * (7 + noise(x * 0.05, z * 0.05) * 2)
  return h
}

/** Exposed bedrock dominates close slopes; thawed sedge and heather fill sheltered pockets. */
export function rockCoverageAt(x, z, height = terrainHeight(x, z)) {
  const foreground = smooth((z + 155) / 80)
  const aboveBank = smooth((height - 1.2) / 5)
  const pockets = noise(x * .10, z * .13)
  return foreground * aboveBank * (.84 + .16 * smooth((pockets - .2) / .55))
}

/** Patchy late snow survives on upper slopes and shelves, never in the melted tarn. */
export function snowCoverageAt(x, z, height, normalUp = 1) {
  if (height < 1.6) return 0
  const basin = Math.hypot((x - TARN.x) / TARN.width, (z - TARN.z) / TARN.length)
  if (basin < 1.02) return 0
  if (z < -140) return alpineSnowAt(x, z, height, normalUp).coverage
  const cold = smooth((height - 10) / 38)
  // Long remnants run down the mountains' gullies, broken by exposed, thawed rock.
  const channels = noise(x * .115 + noise(z * .024, 81) * 1.3, z * .031)
  const pockets = channels * .62 + noise(x * .065, z * .10) * .23 + noise(x * .23, z * .20) * .15
  const patch = smooth((pockets - (.70 - .33 * cold)) / .15)
  const shelf = .15 + .85 * smooth((normalUp - .28) / .57)
  const nearSnow = patch * shelf * smooth((height - 3) / 9)
  return z < -115 ? mix(nearSnow, alpineSnowAt(x, z, height, normalUp).coverage, smooth((-z - 115) / 25)) : nearSnow
}

export function observerCamera(aspect) {
  return {
    position: [-6, terrainHeight(-6, 62) + 1.8, 62],
    target: [5, 8, -100],
    fov: aspect < 0.8 ? 62 : 49,
  }
}

export function seededRandom(seed = 48) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 4294967296
  }
}
