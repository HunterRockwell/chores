import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { main, laNowParts, validateDate, extractOutputText } from '../.github/scripts/generate-daily-quote.mjs';
const response = {status:'completed', output:[{type:'reasoning'}, {type:'message',content:[{type:'output_text',text:JSON.stringify({title:'Dad says',message:'Clean first. Complain with a spotless floor.'})}]}]};
const mockFetch = async () => ({ok:true,json:async()=>response});
function temp(t) { const dir=fs.mkdtempSync(path.join(os.tmpdir(),'chores-')); t.after(()=>fs.rmSync(dir,{recursive:true})); return dir; }
test('raw Responses output is parsed and incomplete/refused output rejected',()=>{
 assert.match(extractOutputText(response),/Clean first/);
 assert.throws(()=>extractOutputText({...response,status:'incomplete'}));
 assert.throws(()=>extractOutputText({output:[]}));
});
test('Pacific midnight and DST date conversion',()=>{
 assert.equal(laNowParts(new Date('2026-01-01T08:00:00Z')).hour,0);
 assert.equal(laNowParts(new Date('2026-07-01T07:00:00Z')).hour,0);
 assert.equal(laNowParts(new Date('2026-11-01T06:59:00Z')).ymd,'2026-10-31');
 assert.throws(()=>validateDate('2026-02-30'));
 assert.throws(()=>validateDate('../private'));
});
test('manual generation outside midnight, idempotence and explicit regeneration',async t=>{
 const dailyDir=temp(t), now=new Date('2026-10-12T19:00:00Z');
 const env={GITHUB_EVENT_NAME:'workflow_dispatch',TARGET_DATE:'2026-10-12',OPENAI_API_KEY:'fixture'};
 await main({env,now,dailyDir,fetchFn:mockFetch});
 const file=path.join(dailyDir,'2026-10-12.json'), before=fs.readFileSync(file,'utf8');
 assert.equal(JSON.parse(before).date,'2026-10-12');
 await main({env,now,dailyDir,fetchFn:()=>{throw Error('must skip');}});
 assert.equal(fs.readFileSync(file,'utf8'),before);
 await main({env:{...env,REGENERATE:'true'},now,dailyDir,fetchFn:async()=>({ok:true,json:async()=>({...response,output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({title:'New',message:'New wisdom.'})}]}]})})});
 assert.equal(JSON.parse(fs.readFileSync(file)).message,'New wisdom.');
});
test('Thursday recycling matches February anchor and crosses DST',async t=>{
 const dailyDir=temp(t);
 for(const [date,recycle] of [['2026-02-19',true],['2026-02-26',false],['2026-03-05',true],['2026-03-19',true]]){
  const env={GITHUB_EVENT_NAME:'workflow_dispatch',TARGET_DATE:date};
  await main({env,dailyDir,fetchFn:()=>{throw Error('no API on Thursday');}});
  assert.equal(JSON.parse(fs.readFileSync(path.join(dailyDir,`${date}.json`))).message.includes('RECYCLE'),recycle);
  await assert.rejects(main({env:{...env,REGENERATE:'true'},dailyDir}),/Thursday/);
 }
});
test('scheduled catch-up works after midnight; API failures retain existing files',async t=>{
 const dailyDir=temp(t),now=new Date('2026-10-12T19:00:00Z');
 await main({env:{OPENAI_API_KEY:'fixture'},now,dailyDir,fetchFn:mockFetch});
 const file=path.join(dailyDir,'2026-10-12.json'),before=fs.readFileSync(file,'utf8');
 await assert.rejects(main({env:{GITHUB_EVENT_NAME:'workflow_dispatch',TARGET_DATE:'2026-10-12',REGENERATE:'true'},now,dailyDir}),/required/);
 await assert.rejects(main({env:{GITHUB_EVENT_NAME:'workflow_dispatch',TARGET_DATE:'2026-10-12',REGENERATE:'true',OPENAI_API_KEY:'fixture'},now,dailyDir,fetchFn:async()=>({ok:false,status:429})}),/429/);
 assert.equal(fs.readFileSync(file,'utf8'),before);
});
