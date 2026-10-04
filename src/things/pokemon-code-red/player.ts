import { applyIps, BASE_SHA1, MOD_SHA1, ROM_SIZE, sha1 } from './patch'

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
  EJS_onGameStart?: () => void
}

export function mount(root: HTMLElement) {
  const input = root.querySelector<HTMLInputElement>('[data-file]')!
  const status = root.querySelector<HTMLElement>('[data-status]')!
  const error = root.querySelector<HTMLElement>('[data-error]')!
  const game = root.querySelector<HTMLElement>('[data-game]')!
  const choose = root.querySelector<HTMLElement>('.code-red-choose')!
  let loaded = false
  let gameUrl: string | undefined
  window.addEventListener('pagehide', () => { if (gameUrl) URL.revokeObjectURL(gameUrl) })

  input.addEventListener('change', async () => {
    const file = input.files?.[0]
    if (!file || loaded) return
    error.hidden = true
    input.disabled = true
    status.textContent = 'Checking your FireRed file…'
    try {
      if (!file.name.toLowerCase().endsWith('.gba') || file.size !== ROM_SIZE) {
        throw new Error('Choose a 16 MB FireRed USA English v1.0 .gba file from Files.')
      }
      let bytes = new Uint8Array(await file.arrayBuffer())
      const digest = await sha1(bytes)
      if (digest === BASE_SHA1) {
        status.textContent = 'Applying the Code Red patch on your device…'
        const response = await fetch('/code-red-starter.ips')
        if (!response.ok) throw new Error('The starter patch could not load. Reload and try again.')
        bytes = new Uint8Array(applyIps(bytes, new Uint8Array(await response.arrayBuffer())))
        if (await sha1(bytes) !== MOD_SHA1) throw new Error('Patch verification failed. Reload and try again.')
      } else if (digest !== MOD_SHA1) {
        throw new Error('This is a different game or revision. Choose FireRed USA English v1.0; v1.1 and other mods are not supported.')
      }
      // Only a local Blob URL is given to the emulator. No game upload or hosted ROM URL.
      gameUrl = URL.createObjectURL(new Blob([new Uint8Array(bytes).buffer], { type: 'application/octet-stream' }))
      const emulator = window as EmulatorWindow
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
      emulator.EJS_onGameStart = () => {
        status.textContent = 'Playing Code Red. Use the menu to export your save.'
        game.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
      game.hidden = false
      status.textContent = 'Starting the game…'
      const script = document.createElement('script')
      script.src = '/code-red-emulator/loader.js'
      script.onerror = () => {
        status.textContent = 'The player could not start.'
        error.textContent = 'Emulator files could not load. Reload this page and choose your file again.'
        error.hidden = false
      }
      document.body.appendChild(script)
      loaded = true
      choose.textContent = 'Reload page to choose another file'
      choose.removeAttribute('for')
    } catch (problem) {
      input.disabled = false
      status.textContent = 'No game file loaded.'
      error.textContent = problem instanceof Error ? problem.message : 'Could not read this file. Try again.'
      error.hidden = false
    }
  })
}
