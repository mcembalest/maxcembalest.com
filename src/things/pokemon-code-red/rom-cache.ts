import { BASE_SHA1, MOD_SHA1, ROM_SIZE, sha1 } from './patch.ts'
import { ROM_KEY, SOURCE_KEY } from './storage.ts'

type Cache = {
  read(key: string): Promise<ArrayBuffer | undefined>
  write(key: string, bytes: Uint8Array): Promise<void>
  patch(source: Uint8Array): Promise<Uint8Array>
}

// Existing patched caches remain usable. Never mistake an old patched ROM for
// the original or migrate save states: only an independently verified source
// can produce a new build. Missing/corrupt/evicted entries fall back to choice.
export async function restoreRom(cache: Cache, digest = sha1) {
  async function verified(key: string, expected: string) {
    try {
      const stored = await cache.read(key)
      if (stored instanceof ArrayBuffer && stored.byteLength === ROM_SIZE) {
        const bytes = new Uint8Array(stored)
        if (await digest(bytes) === expected) return bytes
      }
    } catch { /* Storage can be unavailable independently of patch loading. */ }
  }
  const current = await verified(ROM_KEY, MOD_SHA1)
  if (current) return { bytes: current, remembered: true }
  const source = await verified(SOURCE_KEY, BASE_SHA1)
  if (!source) return undefined
  const bytes = await cache.patch(source)
  if (bytes.byteLength !== ROM_SIZE || await digest(bytes) !== MOD_SHA1) {
    throw new Error('Patch verification failed. Reload and try again.')
  }
  try { await cache.write(ROM_KEY, bytes) } catch { /* Source remains cached for the next reload. */ }
  return { bytes, remembered: true }
}
