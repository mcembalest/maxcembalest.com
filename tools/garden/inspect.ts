// Deterministic source-photo previews: node tools/garden/inspect.ts [output-directory]
import sharp from 'sharp'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { Terrain } from '../../src/home/terrain.ts'
import { Filaments } from '../../src/home/filaments.ts'

const output = resolve(process.argv[2] ?? '/tmp/garden-filaments')
mkdirSync(output, { recursive: true })
for (const scene of [
  { name: 'profile', width: 288, roots: [[40, 176], [84, 148], [152, 200], [224, 216], [232, 132], [92, 80]] },
  { name: 'keys', width: 208, roots: [[126, 170], [184, 228], [86, 256], [30, 96], [160, 68], [48, 198]] },
]) {
  const { data, info } = await sharp(resolve('src/assets/personal', `${scene.name}.png`))
    .resize({ width: scene.width }).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const source = new Uint8ClampedArray(data)
  const terrain = new Terrain(info.width, info.height, source)
  let rng = 42
  const random = () => ((rng = (Math.imul(rng, 1664525) + 1013904223) >>> 0) / 2 ** 32)
  const growth = new Filaments(terrain, random)
  for (const [x, y] of scene.roots) console.log(scene.name, [x, y], growth.plant(x, y) ? 'seeded' : 'no substrate / crowded')
  for (let i = 0; i < 300 && growth.active; i++) growth.step()
  const overlay = new Uint8ClampedArray(source.length)
  growth.paint(overlay)
  const grown = source.slice(), flow = source.slice()
  for (let i = 0; i < info.width * info.height; i++) {
    const a = overlay[i * 4 + 3] / 255, strength = terrain.guidance[i] * 0.6
    for (let c = 0; c < 3; c++) grown[i * 4 + c] = overlay[i * 4 + c] * a + source[i * 4 + c] * (1 - a)
    flow[i * 4] *= 1 - strength
    flow[i * 4 + 1] = flow[i * 4 + 1] * (1 - strength) + strength * 230
    flow[i * 4 + 2] = flow[i * 4 + 2] * (1 - strength) + strength * 180
  }
  for (const [name, pixels] of [['growth', grown], ['flow', flow]] as const) {
    await sharp(pixels, { raw: { width: info.width, height: info.height, channels: 4 } })
      .resize({ width: info.width * 2, kernel: 'nearest' }).png().toFile(resolve(output, `${scene.name}-${name}.png`))
  }
  console.log(scene.name, { livingCells: growth.size, sleeping: !growth.active })
}
console.log(`Wrote previews to ${output}`)
