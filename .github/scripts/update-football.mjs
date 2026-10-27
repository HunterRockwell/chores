import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import family from '../../family/footer.js';
const file=new URL('../../family/football.json',import.meta.url);
const endpoint='https://site.api.espn.com/apis/site/v2/sports/football/college-football';
async function get(url,fetchFn){const r=await fetchFn(url,{signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('Schedule HTTP '+r.status);return r.json();}
export function parseEvent(e,teams,now){
 const c=e.competitions?.[0];if(!c?.competitors?.some(x=>String(x.team?.id)==='333'))return null;
 const home=c.competitors.find(x=>x.homeAway==='home')?.team,away=c.competitors.find(x=>x.homeAway==='away')?.team;
 if(!home?.id||!away?.id)throw Error('Incomplete matchup');
 for(const t of [home,away])teams.set(String(t.id),{id:String(t.id),name:teams.get(String(t.id))?.name||t.location||t.displayName,athletic_display_name:t.displayName,abbreviation:t.abbreviation,logo_url:t.logos?.[0]?.href||t.logo||teams.get(String(t.id))?.logo_url});
 const kickoff=c.timeValid===true?new Date(e.date):null;if(kickoff&&!Number.isFinite(+kickoff))throw Error('Invalid kickoff');
 const status=c.status?.type||e.status?.type||{};
 return {id:String(e.id),season:e.season?.year,date:kickoff?family.dateKey(kickoff):e.date?.slice(0,10),home_team_id:String(home.id),away_team_id:String(away.id),opponent_name:teams.get(String(home.id)==='333'?String(away.id):String(home.id)).name,alabama_home:String(home.id)==='333',neutral_site:c.neutralSite===true,kickoff_utc:kickoff?.toISOString()||null,kickoff_status:kickoff?'confirmed':'TBA',venue:c.venue?.fullName||null,city:c.venue?.address?.city||null,state:c.venue?.address?.state||null,status:/cancel/i.test(status.name||'')?'canceled':status.state||'pre',snapshot_date:family.dateKey(now),odds_as_of:null,odds_provider:null,odds_spread:null,odds_total:null,odds_moneyline:null};
}
export function applyOdds(game,summary,now){
 const o=summary.pickcenter?.find(x=>x.details||x.spread!=null||x.overUnder!=null)||summary.header?.competitions?.[0]?.odds?.[0];
 if(!o)return game;
 const ml={};if(o.homeTeamOdds?.moneyLine!=null)ml.home=o.homeTeamOdds.moneyLine;if(o.awayTeamOdds?.moneyLine!=null)ml.away=o.awayTeamOdds.moneyLine;
 return {...game,odds_provider:o.provider?.name||'ESPN feed',odds_spread:o.details??o.spread??null,odds_total:o.overUnder??null,odds_moneyline:Object.keys(ml).length?ml:null,odds_as_of:now.toISOString()};
}
export async function main({fetchFn=fetch,now=new Date(),output=file}={}){
 const saved=JSON.parse(fs.readFileSync(output,'utf8'));const teams=new Map(saved.teams.map(t=>[t.id,t])),games=new Map(saved.games.map(g=>[g.id,g]));
 const year=Number(family.dateKey(now).slice(0,4)),month=Number(family.dateKey(now).slice(5,7)),season=month<3?year-1:year;
 let fetched=0;
 for(const y of [season,season+1])for(const type of [2,3]){
  const body=await get(`${endpoint}/teams/333/schedule?season=${y}&seasontype=${type}`,fetchFn);
  if(!Array.isArray(body.events))throw Error('Invalid schedule response; retaining last good cache');
  for(const event of body.events){const parsed=parseEvent(event,teams,now);if(!parsed)continue;family.ordinal(parsed.date);fetched++;
   const old=games.get(parsed.id);parsed.announced_window=parsed.kickoff_utc?null:old?.announced_window;
   if(parsed.kickoff_utc&&Math.abs(new Date(parsed.kickoff_utc)-now)<7*86400000){
    try{Object.assign(parsed,applyOdds(parsed,await get(`${endpoint}/summary?event=${parsed.id}`,fetchFn),now));}catch(e){console.warn('Odds unavailable for '+parsed.id+': '+e.message);}
   }
   games.set(parsed.id,parsed);
  }
 }
 if(!fetched)throw Error('No Alabama games returned; retaining last good cache');
 const next={updated_at:now.toISOString(),provider:'ESPN public schedule and game summary; best-effort availability',games:[...games.values()].sort((a,b)=>a.date.localeCompare(b.date)),teams:[...teams.values()]};
 fs.writeFileSync(output,JSON.stringify(next,null,2)+'\n');console.log(`Updated ${fetched} Alabama schedule entries; no invented matchups or odds.`);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(e=>{console.error(e.message);process.exitCode=1;});
