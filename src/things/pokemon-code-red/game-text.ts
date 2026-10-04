export interface TextCore {
  HEAPU8: Uint8Array
  _malloc(bytes: number): number
  _free(pointer: number): void
  _ejs_code_red_epoch(): number
  _ejs_code_red_text_snapshot(pointer: number, capacity: number): number
  _ejs_code_red_text_write(epoch: number, session: number, sequence: number, action: number, pointer: number, length: number): number
}

/** A fixed naming-screen transport, never a general memory or script interface. */
export function bindGameText(game: HTMLElement, core: TextCore, release: () => void, blocked: () => boolean = () => false) {
  const panel = document.createElement('form')
  panel.className = 'code-red-text-entry'
  panel.hidden = true
  panel.innerHTML = `<label>Game name <input data-name type="text" inputmode="text" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" /></label><button type="submit">Done</button><button type="button" data-controller>Use game controls</button><small data-name-status role="status">Type a name here, then press Enter or Done. Tap the field to use your phone keyboard.</small>`
  game.before(panel)
  const input = panel.querySelector<HTMLInputElement>('input')!
  const status = panel.querySelector<HTMLElement>('[data-name-status]')!
  const pointer = core._malloc(76)
  if (!pointer) { panel.remove(); throw Error('Name entry allocation failed') }
  let epoch = 0, session = 0, sequence = 0, lastSent = 0, active = false, confirming = false, disposed = false, hiddenForSession = false, lastValidText = ''
  const valid = (value = input.value) => /^[A-Za-z0-9 .,!?/\-'" ]*$/.test(value) && value.length <= input.maxLength
  const send = (action: number, value = input.value) => {
    if (!active || !valid(value)) { status.textContent = 'Use letters, numbers, spaces, or . , ! ? / - and quotes.'; return false }
    const bytes = new TextEncoder().encode(value)
    if (bytes.length > input.maxLength) return false
    core.HEAPU8.fill(0, pointer + 60, pointer + 76)
    core.HEAPU8.set(bytes, pointer + 60)
    const next = ++sequence
    const accepted = core._ejs_code_red_text_write(epoch, session, next, action, pointer + 60, bytes.length)
    if (accepted) { lastValidText = value; lastSent = next; status.textContent = action === 2 ? 'Finishing name…' : 'Enter or Done confirms. Escape returns to game controls.' }
    else { confirming = false; status.textContent = 'Name entry changed. Try again.' }
    return Boolean(accepted)
  }
  const reveal = () => { if (!active) return; hiddenForSession = false; panel.hidden = false; release(); input.focus({ preventScroll: true }) }
  const controller = () => { if (active) send(1, valid() ? input.value : lastValidText); hiddenForSession = true; panel.hidden = true; confirming = false; input.blur(); game.focus({ preventScroll: true }) }
  const edit = () => { confirming = false; if (!valid()) { send(1, lastValidText); status.textContent = `Use up to ${input.maxLength} letters, numbers, spaces, or . , ! ? / - and quotes.` } else send(1) }
  input.addEventListener('input', event => { if (!(event as InputEvent).isComposing) edit() })
  input.addEventListener('compositionend', edit)
  panel.addEventListener('submit', event => { event.preventDefault(); if (send(1)) confirming = true })
  panel.querySelector<HTMLButtonElement>('[data-controller]')!.onclick = controller
  panel.addEventListener('keydown', event => { event.stopPropagation(); if (event.key === 'Escape') { event.preventDefault(); controller() } })
  panel.addEventListener('keyup', event => event.stopPropagation())
  const key = (event: KeyboardEvent) => {
    if (blocked() || (event.target instanceof Element && event.target.closest('input, textarea, select, button, a, [contenteditable], [role="textbox"]')) || !active || event.isComposing || event.ctrlKey || event.metaKey || event.altKey || !game.contains(document.activeElement)) return
    if (event.key.length !== 1 && event.key !== 'Backspace' && event.key !== 'Enter') return
    event.preventDefault(); event.stopImmediatePropagation(); reveal()
    if (event.key === 'Enter') { if (send(1)) confirming = true }
    else if (event.key === 'Backspace') { input.value = input.value.slice(0, -1); send(1) }
    else if (input.value.length < input.maxLength) { input.value += event.key; send(1) }
  }
  game.addEventListener('keydown', key, true)
  const poll = () => {
    if (disposed) return
    if (document.hidden) { confirming = false; return }
    const now = core._ejs_code_red_epoch()
    if (!core._ejs_code_red_text_snapshot(pointer, 60)) {
      const restore = active && document.activeElement === input
      active = false; confirming = false; panel.hidden = true
      if (restore) game.focus({ preventScroll: true })
      return
    }
    const view = new DataView(core.HEAPU8.buffer, pointer, 60)
    const next = view.getUint32(8, true), ack = view.getUint32(20, true)
    const fresh = !active || now !== epoch || next !== session
    if (fresh) {
      epoch = now; session = next; sequence = Math.max(ack, view.getUint32(16, true)); lastSent = ack
      confirming = false; hiddenForSession = false
      input.maxLength = view.getUint8(7)
      input.value = new TextDecoder().decode(core.HEAPU8.slice(pointer + 28, pointer + 28 + view.getUint8(27)))
      lastValidText = input.value
      status.textContent = 'Type a name here, then press Enter or Done. Tap the field to use your phone keyboard.'
      active = true; panel.hidden = false
      if (navigator.maxTouchPoints === 0 && !blocked()) reveal()
    } else if (ack >= lastSent && !confirming && document.activeElement !== input) {
      input.value = new TextDecoder().decode(core.HEAPU8.slice(pointer + 28, pointer + 28 + view.getUint8(27)))
    }
    if (confirming && ack >= lastSent && view.getUint8(24) === 0) { confirming = false; send(2) }
    if (hiddenForSession) panel.hidden = true
  }
  const leave = () => { confirming = false; if (active) send(1, valid() ? input.value : lastValidText); release() }
  const hide = () => { if (document.hidden) leave() }
  document.addEventListener('visibilitychange', hide)
  window.addEventListener('pagehide', leave)
  window.addEventListener('blur', leave)
  const timer = setInterval(poll, 16)
  poll()
  return { dispose() {
    if (disposed) return
    disposed = true; clearInterval(timer); document.removeEventListener('visibilitychange', hide); window.removeEventListener('pagehide', leave); window.removeEventListener('blur', leave); game.removeEventListener('keydown', key, true); panel.remove(); core._free(pointer)
  } }
}
