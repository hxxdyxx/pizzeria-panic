/* Pizzeria Panic 3.0 retention layer. Additive and local-first. */
(() => {
  'use strict';
  const KEY='ppp_retention_v1';
  const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch{return {}}};
  const write=s=>{try{localStorage.setItem(KEY,JSON.stringify(s))}catch{}};
  const dayKey=()=>new Date().toISOString().slice(0,10);
  const dayNum=()=>Math.floor(Date.now()/86400000);
  const events=[
    {id:'kitchen',name:'Kitchen Rush',world:0,desc:'Catch 12 pizzas in one shift.',goal:12,metric:'catches',mode:'sum',reward:75},
    {id:'boardwalk',name:'Boardwalk Bonanza',world:1,desc:'Fill 5 orders on the boardwalk.',goal:5,metric:'orders',mode:'sum',reward:75},
    {id:'rooftop',name:'Rooftop Windstorm',world:2,desc:'Dodge 8 hazards above the city.',goal:8,metric:'dodged',mode:'sum',reward:75},
    {id:'festival',name:'Street Festival',world:3,desc:'Hit a 15 combo at the festival.',goal:15,metric:'combo',mode:'best',reward:75},
    {id:'arcade',name:'Neon After Hours',world:4,desc:'Score 250 in one arcade run.',goal:250,metric:'score',mode:'best',reward:75}
  ];
  let state=read();
  if(!state||typeof state!=='object')state={};
  state.claimedDays=Array.isArray(state.claimedDays)?state.claimedDays:[];
  state.loginStreak=Number(state.loginStreak)||0;
  state.lastLogin=state.lastLogin||'';
  state.worldVisits=Array.isArray(state.worldVisits)?state.worldVisits:[0,0,0,0,0];
  state.worldRewards=Array.isArray(state.worldRewards)?state.worldRewards:[[],[],[],[],[]];
  state.event=state.event||{day:-1,progress:0,claimed:false};
  state.totalRuns=Number(state.totalRuns)||0;
  const today=dayKey();
  if(state.lastLogin!==today){
    const yesterday=new Date(Date.now()-86400000).toISOString().slice(0,10);
    state.loginStreak=state.lastLogin===yesterday?Math.min(7,state.loginStreak+1):1;
    state.lastLogin=today;
  }
  const rewardForDay=[25,35,45,55,65,80,100][Math.max(0,Math.min(6,state.loginStreak-1))];
  const style=document.createElement('style');
  style.textContent=`.ppp3-panel{width:min(94%,380px);margin:9px auto;padding:10px 12px;border:1px solid rgba(242,193,78,.4);border-radius:10px;background:rgba(20,20,20,.5);color:#f5eddf;text-align:left;font:12px 'Open Sans',sans-serif}.ppp3-head{display:flex;justify-content:space-between;align-items:center;gap:8px;color:#f2c14e;font:600 13px Fredoka,sans-serif}.ppp3-divider{border:none;border-top:1px solid rgba(242,193,78,.18);margin:8px 0}.ppp3-progress{height:6px;background:#45413c;border-radius:9px;overflow:hidden;margin:7px 0}.ppp3-progress i{display:block;height:100%;background:#74a77b;width:0}.ppp3-btn{border:0;border-radius:7px;background:#f2c14e;color:#292522;font:700 12px Fredoka,sans-serif;padding:7px 11px;cursor:pointer}.ppp3-btn:disabled{opacity:.55;cursor:default}.ppp3-meta{display:flex;justify-content:space-between;align-items:center;gap:8px;color:#c8bdad;font-size:11px}`;
  document.head.appendChild(style);

  const event=events[dayNum()%events.length];
  if(state.event.day!==dayNum())state.event={day:dayNum(),progress:0,claimed:false};

  // Single merged card
  const panel=document.createElement('section');
  panel.className='ppp3-panel';
  panel.id='ppp3-retention';
  panel.innerHTML=`
    <div class="ppp3-head"><span>DAILY KITCHEN BONUS</span><span id="ppp3-streak"></span></div>
    <div class="ppp3-meta" style="margin-top:5px"><span id="ppp3-daily-status"></span><button class="ppp3-btn" id="ppp3-claim"></button></div>
    <hr class="ppp3-divider">
    <div class="ppp3-head"><span id="ppp3-event-title"></span><span id="ppp3-event-reward"></span></div>
    <div class="ppp3-progress" style="margin-top:6px"><i id="ppp3-event-fill"></i></div>
    <div class="ppp3-meta"><span id="ppp3-event-status"></span><button class="ppp3-btn" id="ppp3-share">CHALLENGE A FRIEND</button></div>`;

  const weekly=document.getElementById('weeklyPanel');
  if(weekly)weekly.insertAdjacentElement('afterend',panel);else document.body.appendChild(panel);

  const signatureTypes=['signature-ladle','signature-shell','signature-star','signature-lantern','signature-pixel'];
  const renderCollection=()=>{};
  window.addEventListener('ppp:signature-collected',renderCollection);

  // Daily bonus
  const claim=document.getElementById('ppp3-claim');
  const claimed=state.claimedDays.includes(today);
  document.getElementById('ppp3-streak').textContent=`${state.loginStreak} DAY STREAK`;
  document.getElementById('ppp3-daily-status').textContent=claimed?'Reward collected':'One free reward each day';
  claim.textContent=claimed?'COLLECTED':`CLAIM ${rewardForDay} COINS`;
  claim.disabled=claimed;
  claim.addEventListener('click',()=>{
    if(state.claimedDays.includes(today))return;
    window.dispatchEvent(new CustomEvent('ppp:award-coins',{detail:{amount:rewardForDay}}));
    state.claimedDays.push(today);state.claimedDays=state.claimedDays.slice(-60);write(state);
    claim.textContent='COLLECTED';claim.disabled=true;
    document.getElementById('ppp3-daily-status').textContent='Reward added to your Pizza Coins';
  });

  // Event
  document.getElementById('ppp3-event-title').textContent=event.name.toUpperCase();
  const renderEvent=()=>{
    const progress=Math.min(event.goal,Number(state.event.progress)||0);
    document.getElementById('ppp3-event-fill').style.width=(progress/event.goal*100)+'%';
    document.getElementById('ppp3-event-status').textContent=state.event.claimed?'Event complete':`${progress} / ${event.goal}`;
    document.getElementById('ppp3-event-reward').textContent=state.event.claimed?'DONE':`${event.reward} COINS`;
  };
  renderEvent();write(state);

  document.getElementById('ppp3-share').addEventListener('click',async()=>{
    const target=Math.max(250,Number(state.bestScore)||0);
    const url='https://pppanic.com/play?daily=1&seed='+today+'&beat='+target;
    const text=`I'm taking on the same daily challenge in Pizzeria Panic. Beat my target of ${target} points. ${url}`;
    try{if(navigator.share)await navigator.share({title:'Pizzeria Panic Challenge',text,url});else if(navigator.clipboard){await navigator.clipboard.writeText(text);document.getElementById('ppp3-share').textContent='LINK COPIED';}else window.prompt('Copy your challenge link',text)}catch(e){}
  });

  window.addEventListener('ppp:run-finished',e=>{
    const r=e.detail||{};state.totalRuns++;state.bestScore=Math.max(Number(state.bestScore)||0,Number(r.score)||0);
    const idx=Math.max(0,Math.min(4,Number(r.worldIdx)||0));
    const tiers=[{visits:1,reward:25},{visits:3,reward:50},{visits:5,reward:75}];
    let masteryCoins=0;
    for(let world=0;world<=idx;world++){
      state.worldVisits[world]=(Number(state.worldVisits[world])||0)+1;
      tiers.forEach((tier,i)=>{if(state.worldVisits[world]>=tier.visits&&!state.worldRewards[world].includes(i)){state.worldRewards[world].push(i);masteryCoins+=tier.reward;}});
    }
    if(masteryCoins>0)window.dispatchEvent(new CustomEvent('ppp:award-coins',{detail:{amount:masteryCoins}}));
    const value=Math.max(0,Number(r[event.metric])||0);
    if(!state.event.claimed&&idx===event.world){
      state.event.progress=Math.min(event.goal,event.mode==='sum'?(Number(state.event.progress)||0)+value:Math.max(Number(state.event.progress)||0,value));
      if(state.event.progress>=event.goal){
        window.dispatchEvent(new CustomEvent('ppp:award-coins',{detail:{amount:event.reward}}));state.event.claimed=true;
      }
    }
    write(state);renderEvent();
  });
})();
