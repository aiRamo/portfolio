import { clamp, mix, smooth, noise } from './terrainMath.mjs'

/** Broad, connected massifs. Smaller drainage features never become isolated cones. */
function rangeEnvelopesAt(x, z) {
  const crest = 42 + 15 * Math.exp(-(((x - 16) / 66) ** 2))
    + 8 * Math.exp(-(((x + 121) / 45) ** 2)) + 7 * Math.exp(-(((x - 141) / 49) ** 2))
    + (noise(x * .022, 19) - .5) * 10 + (noise(x * .077, 32) - .5) * 3.2
  const spine = -199 + Math.sin(x * .018) * 14 + noise(x * .025, 7) * 12
  const front = crest * Math.exp(-(((z - spine) / 66) ** 2))
  const rearSpine = -296 - Math.sin(x * .015) * 14
  const rearCrest = 51 + noise(x * .023, 64) * 16
  const rear = rearCrest * Math.exp(-(((z - rearSpine) / 72) ** 2))
  return [{ height: front, crest, spine, seed: 0 }, { height: rear, crest: rearCrest, spine: rearSpine, seed: 83 }]
}

export function mountainEnvelopeAt(x, z) {
  const [front, rear] = rangeEnvelopesAt(x, z)
  return front.height >= rear.height ? front : rear
}

/** Tributaries spread into high cirques, converge downhill, then taper into meltwater chutes. */
export function drainageAt(x, z, spine, seed = 0) {
  const downhill = Math.abs(z - spine)
  const basin = Math.round((x + seed) / 18)
  let channel = 0, bowl = 0
  for (let index = basin - 1; index <= basin + 1; index++) {
    const variation = noise(index * 7.13 + seed, 42)
    const aspect = noise(index * 5.7 + seed, 96)
    const center = index * 18 - seed + (variation - .5) * 7
      + Math.sin(downhill * .035 + index * 2.4) * 2.8 + (aspect - .5) * downhill * .18
    const tributary = clamp((32 + variation * 31 - downhill) / (34 + variation * 20))
    const spread = tributary ** .85 * (5 + variation * 7)
    const bend = (noise(downhill * .16, index * 3.7 + seed) - .5) * 1.4 * tributary
    const trunkDistance = Math.abs(x - center - bend)
    const rightBranch = center + spread + bend, leftBranch = center - spread * (.55 + aspect * .55) - bend
    const branches = Math.min(Math.abs(x - rightBranch), Math.abs(x - leftBranch))
    const split = smooth((tributary - .38) / .62) * (2.5 + aspect * 2.5)
    const feeders = Math.min(Math.abs(x - rightBranch - split), Math.abs(x - leftBranch + split * .75))
    const width = mix(.28, 1.2 + variation * .9, smooth((79 - downhill) / 66))
    const branchWeight = smooth(tributary / .28)
    channel = Math.max(channel, Math.exp(-((trunkDistance / width) ** 2)), Math.exp(-((branches / (width * .63)) ** 2)) * branchWeight,
      Math.exp(-((feeders / (width * .4)) ** 2)) * smooth((tributary - .35) / .35))
    bowl = Math.max(bowl, Math.exp(-((trunkDistance / (4.8 + variation * 3.4)) ** 2)))
  }
  return { channel, bowl, downhill }
}

function sculptRange(x, z, envelope) {
  const drainage = drainageAt(x, z, envelope.spine, envelope.seed)
  const { channel, bowl, downhill } = drainage
  const alpine = smooth((envelope.height - 19) / 22)
  // Carving broad hollows leaves intervening rock ribs. Fine channels sit inside those hollows.
  const erosion = (bowl * 3.4 + channel * .85) * smooth(downhill / 13)
  const crestBreaks = (noise(x * .13, envelope.seed + 9) - .5) * 6 * Math.exp(-((downhill / 28) ** 2))
  return { height: envelope.height + (crestBreaks - erosion) * alpine, drainage }
}

export function alpineHeightAt(x, z) {
  const [front, rear] = rangeEnvelopesAt(x, z)
  // Combine finished surfaces, keeping the join continuous after carving both ranges.
  if (Math.abs(front.height - rear.height) > 9) return sculptRange(x, z, front.height > rear.height ? front : rear).height
  return Math.max(sculptRange(x, z, front).height, sculptRange(x, z, rear).height)
}

/** A signed snow edge, baked at material resolution so ribbons don't follow mesh triangles. */
function snowPotential(x, z, height, envelope, drainage) {
  const elevation = height / envelope.crest
  const cold = smooth((elevation - .56) / .37)
  const crags = noise(x * .29 + z * .09, z * .22)
  const brokenEdge = (crags - .5) * .40 + (noise(x * .83, z * .64) - .5) * .14
  // Connected high snowfields wrap around dark ribs; below them only the gully cores survive.
  const upperField = cold * .46 + drainage.bowl * .27 + drainage.channel * .30
  const ribbon = drainage.channel * smooth((height - 15 - noise(x * .04, 53) * 15) / 14) * .92
  const exposedRib = (1 - drainage.bowl) * .17 * smooth((elevation - .72) / .17)
  return Math.max(upperField, ribbon) - exposedRib + brokenEdge - .55
}

export function alpineSnowAt(x, z, height = undefined, normalUp = 1) {
  const [front, rear] = rangeEnvelopesAt(x, z)
  let potential
  if (Math.abs(front.height - rear.height) > 9) {
    const envelope = front.height > rear.height ? front : rear
    const field = sculptRange(x, z, envelope)
    height ??= field.height
    potential = snowPotential(x, z, height, envelope, field.drainage)
  } else {
    const a = sculptRange(x, z, front), b = sculptRange(x, z, rear)
    height ??= Math.max(a.height, b.height)
    const blend = smooth((a.height - b.height + 2) / 4)
    potential = mix(snowPotential(x, z, height, rear, b.drainage), snowPotential(x, z, height, front, a.drainage), blend)
  }
  const shelf = .12 + .88 * smooth((normalUp - .28) / .57)
  return { potential, coverage: smooth((potential + .018) / .036) * shelf * smooth((height - 16) / 12) }
}
