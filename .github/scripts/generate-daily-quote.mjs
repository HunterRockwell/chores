import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import family from '../../family/footer.js';
const content=JSON.parse(fs.readFileSync(new URL('../../family/content.json',import.meta.url),'utf8'));
export function laNowParts(now=new Date()){return {ymd:family.dateKey(now),hour:Number(new Intl.DateTimeFormat('en-US',{timeZone:'America/Los_Angeles',hour:'2-digit',hourCycle:'h23'}).format(now))};}
export function validateDate(ymd){family.ordinal(ymd);return new Date(ymd+'T12:00:00Z');}
export async function main({env=process.env,now=new Date(),dailyDir=path.join(process.cwd(),'daily')}={}){
 const manual=env.GITHUB_EVENT_NAME==='workflow_dispatch',ymd=manual&&env.TARGET_DATE?env.TARGET_DATE:family.dateKey(now);
 validateDate(ymd);const regenerate=manual&&env.REGENERATE==='true';const file=path.join(dailyDir,ymd+'.json');
 const before=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):null;
 const garbage=family.trash(ymd);
 if(garbage.show&&regenerate)throw Error('Thursday content cannot be regenerated');
 if(before?.family_version===content.version&&!regenerate){console.log('Already current: '+ymd);return;}
 const revision=regenerate&&before?.family_version===content.version?(Number(before.revision)||0)+1:0;
 const selected=family.messageFor(content,ymd,revision);
 const record=garbage.show?{date:ymd,type:'trash',title:'',message:'TAKE TRASH TO ROAD'+(garbage.recycle?' AND RECYCLE CAN':'')}:{date:ymd,type:'normal',category:'saban',source_message_id:selected.id,title:selected.title,message:selected.body,attribution:selected.display_attribution,source_id:selected.source_id,revision};
 fs.mkdirSync(dailyDir,{recursive:true});fs.writeFileSync(file,JSON.stringify({...record,family_version:content.version,generated_at:now.toISOString()},null,2)+'\n');console.log('Wrote daily/'+ymd+'.json');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(e=>{console.error(e.message);process.exitCode=1;});
