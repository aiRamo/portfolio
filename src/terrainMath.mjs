export const clamp = (n, min = 0, max = 1) => Math.min(max, Math.max(min, n))
export const mix = (a, b, t) => a + (b - a) * t
export const smooth = (t) => { const x = clamp(t); return x * x * (3 - 2 * x) }

function hash(x, z) {
  const n = Math.sin(x * 127.1 + z * 311.7) * 43758.5453
  return n - Math.floor(n)
}

export function noise(x, z) {
  const ix = Math.floor(x), iz = Math.floor(z)
  const fx = smooth(x - ix), fz = smooth(z - iz)
  return mix(mix(hash(ix, iz), hash(ix + 1, iz), fx), mix(hash(ix, iz + 1), hash(ix + 1, iz + 1), fx), fz)
}
