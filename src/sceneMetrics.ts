import type * as THREE from 'three'

/** Opt-in development telemetry. Counts include reflection and every composer pass. */
export function sceneMetrics(renderer: THREE.WebGLRenderer, host: HTMLElement) {
  if (!import.meta.env.DEV || !new URLSearchParams(location.search).has('perf')) return null
  renderer.info.autoReset = false
  let start = 0, previous = 0, now = 0, published = 0
  const intervals: number[] = [], cpu: number[] = []
  return {
    begin(timestamp: number) {
      now = timestamp; start = performance.now(); renderer.info.reset()
      if (previous && now - previous < 500) intervals.push(now - previous)
      previous = now
    },
    end() {
      cpu.push(performance.now() - start)
      if (now - published < 1000) return
      published = now
      const percentile = (values: number[], p: number) => values.sort((a, b) => a - b)[Math.floor((values.length - 1) * p)] || 0
      host.dataset.perf = JSON.stringify({ intervalP95: percentile(intervals, .95), cpuP95: percentile(cpu, .95),
        calls: renderer.info.render.calls, triangles: renderer.info.render.triangles,
        geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures })
      intervals.length = cpu.length = 0
    },
  }
}
