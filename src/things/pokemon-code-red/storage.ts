// Private to this browser/origin. No upload, account, or server-side save storage.
import { MOD_SHA1 } from './patch'

export const ROM_KEY = `rom:${MOD_SHA1}`
export const STATE_KEY = `state:${MOD_SHA1}:emulatorjs-4.2.3`

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('code-red-local', 1)
    request.onupgradeneeded = () => request.result.createObjectStore('files')
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
    request.onblocked = () => reject(new Error('Browser storage is blocked.'))
  })
}

export async function readLocal(key: string): Promise<ArrayBuffer | undefined> {
  const database = await open()
  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction('files', 'readonly')
      const request = transaction.objectStore('files').get(key)
      transaction.oncomplete = () => resolve(request.result instanceof ArrayBuffer ? request.result : undefined)
      transaction.onabort = () => reject(transaction.error)
      transaction.onerror = () => reject(transaction.error)
    })
  } finally { database.close() }
}

export async function writeLocal(key: string, bytes: Uint8Array): Promise<void> {
  const database = await open()
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction('files', 'readwrite')
      transaction.objectStore('files').put(new Uint8Array(bytes).buffer, key)
      transaction.oncomplete = () => resolve()
      transaction.onabort = () => reject(transaction.error)
      transaction.onerror = () => reject(transaction.error)
    })
  } finally { database.close() }
}
