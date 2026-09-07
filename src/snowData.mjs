import { alpineSnowAt } from './alpine.mjs'
export const snowWidth = 1536, snowHeight = 768
/** The original accumulation formula, evaluated at build time instead of page load. */
export function generateSnowData() {
  const data = new Uint8Array(snowWidth * snowHeight)
  for (let row = 0; row < snowHeight; row++) for (let column = 0; column < snowWidth; column++) {
    const { potential } = alpineSnowAt(-255 + (column + .5) / snowWidth * 510, -340 + (row + .5) / snowHeight * 240)
    data[row * snowWidth + column] = Math.round(Math.max(0, Math.min(1, .5 + potential * .5)) * 255)
  }
  return data
}
