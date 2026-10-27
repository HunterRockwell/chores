/* Family-only content layer. Remove this module and family/ before App Store distribution. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.FamilyFooter = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  const DAY = 86400000;
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function dateKey(now = new Date()) {
    const p = new Intl.DateTimeFormat('en-US', {timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
    return ['year','month','day'].map(k => p.find(x=>x.type===k).value).join('-');
  }
  function ordinal(ymd) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) throw Error('Invalid date');
    const n = Date.parse(ymd+'T12:00:00Z');
    if (!Number.isFinite(n) || new Date(n).toISOString().slice(0,10)!==ymd) throw Error('Invalid date');
    return Math.floor(n/DAY);
  }
  const mod = (n,d) => ((n%d)+d)%d;
  function trash(ymd) { const day=ordinal(ymd); return {show:new Date(ymd+'T12:00:00Z').getUTCDay()===4,recycle:mod(day-ordinal('2026-02-19'),14)===0}; }
  function messageFor(data,ymd,revision=0) {
    if (!data.messages?.length) throw Error('Message library unavailable');
    // 31 is coprime with the approved 70-message pool: one complete stable permutation.
    return data.messages[mod((ordinal(ymd)-ordinal('2026-10-27'))*31+revision,data.messages.length)];
  }
  function photoFor(data,ymd) {
    const photos=data.photos.filter(p=>p.id.startsWith('P'));
    return photos[mod(Math.floor((ordinal(ymd)-ordinal('2026-10-29'))/7),photos.length)];
  }
  function resolve(data,football,ymd) {
    const garbage=trash(ymd), game=(football?.games || data.games_2026 || []).find(g=>g.date===ymd && g.status!=='canceled');
    return {garbage,game,kind:game?'game':garbage.show?'photo':'message'};
  }
  function messageHTML(data,m) {
    const source=data.sources.find(s=>s.id===m.source_id);
    return `<div class="daily-quote-title">${escape(m.title)}</div><p class="daily-quote-message">${m.kind==='verbatim_excerpt'?'“':''}${escape(m.body)}${m.kind==='verbatim_excerpt'?'”':''}</p><p class="family-credit">${escape(m.display_attribution)}${source?` · <a href="${escape(source.url)}" target="_blank" rel="noopener noreferrer">Source</a>`:''}</p>`;
  }
  function gameHTML(data,football,g,now=new Date()) {
    const teams=football?.teams || data.teams, home=teams.find(t=>t.id===g.home_team_id), away=teams.find(t=>t.id===g.away_team_id);
    if (!home || !away) throw Error('Game identities unavailable');
    const logo=t=>t.logo_url?`<img src="${escape(t.logo_url)}" alt="${escape(t.name)} logo" width="56" height="56">`:'';
    const kickoff=g.kickoff_utc?new Date(g.kickoff_utc):null;
    const when=kickoff?kickoff.toLocaleTimeString('en-US',{timeZone:'America/Los_Angeles',hour:'numeric',minute:'2-digit',timeZoneName:'short'}):'Kickoff TBA'+(g.announced_window?' · '+escape(g.announced_window):'');
    const fresh=g.odds_as_of && now-new Date(g.odds_as_of)>=0 && now-new Date(g.odds_as_of)<2*3600000 && kickoff && now<kickoff;
    const lines=[];
    if(fresh){ if(g.odds_spread!=null)lines.push('Spread: '+escape(g.odds_spread)); if(g.odds_total!=null)lines.push('Total: '+escape(g.odds_total)); if(g.odds_moneyline!=null)lines.push('Moneyline: '+escape(typeof g.odds_moneyline==='object'?Object.entries(g.odds_moneyline).map(([k,v])=>k+' '+v).join(' / '):g.odds_moneyline)); }
    return `<section class="family-game" aria-label="Alabama game details"><div class="family-kicker">ROLL TIDE · GAME DAY</div><div class="family-logos">${logo(away)}<b>${g.neutral_site?'VS':'AT'}</b>${logo(home)}</div><h3>${escape(away.name)}<br>${g.neutral_site?'vs':'at'} ${escape(home.name)}</h3><p>${escape(g.date)} · ${when}</p><p>${escape(g.venue || 'Venue TBA')}${g.city?' · '+escape(g.city):''}${g.state?', '+escape(g.state):''}</p><p>${lines.length?lines.join(' · '):'Odds unavailable'+(g.odds_as_of?' · saved lines are stale':'')}</p>${lines.length?`<p class="family-credit">${escape(g.odds_provider)} · updated ${new Date(g.odds_as_of).toLocaleTimeString('en-US',{timeZone:'America/Los_Angeles',hour:'numeric',minute:'2-digit',timeZoneName:'short'})}</p>`:''}<p class="family-credit"><a href="https://rolltide.com/sports/football/schedule" target="_blank" rel="noopener noreferrer">Schedule</a> · checked ${escape((football?.updated_at || g.snapshot_date || '').slice(0,10))}</p></section>`;
  }
  async function loadJSON(url) { const r=await fetch(url,{cache:'no-cache',signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('Content unavailable');return r.json(); }
  async function render(ymd,override=null) {
    const target=document.getElementById('daily-quote'), wrap=document.getElementById('daily-quote-wrap');
    const data=await loadJSON('family/content.json');
    const football=await loadJSON('family/football.json').catch(()=>null);
    const state=resolve(data,football,ymd); const trashWrap=document.getElementById('trash-wrap');
    trashWrap.style.display=state.garbage.show?'block':'none';
    document.getElementById('recycle').style.display=state.garbage.recycle && state.garbage.show?'inline':'none';
    wrap.style.display='block';
    target.dataset.familyKind=state.kind;target.dataset.date=ymd;
    if(state.game){target.innerHTML=gameHTML(data,football,state.game);return;}
    if(state.kind==='photo') {
      const p=photoFor(data,ymd), fallback=data.photos.filter(p=>p.rehost_permitted)[mod(Math.floor(ordinal(ymd)/7),8)];
      target.innerHTML=`<div class="family-photo"><div id="saban-embed"></div><details class="family-photo-fallback"><summary>Photo not loading? Show an alternate</summary><img src="${escape(fallback.preview_url)}" alt="Nick Saban speaking emphatically" loading="lazy"><p class="family-credit">${escape(fallback.credit)} · <a href="${escape(fallback.source_url)}" target="_blank" rel="noopener noreferrer">Public-domain source</a></p></details><p class="family-credit">Coach says: finish the job. · <a href="${escape(p.source_url)}" target="_blank" rel="noopener noreferrer">${escape(p.credit)}</a></p></div>`;
      if(p.embed){
        const anchor=document.createElement('a');anchor.id=p.embed.id;anchor.className='gie-single';anchor.href=p.source_url;anchor.textContent='View Nick Saban photo';anchor.target='_blank';anchor.rel='noopener noreferrer';document.getElementById('saban-embed').appendChild(anchor);
        window.gie=window.gie||function(c){(window.gie.q=window.gie.q||[]).push(c);};
        window.gie(function(){window.gie.widgets.load({...p.embed,caption:true,tld:'com',is360:false});});
        if(!document.querySelector('script[data-getty]')){const s=document.createElement('script');s.src='https://embed-cdn.gettyimages.com/widgets.js';s.async=true;s.dataset.getty='true';s.onerror=()=>{document.querySelector('.family-photo-fallback').open=true;};document.body.appendChild(s);}
      } else document.querySelector('.family-photo-fallback').open=true;
      return;
    }
    let m=messageFor(data,ymd);
    let daily=override;
    if(!daily)daily=await loadJSON('daily/'+ymd+'.json').catch(()=>null);
    // Older generated jokes cannot displace sourced family content.
    if(daily?.date===ymd && daily.family_version===data.version){const selected=data.messages.find(x=>x.id===daily.source_message_id);if(selected)m=selected;}
    target.innerHTML=messageHTML(data,m); target.dataset.messageId=m.id;
  }
  function fitTrash() {
    const line=document.getElementById('trash-line'), text=document.getElementById('trash-text');
    if(!line || !text || !line.clientWidth)return;
    let size=18.4;text.style.fontSize=size+'px';
    while(text.offsetWidth*1.06>line.clientWidth && size>8){size-=.2;text.style.fontSize=size+'px';}
  }
  return {dateKey,ordinal,trash,messageFor,photoFor,resolve,messageHTML,gameHTML,render,fitTrash};
});
