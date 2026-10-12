import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
async function run({date='2026-03-05',offset=0,rows=[],quote=null,theme='dark',admin=false, replacement=null}={}) {
 const nodes=new Map(), opened=[], alerts=[], statusNodes=[]; let generated=false;
 function element(){return {style:{},children:[],innerHTML:'',textContent:'',className:'',disabled:false,listeners:{},setAttribute(){},addEventListener(event,fn){this.listeners[event]=fn;},appendChild(n){this.children.push(n);},after(){}};}
 const document={documentElement:{setAttribute(k,v){this[k]=v;}},getElementById(id){if(!nodes.has(id))nodes.set(id,element());return nodes.get(id);},querySelector(){const e=element();e.after=n=>statusNodes.push(n);return e;},createElement:element,addEventListener(){}};
 const fixed=new Date(`${date}T12:00:00`);
 class Clock extends Date {constructor(...a){super(...(a.length?a:[fixed]));}}
 const calls=[];
 const context={document,Date:Clock,localStorage:{getItem:k=>k==='theme'?theme:k==='admin_enabled'&&admin?'1':null},window:{open(url){opened.push(url);generated=true;return {};},location:{search:`?offset=${offset}`},addEventListener(){}},location:{reload(){}},URLSearchParams,console,setInterval(){},setTimeout(fn){fn();},AbortSignal,alert(message){alerts.push(message);},fetch:async url=>{
  calls.push(url);
  if(url.includes('gviz'))return {ok:true,text:async()=>`google.visualization.Query.setResponse(${JSON.stringify({table:{rows:rows.map(([kid,daily,weekly])=>({c:[{v:`Date(${fixed.getFullYear()},${fixed.getMonth()},${fixed.getDate()})`},{v:kid},{v:daily},{v:weekly}] }))}})});`};
  return {ok:!!quote,json:async()=>generated && replacement ? replacement : quote};
 }};
 vm.runInNewContext(script,context);
 await new Promise(resolve=>setImmediate(resolve));
 return {nodes,document,calls,opened,alerts,statusNodes};
}
test('four assignments keep requested order and untrusted content is escaped',async()=>{
 const {nodes,document,calls}=await run({date:'2026-03-06',rows:[['Stewart','<img onerror=alert(1)>','Weekly'],['Miles','Daily','Weekly'],['Turner','Daily','Weekly'],['Emmitt','Daily','Weekly']],quote:{date:'2026-03-06',title:'<script>bad</script>',message:'<img onerror=alert(1)>'}});
 assert.equal(document.documentElement['data-theme'],'noir');
 assert.match(nodes.get('chores-container').children[0].innerHTML,/Emmitt/);
 assert.match(nodes.get('chores-container').children[3].innerHTML,/&lt;img/);
 assert.match(nodes.get('daily-quote').innerHTML,/&lt;script/);
 assert.ok(calls.some(url=>url.includes(encodeURIComponent('select A,B,C,D'))));
 assert.equal(nodes.get('back-to-today-wrap').style.display,'none');
});
test('Thursday recycle pattern and navigation preserve selected date',async()=>{
 for(const [date,recycle] of [['2026-03-05',true],['2026-03-12',false],['2026-03-19',true]]){
  const {nodes,calls}=await run({date});
  assert.equal(nodes.get('trash-wrap').style.display,'block');
  assert.equal(nodes.get('recycle').style.display,recycle?'inline-block':'none');
  assert.ok(calls.every(url=>!url.startsWith('daily/')));
 }
 const {nodes}=await run({date:'2026-03-06',offset:-1});
 assert.equal(nodes.get('trash-wrap').style.display,'block');
 assert.equal(nodes.get('prev-day-link').href,'index.html?offset=-2');
 assert.equal(nodes.get('next-day-link').href,'index.html?offset=0');
 assert.equal(nodes.get('back-to-today-wrap').style.display,'inline');
});
test('duplicates and wrong-date daily content show honest error/fallback',async()=>{
 const {nodes}=await run({date:'2026-03-06',rows:[['Emmitt','one','two'],['Emmitt','three','four']],quote:{date:'2026-03-07',message:'wrong date'}});
 assert.match(nodes.get('chores-container').innerHTML,/duplicate/);
 assert.match(nodes.get('daily-quote').innerHTML,/No wisdom today/);
});

test('G without a webhook opens authenticated GitHub controls and verifies publication',async()=>{
 const result=await run({date:'2026-03-06',admin:true,quote:{date:'2026-03-06',title:'Before',message:'Old message'},replacement:{date:'2026-03-06',title:'After',message:'Published replacement'}});
 await result.nodes.get('adminFab').listeners.click();
 assert.deepEqual(result.opened,['https://github.com/HunterRockwell/chores/actions/workflows/daily-quote.yml']);
 assert.match(result.nodes.get('daily-quote').innerHTML,/Published replacement/);
 assert.equal(result.statusNodes[0].textContent,'New message published.');
 assert.equal(result.nodes.get('adminFab').disabled,false);
});
test('Thursday G blocks before opening a regeneration route',async()=>{
 const result=await run({date:'2026-03-05',admin:true});
 await result.nodes.get('adminFab').listeners.click();
 assert.equal(result.opened.length,0);
 assert.match(result.alerts[0],/Thursday/);
});
