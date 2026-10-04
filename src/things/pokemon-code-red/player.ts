import { applyIps, BASE_SHA1, MOD_SHA1, ROM_SIZE, sha1 } from './patch'
import { readLocal, writeLocal, ROM_KEY, STATE_KEY } from './storage'

type EmulatorWindow = Window & {
  EJS_player?: string
  EJS_core?: string
  EJS_gameUrl?: string
  EJS_gameName?: string
  EJS_pathtodata?: string
  EJS_DEBUG_XX?: boolean
  EJS_startOnLoaded?: boolean
  EJS_disableDatabases?: boolean
  EJS_threads?: boolean
  EJS_defaultOptions?: Record<string, string>
  EJS_Buttons?: Record<string, boolean | { visible?: boolean; displayName?: string }>
  EJS_onGameStart?: () => void
  EJS_emulator?: { gameManager: { getState(): Uint8Array; loadState(bytes: Uint8Array): void } }
}

export function mount(root: HTMLElement) {
  const input = root.querySelector<HTMLInputElement>('[data-file]')!
  const chooser = root.querySelector<HTMLElement>('[data-open]')!
  const status = root.querySelector<HTMLElement>('[data-status]')!
  const error = root.querySelector<HTMLElement>('[data-error]')!
  const game = root.querySelector<HTMLElement>('[data-game]')!
  const saveBar = root.querySelector<HTMLElement>('[data-save-bar]')!
  const save = root.querySelector<HTMLButtonElement>('[data-save]')!
  const emulator = window as EmulatorWindow
  let loaded = false
  let remembered = false
  let gameUrl: string | undefined
  window.addEventListener('pagehide', () => { if (gameUrl) URL.revokeObjectURL(gameUrl) })
  root.querySelector<HTMLButtonElement>('[data-choose]')!.onclick = () => input.click()

  async function start(bytes: Uint8Array) {
    let saved: ArrayBuffer | undefined
    try { saved = await readLocal(STATE_KEY) } catch { /* Play still works without storage. */ }
    gameUrl = URL.createObjectURL(new Blob([new Uint8Array(bytes).buffer], { type: 'application/octet-stream' }))
    emulator.EJS_player = '#code-red-game'
    emulator.EJS_core = 'gba'
    emulator.EJS_gameName = 'Pokemon Code Red'
    emulator.EJS_gameUrl = gameUrl
    emulator.EJS_pathtodata = '/code-red-emulator/'
    emulator.EJS_DEBUG_XX = true
    emulator.EJS_startOnLoaded = true
    emulator.EJS_disableDatabases = true
    emulator.EJS_threads = false
    emulator.EJS_defaultOptions = { 'virtual-gamepad': navigator.maxTouchPoints > 0 ? 'enabled' : 'disabled' }
    emulator.EJS_Buttons = {
      cheat: false, gamepad: false, cacheManager: false, netplay: false, diskButton: false,
      screenRecord: false, screenshot: false, quickSave: false, quickLoad: false,
      saveSavFiles: false, loadSavFiles: false,
      saveState: { displayName: 'Export save' }, loadState: { displayName: 'Import save' },
    }
    emulator.EJS_onGameStart = () => {
      if (saved) {
        try {
          emulator.EJS_emulator!.gameManager.loadState(new Uint8Array(saved))
          status.textContent = 'Resumed on this browser.'
        } catch {
          status.textContent = 'The saved progress could not resume. Start a new game or import a backup.'
        }
      } else {
        status.textContent = remembered ? '' : 'Playing. Browser storage is unavailable; reopen the file next time.'
      }
      saveBar.hidden = false
      save.disabled = false
      game.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    chooser.hidden = true
    game.hidden = false
    status.textContent = 'Starting…'
    const script = document.createElement('script')
    script.src = '/code-red-emulator/loader.js'
    script.onerror = () => {
      status.textContent = 'The player could not start. Reload to try again.'
    }
    document.body.appendChild(script)
    loaded = true
  }

  save.onclick = async () => {
    save.disabled = true
    try {
      const bytes = emulator.EJS_emulator!.gameManager.getState()
      await writeLocal(STATE_KEY, bytes)
      status.textContent = 'Saved on this browser.'
    } catch {
      status.textContent = 'Could not save here. Use Export save in the game menu.'
    } finally { save.disabled = false }
  }

  input.addEventListener('change', async () => {
    const file = input.files?.[0]
    if (!file || loaded) return
    error.hidden = true
    input.disabled = true
    status.textContent = 'Opening…'
    try {
      if (!file.name.toLowerCase().endsWith('.gba') || file.size !== ROM_SIZE) {
        throw new Error('Choose a 16 MB FireRed USA English v1.0 .gba file.')
      }
      let bytes = new Uint8Array(await file.arrayBuffer())
      const digest = await sha1(bytes)
      if (digest === BASE_SHA1) {
        const response = await fetch('/code-red-starter.ips')
        if (!response.ok) throw new Error('The patch could not load. Reload and try again.')
        bytes = new Uint8Array(applyIps(bytes, new Uint8Array(await response.arrayBuffer())))
        if (await sha1(bytes) !== MOD_SHA1) throw new Error('Patch verification failed. Reload and try again.')
      } else if (digest !== MOD_SHA1) {
        throw new Error('Choose FireRed USA English v1.0. This game or revision is not supported.')
      }
      try { await writeLocal(ROM_KEY, bytes); remembered = true } catch { remembered = false }
      await start(bytes)
    } catch (problem) {
      input.disabled = false
      status.textContent = ''
      error.textContent = problem instanceof Error ? problem.message : 'Could not open this file.'
      error.hidden = false
    }
  })

  void (async () => {
    try {
      const stored = await readLocal(ROM_KEY)
      if (stored && stored.byteLength === ROM_SIZE && await sha1(new Uint8Array(stored)) === MOD_SHA1) {
        remembered = true
        await start(new Uint8Array(stored))
        return
      }
    } catch { /* First-run file choice also works when storage is blocked. */ }
    chooser.hidden = false
    status.textContent = ''
  })()
}
