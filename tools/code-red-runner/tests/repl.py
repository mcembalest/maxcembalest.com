"""Real Chromium REPL interaction/stale-session checks plus actual bounded VM runs."""
from pathlib import Path
import functools, http.server, json, os, shutil, subprocess, tempfile, threading
from playwright.sync_api import sync_playwright
root = Path(__file__).resolve().parents[3]
deps = root/'node_modules'
if not deps.exists(): deps = Path('/workspace/code-red-site/node_modules')
with tempfile.TemporaryDirectory() as temp:
 out = Path(temp)
 executable = deps/'.bin/esbuild'
 subprocess.run([executable,root/'src/things/pokemon-code-red/repl.ts','--bundle','--format=esm','--outfile='+str(out/'repl.js')],check=True)
 (out/'runner').mkdir()
 environment = dict(os.environ, NODE_PATH=str(deps))
 subprocess.run([executable,root/'tools/code-red-runner/client.js',root/'tools/code-red-runner/worker.js','--bundle','--format=esm','--platform=browser','--outdir='+str(out/'runner')],env=environment,check=True)
 shutil.copyfile(deps/'@jitl/quickjs-wasmfile-release-sync/dist/emscripten-module.wasm',out/'runner/emscripten-module.wasm')
 (out/'index.html').write_text('''<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/repl.css"><button id="launch">Launch</button><div id="game" tabindex="0"></div><script type="module">
import {createRepl} from './repl.js';import {Runner} from './runner/client.js';window.closes=[];window.busies=[];window.calls=[];window.jobs=[];window.cancelCount=0;window.disposedCount=0;window.leakedKeys=[];document.querySelector('#game').addEventListener('keydown',e=>leakedKeys.push(e.key));document.addEventListener('keydown',e=>leakedKeys.push(e.key));window.mock={run:(source,input)=>{calls.push([source,input]);return new Promise(resolve=>jobs.push(resolve))},cancel:()=>cancelCount++,dispose:()=>disposedCount++};window.repl=createRepl({runner:mock,onClose:value=>closes.push(value??null),onBusy:value=>busies.push(value)});document.querySelector('#launch').onclick=()=>repl.open([45,49,49,65,65,45],'first');window.openReal=()=>{repl.dispose();window.actualRunner=new Runner();window.repl=createRepl({runner:actualRunner,onClose:value=>closes.push(value??null)});repl.open([45,49,49,65,65,45],'real')};window.ready=true;
</script>''')
 class Quiet(http.server.SimpleHTTPRequestHandler):
  def log_message(self,*_): pass
 server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=temp));threading.Thread(target=server.serve_forever,daemon=True).start()
 try:
  with sync_playwright() as p:
   browser=p.chromium.launch(executable_path=shutil.which('chromium'),args=['--no-sandbox']);page=browser.new_page(viewport={'width':390,'height':844});requests=[];page.on('request',lambda request:requests.append(request.url))
   origin=f'http://127.0.0.1:{server.server_port}';page.goto(origin);page.wait_for_function('ready');page.locator('#launch').click()
   editor=page.locator('[data-repl-source]');run=page.locator('[data-repl-run]');cancel=page.locator('[data-repl-cancel]');log=page.locator('[data-repl-transcript]')
   assert editor.get_attribute('inputmode')=='text'
   assert '318' not in log.inner_text()
   assert page.locator('[data-repl-input]').inner_text()=='input = {"stats":[45,49,49,65,65,45]}'
   editor.fill('1 + 2');editor.press('Shift+Enter');assert editor.input_value()=='1 + 2\n';assert page.evaluate('calls.length')==0
   editor.press('Enter');assert page.evaluate('calls[0][0]')=='return (\n1 + 2\n);';assert run.is_disabled();assert not cancel.is_disabled()
   page.evaluate('jobs[0]({ok:true,value:318})');page.wait_for_function('!document.querySelector("[data-repl-run]").disabled');assert '318' in log.inner_text()
   page.locator('[data-repl-mode]').select_option('statements');editor.fill('const x = input.stats[0]; return x;');run.click();assert page.evaluate('calls[1][0]')=='const x = input.stats[0]; return x;'
   cancel.click();assert 'Cancelled.' in log.inner_text();page.evaluate('jobs[1]({ok:true,value:999})');page.wait_for_timeout(30);assert '999' not in log.inner_text()
   run.click();editor.press('Escape');assert not page.locator('dialog').is_visible();assert page.evaluate('closes')==[318];assert page.evaluate('document.activeElement.id')=='launch'
   page.evaluate('repl.open([1,2,3,4,5,6],"second");jobs[2]({ok:true,value:777})');page.wait_for_timeout(30);assert log.inner_text()=='';assert run.is_enabled()
   editor.fill('"<img src=x onerror=alert(1)>"');run.click();page.evaluate('jobs[3]({ok:true,value:"<img src=x onerror=alert(1)>"})');page.wait_for_function('!document.querySelector("[data-repl-run]").disabled');assert log.locator('img').count()==0;assert '<img' in log.inner_text()
   for index in range(22):
    editor.fill(str(index));run.click();page.evaluate(f'jobs[{index+4}]({{ok:true,value:{index}}})');page.wait_for_function('!document.querySelector("[data-repl-run]").disabled')
   assert log.locator(':scope > div').count()==20
   assert page.evaluate('leakedKeys')==[]
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
   run.click();page.evaluate('repl.open([45,49,49,65,65,45],"reset-token");jobs[26]({ok:true,value:1234})');page.wait_for_timeout(30);assert log.inner_text()=='';assert run.is_enabled()
   run.click();page.evaluate('repl.dispose();jobs[27]({ok:true,value:1234})');assert page.locator('dialog').count()==0;assert page.evaluate('disposedCount')==1;assert page.evaluate('closes')==[318]
   page.evaluate('openReal()')
   def actual(code, mode='expression'):
    page.locator('[data-repl-mode]').select_option(mode);editor.fill(code);run.click();page.wait_for_function('!document.querySelector("[data-repl-run]").disabled');return log.locator(':scope > div').last.inner_text()
   assert '318' in actual('input.stats.reduce((sum,n)=>sum+n,0)')
   assert '7' in actual('globalThis.persist = 7; return persist;', 'statements')
   assert 'undefined' in actual('typeof persist')
   assert actual('[typeof fetch, typeof document, typeof EJS_emulator]').count('undefined')==3
   assert 'Error:' in actual('while(true){}', 'statements')
   assert 'Error:' in actual('Promise.resolve(42)')
   assert all(url.startswith(origin) for url in requests)
   print(json.dumps({'keyboardEditingAndSubmit':True,'cancelAndStaleReplies':True,'closeAndResetGuard':True,'jsonRenderedAsText':True,'transcriptBound20':True,'mobileNoOverflow':True,'actual318':True,'freshVMEachRun':True,'guestHostNamesAbsent':True,'boundedInfiniteLoopAndAsyncErrors':True,'localRequestsOnly':True},indent=2))
   browser.close()
 finally: server.shutdown()
