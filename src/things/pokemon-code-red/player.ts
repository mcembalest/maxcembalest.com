import { bindGameLifecycle, type LifecycleGame } from './game-lifecycle'
import { createRepl } from './repl'
import { bindGameText, type TextCore } from './game-text'
import { BASE_SHA1, MOD_SHA1, ROM_SIZE, sha1 } from './patch'
import { bindGameKeyboard, type GameInput } from './keyboard'
import { applyCopyPatch } from './copy-patch'
import { restoreRom } from './rom-cache'
import { readLocal, writeLocal, ROM_KEY, SOURCE_KEY, STATE_KEY } from './storage'

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
  EJS_paths?: Record<string, string>
  EJS_defaultOptions?: Record<string, string>
  EJS_Buttons?: Record<string, boolean | { visible?: boolean; displayName?: string }>
  EJS_onGameStart?: () => void
  EJS_emulator?: { on(event: string, callback: () => void): void; paused: boolean; pause(dontUpdate?: boolean): void; play(dontUpdate?: boolean): void; settingsMenu: HTMLElement; controlPopup: HTMLElement; isPopupOpen(): boolean; gameManager: GameInput & { getState(): Uint8Array; loadState(bytes: Uint8Array): void } }
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
  let repl: ReturnType<typeof createRepl> | undefined
  let lifecycle: ReturnType<typeof bindGameLifecycle> | undefined
  let naming: ReturnType<typeof bindGameText> | undefined
  let consoleActive = false, resumeConsole = false
  const resume = () => { consoleActive = false; if (resumeConsole && !document.hidden) { resumeConsole = false; emulator.EJS_emulator?.play(true) } }
  document.addEventListener('visibilitychange', () => { if (!document.hidden && !consoleActive) resume() })
  let keyboard: ReturnType<typeof bindGameKeyboard> | undefined
  let mailbox: { dispose(): void; cancel(reply?: boolean): void } | undefined
  let loaded = false
  let remembered = false
  let gameUrl: string | undefined
  window.addEventListener('pagehide', (event) => { if (event.persisted) { keyboard?.release(); return }; keyboard?.dispose(); lifecycle?.dispose(); naming?.dispose(); mailbox?.dispose(); repl?.dispose(); if (gameUrl) URL.revokeObjectURL(gameUrl) })
  root.querySelector<HTMLButtonElement>('[data-choose]')!.onclick = () => input.click()

  async function start(bytes: Uint8Array) {
    let saved: ArrayBuffer | undefined
    try { saved = await readLocal(STATE_KEY) } catch { /* Play still works without storage. */ }
    gameUrl = URL.createObjectURL(new Blob([new Uint8Array(bytes).buffer], { type: 'application/octet-stream' }))
    emulator.EJS_player = '#code-red-game'
    emulator.EJS_core = 'gba'
    emulator.EJS_gameName = 'Pokemon Code Red PC mailbox v2'
    emulator.EJS_gameUrl = gameUrl
    emulator.EJS_pathtodata = '/code-red-emulator/'
    emulator.EJS_DEBUG_XX = true
    emulator.EJS_startOnLoaded = true
    emulator.EJS_disableDatabases = true
    emulator.EJS_threads = false
    emulator.EJS_paths = { 'mgba-wasm.data': '/code-red-emulator/cores/code-red-mgba-wasm.data' }
    emulator.EJS_defaultOptions = { 'webgl2Enabled': 'enabled', 'virtual-gamepad': navigator.maxTouchPoints > 0 ? 'enabled' : 'disabled' }
    emulator.EJS_Buttons = {
      cheat: false, gamepad: false, cacheManager: false, netplay: false, diskButton: false,
      screenRecord: false, screenshot: false, quickSave: false, quickLoad: false,
      saveSavFiles: false, loadSavFiles: false,
      saveState: { displayName: 'Export save' }, loadState: { displayName: 'Import save' },
    }
    emulator.EJS_onGameStart = async () => {
      try {
        const path = '/code-red-runner/mailbox.js'
        const { MailboxController } = await import(/* @vite-ignore */ path)
        const runnerPath = '/code-red-runner/client.js'
        const { Runner } = await import(/* @vite-ignore */ runnerPath)
        let finish: ((result?: number) => void) | undefined
        repl = createRepl({ runner: new Runner(), onClose: (value) => { const done = finish; finish = undefined; done?.(value); resume() } })
        mailbox = new MailboxController(emulator.EJS_emulator!.gameManager.Module, undefined, {
          open: (request: { stats: number[]; epoch: number; id: number }, done: (result?: number) => void) => {
            keyboard?.release(); finish = done; consoleActive = true
            const current = emulator.EJS_emulator!
            resumeConsole = !current.paused; current.pause(true)
            repl!.open(request.stats, `${request.epoch}:${request.id}`)
          },
          close: () => { finish = undefined; repl?.close(); resume() },
        })
        lifecycle = bindGameLifecycle(emulator.EJS_emulator!.gameManager as unknown as LifecycleGame, () => { if (consoleActive) { mailbox?.cancel(true); keyboard?.release() } })
        naming = bindGameText(game, emulator.EJS_emulator!.gameManager.Module as unknown as TextCore, () => keyboard?.release(), () => consoleActive || emulator.EJS_emulator!.isPopupOpen() || emulator.EJS_emulator!.settingsMenu.style.display !== 'none')
        keyboard = bindGameKeyboard(game, emulator.EJS_emulator!.gameManager, () => {
          const current = emulator.EJS_emulator!
          return consoleActive || current.settingsMenu.style.display !== 'none' || current.isPopupOpen() || current.controlPopup.parentElement!.parentElement!.getAttribute('hidden') === null
        })
        emulator.EJS_emulator!.on('exit', () => { keyboard?.dispose(); lifecycle?.dispose(); naming?.dispose(); mailbox?.dispose(); repl?.dispose(); save.disabled = true })
      } catch {
        status.textContent = 'The calculation bridge could not start. Reload to try again.'
        return
      }
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
      let sourceRemembered = false
      if (digest === BASE_SHA1) {
        // Retain the verified original even if fetching/applying this build fails.
        try { await writeLocal(SOURCE_KEY, bytes); sourceRemembered = true } catch { /* Play can continue without storage. */ }
        bytes = await patchSource(bytes)
      } else if (digest !== MOD_SHA1) {
        throw new Error('Choose the original FireRed USA English v1.0 file or this mailbox build. Earlier Code Red builds and their emulator states cannot be resumed with this version.')
      }
      try { await writeLocal(ROM_KEY, bytes); remembered = true } catch { remembered = sourceRemembered }
      await start(bytes)
    } catch (problem) {
      input.disabled = false
      input.value = ''
      status.textContent = ''
      error.textContent = problem instanceof Error ? problem.message : 'Could not open this file.'
      error.hidden = false
    }
  })

  async function patchSource(bytes: Uint8Array): Promise<Uint8Array<ArrayBuffer>> {
    const response = await fetch('/code-red-mailbox.copy.bin')
    if (!response.ok) throw new Error('The patch could not load. Reload and try again.')
    const compressed = await response.arrayBuffer()
    const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'))
    const patch = new Uint8Array(await new Response(stream).arrayBuffer())
    const patched = applyCopyPatch(bytes, patch)
    if (await sha1(patched) !== MOD_SHA1) throw new Error('Patch verification failed. Reload and try again.')
    return patched
  }

  // Avoid a chooser/cache startup race while IndexedDB and hashing are pending.
  input.disabled = true
  void (async () => {
    try {
      const restored = await restoreRom({ read: readLocal, write: writeLocal, patch: patchSource })
      if (restored) {
        remembered = restored.remembered
        await start(restored.bytes)
        return
      }
      status.textContent = 'Choose your original FireRed file once to remember it for future updates. Earlier builds and their saved states remain stored separately.'
    } catch (problem) {
      status.textContent = problem instanceof Error ? problem.message : 'Could not restore the game. Reload to try again.'
    }
    input.disabled = false
    chooser.hidden = false
  })()
}
