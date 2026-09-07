import { mkdir, writeFile } from 'node:fs/promises'
import { deflateSync } from 'node:zlib'
import { generateSnowData, snowWidth, snowHeight } from '../src/snowData.mjs'

// Lossless 8-bit grayscale PNG; no gamma metadata or palette alters the data values.
function chunk(type, bytes) {
  const body = Buffer.concat([Buffer.from(type), bytes])
  let crc = 0xffffffff
  for (const byte of body) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0)
  }
  const length = Buffer.alloc(4), checksum = Buffer.alloc(4)
  length.writeUInt32BE(bytes.length); checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0)
  return Buffer.concat([length, body, checksum])
}
const data = generateSnowData(), rows = Buffer.alloc((snowWidth + 1) * snowHeight)
for (let row = 0; row < snowHeight; row++) {
  let bestScore = Infinity, bestFilter = 0, best = Buffer.alloc(snowWidth)
  for (let filter = 0; filter <= 4; filter++) {
    const encoded = Buffer.alloc(snowWidth); let score = 0
    for (let x = 0; x < snowWidth; x++) {
      const i = row * snowWidth + x, left = x ? data[i - 1] : 0, up = row ? data[i - snowWidth] : 0
      const corner = x && row ? data[i - snowWidth - 1] : 0, prediction = left + up - corner
      const dl = Math.abs(prediction - left), du = Math.abs(prediction - up), dc = Math.abs(prediction - corner)
      const paeth = dl <= du && dl <= dc ? left : du <= dc ? up : corner
      const predictor = [0, left, up, Math.floor((left + up) / 2), paeth][filter]
      const value = (data[i] - predictor) & 255
      encoded[x] = value; score += Math.min(value, 256 - value)
    }
    if (score < bestScore) { bestScore = score; bestFilter = filter; best = encoded }
  }
  const offset = row * (snowWidth + 1)
  rows[offset] = bestFilter; rows.set(best, offset + 1)
}
const header = Buffer.alloc(13)
header.writeUInt32BE(snowWidth, 0); header.writeUInt32BE(snowHeight, 4); header[8] = 8
const png = Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk('IHDR', header), chunk('IDAT', deflateSync(rows, { level: 9 })), chunk('IEND', Buffer.alloc(0))])
const directory = new URL('../src/generated/', import.meta.url)
await mkdir(directory, { recursive: true })
await writeFile(new URL('alpine-snow.png', directory), png)
console.log(`Prepared lossless snow map (${Math.round(png.length / 1024)} KB)`)
