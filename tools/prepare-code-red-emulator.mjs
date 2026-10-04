// Official, integrity-pinned emulator packages only. No game or BIOS downloads.
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync, cpSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const cache = join(root, '.code-red-cache')
const output = join(root, 'public', 'code-red-emulator')
const lock = JSON.parse(readFileSync(join(root, 'tools/code-red-emulator.lock.json'), 'utf8'))
const customPath = join(root, 'tools/code-red-core/mgba-wasm.data')
const customHash = '4a0744b88a8c74c026dc57c35b97d0c45adb275a31601b455c9678688368cbf4'
if (createHash('sha256').update(readFileSync(customPath)).digest('hex') !== customHash) throw new Error('Custom Code Red core integrity mismatch')
const sourceDigest = createHash('sha256')
for (const name of ['README.md', 'sources.lock.json', ...readdirSync(join(root, 'tools/code-red-core/source')).sort().map(name => `source/${name}`)]) {
  sourceDigest.update(name).update(readFileSync(join(root, 'tools/code-red-core', name)))
}
const stamp = JSON.stringify({ packages: lock, disableUpdateCheck: 1, customHash, sourceHash: sourceDigest.digest('hex') })
const installed = join(cache, 'installed.json')
if (existsSync(installed) && readFileSync(installed, 'utf8') === stamp && existsSync(join(output, 'cores/code-red-mgba-wasm.data')) && existsSync(join(output, 'code-red-source/README.md'))) {
  console.log('Code Red browser emulator ready.')
  process.exit(0)
}
mkdirSync(cache, { recursive: true })
for (const [key, info] of Object.entries(lock)) {
  const filename = `${info.package.replace('@', '').replace('/', '-')}-${info.version}.tgz`
  const archive = join(cache, filename)
  if (!existsSync(archive)) {
    execFileSync('npm', ['pack', `${info.package}@${info.version}`, '--ignore-scripts', '--pack-destination', cache, '--cache', join(cache, 'npm')], { cwd: root, stdio: 'inherit' })
  }
  const digest = `sha512-${createHash('sha512').update(readFileSync(archive)).digest('base64')}`
  if (digest !== info.integrity) throw new Error(`Integrity mismatch for ${info.package}`)
  const names = execFileSync('tar', ['-tzf', archive], { encoding: 'utf8' }).trim().split('\n')
  if (names.some(name => !name.startsWith('package/') || name.split('/').includes('..'))) throw new Error('Unexpected package path')
  const destination = join(cache, key)
  mkdirSync(destination, { recursive: true })
  execFileSync('tar', ['-xzf', archive, '-C', destination])
}
cpSync(join(cache, 'frontend/package/data'), output, { recursive: true })
cpSync(join(cache, 'frontend/package/LICENSE'), join(output, 'LICENSE'))
mkdirSync(join(output, 'cores/reports'), { recursive: true })
for (const name of ['mgba-wasm.data', 'mgba-legacy-wasm.data', 'mgba-thread-wasm.data', 'mgba-thread-legacy-wasm.data']) {
  cpSync(join(cache, 'gba_core/package', name), join(output, 'cores', name))
}
cpSync(join(cache, 'gba_core/package/reports/mgba.json'), join(output, 'cores/reports/mgba.json'))
cpSync(customPath, join(output, 'cores/code-red-mgba-wasm.data'))
cpSync(join(root, 'tools/code-red-core/sources.lock.json'), join(output, 'CODE-RED-SOURCES.json'))
cpSync(join(root, 'tools/code-red-core/source'), join(output, 'code-red-source'), { recursive: true })
cpSync(join(root, 'tools/code-red-core/README.md'), join(output, 'code-red-source/README.md'))
const sourcePath = join(output, 'src/emulator.js')
const source = readFileSync(sourcePath, 'utf8')
const check = 'if (this.debug || (window.location && ["localhost", "127.0.0.1"].includes(location.hostname))) this.checkForUpdates();'
if (!source.includes(check)) throw new Error('Pinned emulator update check changed unexpectedly')
writeFileSync(sourcePath, source.replace(check, '// Code Red: pinned local runtime; optional CDN update check disabled.'))
writeFileSync(join(output, 'SOURCES.txt'), 'EmulatorJS 4.2.3 (GPL-3.0): https://github.com/EmulatorJS/EmulatorJS/tree/v4.2.3\nGBA core: https://github.com/EmulatorJS/mgba\nCore build scripts: https://github.com/EmulatorJS/build\nOfficial packages and integrity: tools/code-red-emulator.lock.json in this site repository.\nLocal change: optional CDN update check disabled.\n')
writeFileSync(installed, stamp)
console.log('Integrity-verified Code Red browser emulator prepared locally.')
