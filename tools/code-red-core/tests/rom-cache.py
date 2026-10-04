"""Chromium player/IndexedDB regressions using synthetic bytes, never a real ROM.

Stub SHA-1 only for these 16 MB fixtures; production hashing remains unchanged.
Exercise the actual chooser, patch fetch, source persistence and reload path.
"""
from pathlib import Path
import functools, gzip, http.server, json, struct, subprocess, tempfile, threading
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[3]
with tempfile.TemporaryDirectory() as temp:
    out = Path(temp)
    entry = out / 'entry.ts'
    entry.write_text(f'''import {{mount}} from '{root}/src/things/pokemon-code-red/player.ts';
import {{readLocal, writeLocal, SOURCE_KEY, ROM_KEY, STATE_KEY}} from '{root}/src/things/pokemon-code-red/storage.ts';
import {{BASE_SHA1, MOD_SHA1, ROM_SIZE}} from '{root}/src/things/pokemon-code-red/patch.ts';
const nativeDigest = crypto.subtle.digest.bind(crypto.subtle);
crypto.subtle.digest = async (algorithm, buffer) => {{
  const bytes = new Uint8Array(buffer);
  if (bytes.length !== ROM_SIZE) return nativeDigest(algorithm, buffer);
  const hash = bytes[0] === 1 ? BASE_SHA1 : bytes[0] === 2 ? MOD_SHA1 : '0'.repeat(40);
  return new Uint8Array(hash.match(/../g).map(pair => parseInt(pair, 16))).buffer;
}};
Object.assign(window, {{readLocal, writeLocal, SOURCE_KEY, ROM_KEY, STATE_KEY}});
mount(document.querySelector('[data-code-red]'));
''')
    subprocess.run([root / 'node_modules/.bin/esbuild', entry, '--bundle', '--format=esm', '--outfile=' + str(out / 'player.js')], check=True)
    (out / 'index.html').write_text('''<section data-code-red>
<div data-open hidden><button data-choose>Choose</button><input data-file type="file"></div>
<p data-status></p><p data-error hidden></p><div id="code-red-game" data-game hidden></div>
<div data-save-bar hidden><button data-save disabled>Save</button></div></section>
<script type="module" src="/player.js"></script>''')
    # Copy-only patch fixture: produces tag 2 from source tag 1, without ROM bytes.
    patch = gzip.compress(b'CRCP1' + struct.pack('<II', 16 * 1024 * 1024, 2) + struct.pack('<IIII', 1, 1, 0, 16 * 1024 * 1024 - 1))
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *_): pass
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=temp))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
        page = browser.new_page()
        requests = []
        page.on('request', lambda request: requests.append((request.method, request.url)))
        page.route('**/code-red-emulator/loader.js', lambda route: route.fulfill(body='window.fixtureStarted = true', content_type='text/javascript'))
        page.route('**/code-red-mailbox.copy.bin', lambda route: route.fulfill(body=patch, content_type='application/octet-stream'))
        url = f'http://127.0.0.1:{server.server_port}'
        page.goto(url)
        page.wait_for_function('!document.querySelector("[data-file]").disabled')
        fixture = bytearray(16 * 1024 * 1024); fixture[0:2] = b'\x01\x02'
        payload = {'name': 'synthetic-source.gba', 'mimeType': 'application/octet-stream', 'buffer': bytes(fixture)}
        # The original survives even if the first patch request fails.
        page.route('**/code-red-mailbox.copy.bin', lambda route: route.fulfill(status=503, body='offline'))
        page.locator('[data-file]').set_input_files(payload)
        page.wait_for_function('!document.querySelector("[data-error]").hidden')
        assert page.evaluate('readLocal(SOURCE_KEY).then(b => new Uint8Array(b)[0])') == 1
        assert page.locator('[data-file]').input_value() == ''
        page.unroute('**/code-red-mailbox.copy.bin')
        page.route('**/code-red-mailbox.copy.bin', lambda route: route.fulfill(body=patch))
        page.reload(); page.wait_for_function('window.fixtureStarted')
        assert page.evaluate('readLocal(SOURCE_KEY).then(b => new Uint8Array(b)[0])') == 1
        assert page.evaluate('readLocal(ROM_KEY).then(b => new Uint8Array(b)[0])') == 2
        patch_count = lambda: len([r for r in requests if r[1].endswith('code-red-mailbox.copy.bin')])
        assert patch_count() == 2
        page.reload(); page.wait_for_function('window.fixtureStarted')
        assert patch_count() == 2  # Current cache avoids another patch fetch.
        page.evaluate('''async () => {
          await writeLocal('rom:old-build', new Uint8Array([7]));
          await writeLocal('state:old-build:old-core', new Uint8Array([8]));
          await writeLocal(STATE_KEY, new Uint8Array([9]));
          await writeLocal(ROM_KEY, new Uint8Array([0]));
        }''')
        page.reload(); page.wait_for_function('window.fixtureStarted')
        assert patch_count() == 3  # Missing/invalid current build is regenerated.
        for key, tag in [('rom:old-build', 7), ('state:old-build:old-core', 8)]:
            assert page.evaluate('(key) => readLocal(key).then(b => new Uint8Array(b)[0])', key) == tag
        assert page.evaluate('readLocal(STATE_KEY).then(b => new Uint8Array(b)[0])') == 9
        # Fail a new patch attempt, keep the original, and retry on reload.
        page.evaluate('writeLocal(ROM_KEY, new Uint8Array([0]))')
        page.route('**/code-red-mailbox.copy.bin', lambda route: route.fulfill(status=503, body='offline'))
        page.reload(); page.wait_for_function('!document.querySelector("[data-file]").disabled')
        assert 'patch could not load' in page.locator('[data-status]').inner_text()
        assert page.evaluate('readLocal(SOURCE_KEY).then(b => new Uint8Array(b)[0])') == 1
        page.unroute('**/code-red-mailbox.copy.bin')
        page.route('**/code-red-mailbox.copy.bin', lambda route: route.fulfill(body=patch))
        page.reload(); page.wait_for_function('window.fixtureStarted')
        # Eviction/corruption leaves an enabled chooser; a fresh selection recovers.
        page.evaluate('''async () => {
          await writeLocal(ROM_KEY, new Uint8Array([0]));
          await writeLocal(SOURCE_KEY, new Uint8Array([0]));
        }''')
        page.reload(); page.wait_for_function('!document.querySelector("[data-file]").disabled')
        assert page.locator('[data-open]').is_visible()
        page.locator('[data-file]').set_input_files(payload)
        page.wait_for_function('window.fixtureStarted')
        assert all(method == 'GET' for method, _ in requests)
        print(json.dumps({'originalRetained': True, 'reloadUsesCurrentCache': True,
                          'upgradeRepatchesLocalSource': True, 'oldSavesUnchanged': True,
                          'patchFailureRetry': True, 'evictionChooserRecovery': True,
                          'noRomUpload': True}, indent=2))
        browser.close()
    server.shutdown()
