import { clamp, mix, smooth, observerCamera } from './environment.mjs'

export const scrollJourney = { progress: 0, override: /** @type {number | null} */ (null) }

/** Native scroll supplies the timeline. Reversing scroll retraces exactly the same camera path. */
export function journeyAt(scroll, distance) {
  const progress = clamp(scroll / Math.max(1, distance))
  return {
    progress,
    heroVisibility: 1 - smooth(progress / .43),
    sky: smooth((progress - .12) / .35),
  }
}

export function skyCameraAt(aspect, progress) {
  const home = observerCamera(aspect)
  const t = smooth(progress)
  const dx = home.target[0] - home.position[0], dz = home.target[2] - home.position[2]
  const yaw = Math.atan2(dx, -dz)
  const homePitch = Math.atan2(home.target[1] - home.position[1], Math.hypot(dx, dz))
  const pitch = mix(homePitch, Math.PI * 82 / 180, t)
  // A small rise clears the close cliff rims as the observer looks toward the zenith.
  const position = [...home.position]
  position[1] += 20 * smooth((progress - .25) / .75)
  const target = [position[0] + Math.sin(yaw) * Math.cos(pitch) * 160,
    position[1] + Math.sin(pitch) * 160, position[2] - Math.cos(yaw) * Math.cos(pitch) * 160]
  return { position, target, fov: home.fov, pitch }
}

export function contentPullAt(top, viewportHeight, reduced = false) {
  if (reduced) return { y: 0, opacity: 1 }
  const entered = clamp((viewportHeight - top) / (viewportHeight * .8))
  return { y: (1 - smooth(entered)) * Math.min(150, viewportHeight * .18), opacity: smooth(entered / .65) }
}
