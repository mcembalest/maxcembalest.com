"""Real Chromium focus/typing/scroll/repeat/cleanup checks for the keyboard binding."""
from pathlib import Path
import functools,http.server,json,subprocess,threading,tempfile
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[3]
with tempfile.TemporaryDirectory() as temp:
 out=Path(temp)
 subprocess.run([root/'node_modules/.bin/esbuild',root/'src/things/pokemon-code-red/keyboard.ts','--bundle','--format=esm','--outfile='+str(out/'keyboard.js')],check=True)
 (out/'index.html').write_text('''<style>body{height:3500px}#game{height:150px;width:400px;background:#abc}textarea{display:block}</style><button id="outside">Outside</button><textarea id="typing"></textarea><div id="game"><input id="game-form"></div><script type="module">import {bindGameKeyboard} from './keyboard.js';window.calls=[];window.epoch=1;window.gm={simulateInput:(...a)=>calls.push(['input',...a]),functions:{setFastForwardRatio:r=>calls.push(['ratio',r]),toggleFastForward:v=>calls.push(['speed',v])},Module:{_ejs_code_red_epoch:()=>epoch}};window.menuOpen=false;window.binding=bindGameKeyboard(document.querySelector('#game'),gm,()=>menuOpen);window.ready=true;</script>''')
 class Quiet(http.server.SimpleHTTPRequestHandler):
  def log_message(self,*_):pass
 server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=temp));threading.Thread(target=server.serve_forever,daemon=True).start()
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=b.new_page()
  page.goto(f'http://127.0.0.1:{server.server_port}');page.wait_for_function('ready')
  game=page.locator('#game');game.click(position={'x':250,'y':80})
  y=page.evaluate('scrollY');page.keyboard.down('ArrowDown');page.keyboard.down('Space');page.keyboard.down('Space');page.wait_for_timeout(150)
  assert page.evaluate('scrollY')==y
  assert page.evaluate('calls.filter(c=>c[0]==="speed"&&c[1]===1).length')==1
  assert page.evaluate('calls.some(c=>c[0]==="ratio"&&c[1]===10)')
  page.keyboard.up('Space');page.keyboard.up('ArrowDown');assert page.evaluate('calls.some(c=>c[0]==="speed"&&c[1]===0)')
  page.keyboard.down('Space');page.keyboard.down('ArrowLeft');page.locator('#outside').click()
  assert page.evaluate('calls.at(-1)')==['input',0,6,0]
  page.keyboard.up('Space');page.keyboard.up('ArrowLeft');page.keyboard.press('ArrowDown');page.wait_for_timeout(200);assert page.evaluate('scrollY')>y
  page.locator('#typing').fill('');page.locator('#typing').focus();before=page.evaluate('calls.length');page.keyboard.type('z x hello world');page.keyboard.press('ArrowLeft');assert page.locator('#typing').input_value()=='z x hello world';assert page.evaluate('calls.length')==before
  page.locator('#game-form').focus();before=page.evaluate('calls.length');page.keyboard.type('typing inside game');page.keyboard.press('ArrowRight');assert page.locator('#game-form').input_value()=='typing inside game';assert page.evaluate('calls.length')==before
  for trigger in ['window.dispatchEvent(new Event("blur"))','Object.defineProperty(document,"hidden",{configurable:true,get:()=>true});document.dispatchEvent(new Event("visibilitychange"))','epoch++']:
   page.evaluate('Object.defineProperty(document,"hidden",{configurable:true,get:()=>false})');game.click(position={'x':250,'y':80});page.keyboard.down('Space');page.keyboard.down('ArrowUp');page.evaluate(trigger);page.wait_for_timeout(50)
   assert page.evaluate('calls.at(-1)')==['input',0,4,0]
   page.keyboard.up('Space');page.keyboard.up('ArrowUp')
  # Window/tab restoration keeps DOM focus without requiring another click.
  for trigger in ['window.dispatchEvent(new Event("blur"));window.dispatchEvent(new Event("focus"))','Object.defineProperty(document,"hidden",{configurable:true,get:()=>true});document.dispatchEvent(new Event("visibilitychange"));Object.defineProperty(document,"hidden",{configurable:true,get:()=>false});document.dispatchEvent(new Event("visibilitychange"))','window.dispatchEvent(new PageTransitionEvent("pagehide",{persisted:true}));window.dispatchEvent(new PageTransitionEvent("pageshow",{persisted:true}))']:
   game.click(position={'x':250,'y':80});page.evaluate(trigger);assert page.evaluate('document.activeElement.id')=='game';before=page.evaluate('calls.filter(c=>c[0]==="speed"&&c[1]===1).length');page.keyboard.down('Space');assert page.evaluate('calls.filter(c=>c[0]==="speed"&&c[1]===1).length')==before+1;page.keyboard.up('Space')
  # Model the upstream bubble listener: menus must receive capture-bypassed keys.
  game.click(position={'x':250,'y':80});page.keyboard.down('ArrowLeft');page.evaluate('window.menuOpen=true;window.upstream=[];document.querySelector("#game").addEventListener("keydown",e=>upstream.push([e.code,e.defaultPrevented]))');before=page.evaluate('calls.length');page.keyboard.press('ArrowDown');page.keyboard.press('Space');assert page.evaluate('upstream')==[['ArrowDown',False],['Space',False]];assert page.evaluate('calls.slice('+str(before)+')')==[['input',0,6,0]];page.keyboard.up('ArrowLeft');page.evaluate('menuOpen=false')
  page.evaluate('binding.dispose();binding.dispose()');print(json.dumps({'holdSpace10x':True,'releaseNormal':True,'keyRepeatNoToggle':True,'focusedKeysNoScroll':True,'outsideRestoresScroll':True,'outsideAndInsideTypingPreserved':True,'blurHideResetReleases':True,'idempotentDispose':True,'windowAndTabRefocus':True,'persistedPageFocusRestored':True,'popupKeysReachUpstream':True},indent=2));b.close()
 server.shutdown()
