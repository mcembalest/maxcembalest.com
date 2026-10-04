"""Real Chromium bfcache navigation using player lifecycle and actual mailbox polling."""
from pathlib import Path
import functools, http.server, json, subprocess, tempfile, threading
from playwright.sync_api import sync_playwright
root = Path(__file__).resolve().parents[3]
with tempfile.TemporaryDirectory() as temp:
 out = Path(temp)
 source = (root/'src/things/pokemon-code-red/player.ts').read_text()
 source = source.replace("import { BASE_SHA1, MOD_SHA1, ROM_SIZE, sha1 } from './patch'", "const BASE_SHA1='base', MOD_SHA1='mod', ROM_SIZE=1;const sha1=async()=>MOD_SHA1")
 source = source.replace("import { readLocal, writeLocal, ROM_KEY, SOURCE_KEY, STATE_KEY } from './storage'", "const ROM_KEY='rom',SOURCE_KEY='source',STATE_KEY='state';const readLocal=async()=>undefined;const writeLocal=async()=>{}")
 source = source.replace("import { restoreRom } from './rom-cache'", "const restoreRom=async()=>({bytes:new Uint8Array([1]),remembered:true})")
 source = source.replace("from './", "from '"+str(root/'src/things/pokemon-code-red')+'/')
 (out/'player.ts').write_text(source)
 subprocess.run([root/'node_modules/.bin/esbuild',out/'player.ts','--bundle','--format=esm','--outfile='+str(out/'player.js')],check=True)
 (out/'code-red-runner').mkdir();(out/'code-red-emulator').mkdir()
 subprocess.run([root/'node_modules/.bin/esbuild',root/'tools/code-red-runner/mailbox.js','--bundle','--format=esm','--outfile='+str(out/'code-red-runner/actual.js')],check=True)
 (out/'code-red-runner'/'client.js').write_text('export class Runner {constructor(){return window.runner}}')
 (out/'code-red-runner'/'mailbox.js').write_text("import {MailboxController as Actual} from './actual.js';export class MailboxController extends Actual{constructor(m,_runner,interactive){super(m,window.runner,interactive);window.mailbox=this}}")
 (out/'code-red-emulator'/'loader.js').write_text('''window.EJS_emulator={paused:false,pause(){this.paused=true},play(){this.paused=false},gameManager:gm,settingsMenu:Object.assign(document.createElement('div'),{style:'display:none'}),controlPopup:document.querySelector('#control'),isPopupOpen:()=>false,on:(name,cb)=>window.exit=cb};EJS_onGameStart();''')
 (out/'away.html').write_text('<title>Away</title><a href="/">Return</a>')
 (out/'index.html').write_text('''<title>Player</title><link rel="stylesheet" href="/player.css"><main id="root"><input data-file type="file"><div data-open><button data-choose>Choose</button></div><p data-status></p><p data-error></p><div data-game id="code-red-game" style="height:150px;background:#abc"><div hidden><div><span id="control"></span></div></div></div><div data-save-bar hidden><button data-save>Save</button></div></main><a id="away" href="/away.html">Navigate away</a><script type="module">
import {mount} from './player.js';window.shows=[];window.hides=[];addEventListener('pageshow',e=>shows.push(e.persisted));addEventListener('pagehide',e=>hides.push(e.persisted));window.frees=0;window.polls=0;window.replies=[];window.jobs=[];window.cancelled=0;window.runner={run:()=>new Promise(resolve=>jobs.push(resolve)),cancel:()=>cancelled++,dispose:()=>{window.runnerDisposed=true}};window.request=null;window.nextPointer=8;window.gm={Module:{HEAPU8:new Uint8Array(256),_malloc:(bytes)=>{const pointer=nextPointer;nextPointer+=bytes;return pointer},_free:()=>frees++,_ejs_code_red_epoch:()=>1,_ejs_code_red_text_snapshot:()=>0,_ejs_code_red_text_write:()=>0,_ejs_code_red_snapshot:(ptr)=>{polls++;if(!request)return 0;const v=new DataView(gm.Module.HEAPU8.buffer,ptr,36);v.setUint32(0,826561091,true);v.setUint16(4,1,true);v.setUint16(6,1,true);v.setUint32(8,request,true);v.setUint32(12,1,true);v.setUint16(16,1,true);[45,49,49,65,65,45].forEach((n,i)=>v.setUint16(20+i*2,n,true));return 1},_ejs_code_red_reply:(epoch,id,status,value)=>{if(request!==id)return 0;replies.push([epoch,id,status,value]);request=null;return 1}},simulateInput:()=>{},functions:{setFastForwardRatio:()=>{},toggleFastForward:()=>{}}};mount(document.querySelector('#root'));
</script>''')
 class Quiet(http.server.SimpleHTTPRequestHandler):
  def log_message(self,*_): pass
 server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=temp));threading.Thread(target=server.serve_forever,daemon=True).start()
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'],ignore_default_args=['--disable-back-forward-cache'])
  # CDP/Playwright event subscriptions can evict bfcache; navigate via DOM and history.
  page=browser.new_page();url=f'http://127.0.0.1:{server.server_port}/';page.goto(url);page.wait_for_function('window.mailbox && !document.querySelector("[data-save]").disabled')
  page.evaluate('request=1');page.wait_for_function('jobs.length===1');page.locator('#away').click();page.wait_for_url('**/away.html');page.evaluate('history.back()');page.wait_for_function('location.pathname==="/" && window.shows && shows.length===2')
  assert page.evaluate('shows.at(-1)') is True, page.evaluate('shows')
  assert page.evaluate('hides')==[True]
  assert page.evaluate('frees')==0
  assert page.evaluate('mailbox.disposed || false') is False
  assert page.evaluate('replies')==[[1,1,2,0]]
  before=page.evaluate('polls');page.wait_for_function(f'polls>{before}')
  page.evaluate('jobs[0]({ok:true,value:999})');page.wait_for_timeout(50);assert page.evaluate('replies')==[[1,1,2,0]]
  page.evaluate('request=2');page.wait_for_function('jobs.length===2');page.evaluate('jobs[1]({ok:true,value:318})');page.wait_for_function('replies.length===2');assert page.evaluate('replies.at(-1)')==[1,2,0,318]
  page.evaluate('window.dispatchEvent(new PageTransitionEvent("pagehide",{persisted:false}))');assert page.evaluate('frees')==2;assert page.evaluate('runnerDisposed') is True
  print(json.dumps({'actualBackForwardCached':True,'pollingResumes':True,'pendingCancelled':True,'staleReplyRejected':True,'next318Accepted':True,'allocationPreservedUntilExit':True},indent=2));browser.close()
 server.shutdown()
