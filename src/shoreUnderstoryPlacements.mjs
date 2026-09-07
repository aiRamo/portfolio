// Loose groups leave open gravel between the planting and around the camp.
// World-space positions stay fixed while the observer scrolls through the valley.
export const SHORE_UNDERSTORY = {
  shrub: [
    { x: -23.2, z: -7.6, scale: .95, yaw: .4 },
    { x: -18.0, z: -17.6, scale: .82, yaw: 4.5 },
    { x: -17.5, z: -19.9, scale: 1.10, yaw: 2.1 },
    { x: 6.3, z: -27.8, scale: .90, yaw: 2.4 },
    { x: 13.3, z: -22.6, scale: .80, yaw: 3.9 },
    { x: 17.8, z: -19.7, scale: .94, yaw: 1.2 },
    { x: 20.9, z: -13.6, scale: .90, yaw: 5.8 },
    { x: 22.7, z: -6.9, scale: .72, yaw: 2.9 },
    { x: 24.2, z: 2.0, scale: .86, yaw: 3.5 },
    { x: 21.8, z: -10.9, scale: 1.00, yaw: .6 },
    { x: -24.3, z: -4.5, scale: .74, yaw: 5.2 },
    { x: -22.0, z: -11.4, scale: .74, yaw: 3.8 },
  ],
  // Cattails replace four shrubs, shifted onto the damp edge of the same coves.
  cattail: [
    { x: -9.0, z: -23.2, scale: .78, yaw: .9 },
    { x: 8.3, z: -23.6, scale: .82, yaw: 5.1 },
    { x: 22.9, z: .8, scale: .76, yaw: 4.9 },
    { x: -22.2, z: -1.1, scale: .90, yaw: 1.1 },
  ],
  flower: [
    { x: -21.0, z: -13.8, scale: 1.04, yaw: 1.6 },
    { x: -11.2, z: -27.1, scale: .98, yaw: 3.3 },
    { x: 11.8, z: -25.0, scale: 1.12, yaw: .7 },
    { x: 23.8, z: -4.6, scale: .80, yaw: .2 },
  ],
  heather: [
    { x: -24.4, z: -9.8, scale: 1.05, yaw: 2.7 },
    { x: -16.0, z: -24.1, scale: .92, yaw: 5.4 },
    { x: 18.7, z: -16.5, scale: 1.10, yaw: 4.2 },
    { x: 25.7, z: 2.2, scale: .86, yaw: 1.8 },
  ],
  grass: [
    { x: -22.0, z: -6.0, scale: .90, yaw: .8 },
    { x: -19.5, z: -12.9, scale: 1.05, yaw: 2.4 },
    { x: -12.1, z: -23.0, scale: .80, yaw: 4.6 },
    { x: 10.0, z: -23.5, scale: .90, yaw: 1.5 },
    { x: 18.8, z: -12.0, scale: 1.00, yaw: 3.7 },
    { x: 23.4, z: .2, scale: .82, yaw: 5.1 },
    { x: 23.4, z: -3.0, scale: 1.10, yaw: .4 },
    { x: -23.2, z: -3.5, scale: .95, yaw: 2.8 },
  ],
}

export function shoreUnderstoryClearAt(x, z) {
  return Object.entries(SHORE_UNDERSTORY).some(([kind, plants]) =>
    plants.some(p => Math.hypot(x - p.x, z - p.z) < p.scale * (kind === 'grass' || kind === 'cattail' ? .5 : .9)))
}
