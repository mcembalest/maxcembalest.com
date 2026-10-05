// Fetch the pinned Code Red player bundle into public/code-red/ (gitignored).
// The bundle contains no ROM bytes; players supply their own FireRed file.
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const lock = JSON.parse(readFileSync(join(root, 'src/things/pokemon-code-red/bundle.lock.json'), 'utf8'))
const out = join(root, 'public/code-red')
const stamp = join(out, '.bundle')
if (existsSync(stamp) && readFileSync(stamp, 'utf8') === lock.sha256) process.exit(0)

const url = `https://github.com/${lock.repo}/releases/download/${lock.tag}/code-red-player.tar.gz`
const response = await fetch(url)
if (!response.ok) throw new Error(`Code Red bundle: ${response.status} ${url}`)
const data = Buffer.from(await response.arrayBuffer())
const digest = createHash('sha256').update(data).digest('hex')
if (digest !== lock.sha256) throw new Error(`Code Red bundle sha256 ${digest} != bundle.lock.json ${lock.sha256}`)

rmSync(out, { recursive: true, force: true })
mkdirSync(out, { recursive: true })
const archive = join(out, '.bundle.tar.gz')
writeFileSync(archive, data)
const names = execFileSync('tar', ['-tzf', archive], { encoding: 'utf8' }).trim().split('\n')
if (names.some(name => name.startsWith('/') || name.split('/').includes('..'))) throw new Error('Code Red bundle: unsafe path')
execFileSync('tar', ['-xzf', archive, '-C', out])
rmSync(archive)
rmSync(join(out, 'index.html'), { force: true }) // the site page replaces the standalone one
writeFileSync(stamp, lock.sha256)
console.log(`Code Red player ${lock.tag} ready in public/code-red/`)
