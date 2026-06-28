async function init(){
  try{
    document.getElementById('load-step').textContent='Loading data files…';
    const [cropKB, diseaseKB, floodVuln] = await Promise.all([
      fetch('./data/crop_kb.json').then(r=>r.json()),
      fetch('./data/disease_kb.json').then(r=>r.json()),
      fetch('./data/flood_vuln.json').then(r=>r.json()),
    ]);
    CROP_KB = cropKB;
    DISEASE_KB = diseaseKB;
    FLOOD_VULN = floodVuln;
    if(!Object.keys(CROP_KB).length)   throw new Error('crop_kb.json failed to load');
    if(!DISEASE_KB.length)             throw new Error('disease_kb.json failed to load');
    if(!Object.keys(FLOOD_VULN).length) throw new Error('flood_vuln.json failed to load');
    await loadSchemes();
    await fetchWeather();
    document.getElementById('load-step').textContent='Computing crop health scores…';
    computeAllHealth();
    document.getElementById('load-step').textContent='Loading district boundaries…';
    const geoCtrl=new AbortController(); setTimeout(()=>geoCtrl.abort(),10000);
    const geoRes=await fetch('./data/kerala-districts.geojson',{signal:geoCtrl.signal});
    const geojson=await geoRes.json();
    renderGeoLayer(geojson);
    updateKPIs(); updateDistrictList(); updateHealthList(); updateAdvisories(); updateMonsoon();
    buildChart('rainfall'); setLastUpdated();
    const loader=document.getElementById('loading');
    loader.classList.add('hidden'); setTimeout(()=>loader.style.display='none',600);
    window._geojson=geojson;
    switchRPTab('weather', document.querySelector(".rp-tab"));
    initPrices();
    renderPriceCards();
    renderPestCards();
    renderFloodCards();

    setInterval(async()=>{
      await fetchWeather(); computeAllHealth();
      refreshMap(); updateKPIs(); updateDistrictList(); updateHealthList(); updateAdvisories();
      buildChart(currentChartType);
      renderPestCards();
      renderFloodCards();
      setLastUpdated();
    },600000);

    setInterval(tickPrices, 300000);
  }catch(e){
    document.getElementById('load-step').textContent='Error: '+e.message;
    console.error(e);
  }
};

function updateKPIs(){
  let maxRain=0,maxRainD='',maxTemp=0,maxTempD='';
  let totalHealth=0,distressed=0,alerts=0;
  DISTRICTS.forEach(d=>{
    const rain=getTodayVal(d.name,'rainfall')||0;
    const temp=getTodayVal(d.name,'temperature')||0;
    const hs=healthScores[d.name]?.score||50;
    if(rain>maxRain){maxRain=rain;maxRainD=d.name;}
    if(temp>maxTemp){maxTemp=temp;maxTempD=d.name;}
    totalHealth+=hs;
    if(hs<55) distressed++;
    if(rain>40) alerts++;
    if(temp>36) alerts++;
    const hum=getTodayVal(d.name,'humidity')||0;
    if(hum>85&&rain>20) alerts++;
  });
  const avgH=Math.round(totalHealth/DISTRICTS.length);
  document.getElementById('kpi-rain').textContent=maxRain.toFixed(1)+'mm';
  document.getElementById('kpi-rain-sub').innerHTML=`<span class="kpi-up">↑</span>${maxRainD}`;
  document.getElementById('kpi-temp').textContent=maxTemp.toFixed(1)+'°C';
  document.getElementById('kpi-temp-sub').innerHTML=`<span class="kpi-warn">⚠</span>${maxTempD}`;
  document.getElementById('kpi-health').textContent=avgH+'/100';
  document.getElementById('kpi-health').style.color=healthColor(avgH);
  document.getElementById('kpi-health-sub').innerHTML=`<span style="color:${healthColor(avgH)}">${healthLabel(avgH).split(' ')[1]||'—'}</span> across Kerala`;
  document.getElementById('kpi-distressed').textContent=distressed;
  document.getElementById('kpi-distressed-sub').textContent=distressed>0?distressed+' need attention':'All districts OK';
  document.getElementById('kpi-alerts').textContent=alerts;
  document.getElementById('kpi-alerts-sub').textContent=alerts>0?'Active crop alerts':'All clear';
  document.getElementById('nav-alert-count').textContent=alerts;
}

function updateDistrictList(){
  const list=document.getElementById('district-list'); list.innerHTML='';
  DISTRICTS.forEach(d=>{
    const rain=getTodayVal(d.name,'rainfall'); const temp=getTodayVal(d.name,'temperature');
    const wd=weatherData[d.name]; const code=(wd&&wd.daily)?wd.daily.weathercode?.[0]||0:0;
    const{icon}=wxInfo(code);
    const cls='district-row'+(rain>40?' rain-alert':temp>36?' heat-alert':'');
    const row=document.createElement('div'); row.className=cls;
    row.innerHTML=`<span class="d-name">${d.name}</span><span class="d-icon">${icon}</span><span class="d-val" style="color:var(--color-rain)">${rain!==null?rain.toFixed(1)+'mm':'--'}</span><span class="d-val" style="color:var(--color-warn)">${temp!==null?temp.toFixed(0)+'°':'--'}</span>`;
    row.onclick=()=>showDistrictDetail(d.name);
    list.appendChild(row);
  });
}

function updateHealthList(){
  const list=document.getElementById('health-list'); list.innerHTML='';
  const sorted=[...DISTRICTS].sort((a,b)=>(healthScores[b.name]?.score||0)-(healthScores[a.name]?.score||0));
  sorted.forEach(d=>{
    const hs=healthScores[d.name]||{score:50};
    const score=hs.score; const col=healthColor(score);
    const row=document.createElement('div'); row.className='health-row'+(score<55?' health-crit':'');
    row.innerHTML=`
      <div><div class="health-name">${d.name}</div><div class="health-sub">${d.crops[0]}</div>
      <div class="health-bar-bg"><div class="health-bar-fill" style="width:${score}%;background:${col}"></div></div></div>
      <div style="text-align:center;font-size:10px;color:${col}">${healthLabel(score).split(' ')[0]}</div>
      <div class="health-score" style="color:${col}">${score}</div>`;
    row.onclick=()=>{ showDistrictDetail(d.name,'health'); };
    list.appendChild(row);
  });
}

function updateAdvisories(){
  const list=document.getElementById('advisory-list'); list.innerHTML='';
  const items=[];
  DISTRICTS.forEach(d=>{
    const hs=healthScores[d.name]; if(!hs) return;
    const{rain,temp,hum,dryDays,score}=hs; const crop=d.crops[0];
    if(score<40)       items.push({icon:'🔴',title:d.name,msg:`${crop} critical (${score}/100) — urgent attention needed`});
    else if(rain>50)   items.push({icon:'🌊',title:d.name,msg:`Flood risk — delay ${crop} field operations`});
    else if(rain>30&&hum>80) items.push({icon:'🍄',title:d.name,msg:`Fungal risk in ${crop} — high moisture`});
    else if(temp>36)   items.push({icon:'🌡️',title:d.name,msg:`Heat stress — irrigate ${crop} urgently`});
    else if(dryDays>4) items.push({icon:'💧',title:d.name,msg:`Dry spell ${dryDays} days — irrigate ${crop}`});
    else if(score<55)  items.push({icon:'🟠',title:d.name,msg:`${crop} under stress (${score}/100) — monitor closely`});
  });
  if(items.length===0){
    list.innerHTML='<div style="font-size:11px;color:var(--color-primary);padding:4px 0 8px;">✅ All Kerala districts — conditions normal</div>';
    return;
  }
  list.innerHTML=items.map(a=>`<div class="advisory-item"><span style="font-size:13px;flex-shrink:0">${a.icon}</span><div class="advisory-text"><strong>${a.title}</strong>${a.msg}</div></div>`).join('');
}

function showDistrictDetail(name, tab='weather'){
  const wd=weatherData[name]; const district=DISTRICTS.find(d=>d.name===name);
  if(!wd||!wd.daily||!district) return;
  document.getElementById('dd-name').textContent=name;
  // weather icon
  const{icon}=wxInfo(wd.daily.weathercode[0]);
  document.getElementById('dd-icon').textContent=icon;
  // weather stats
  const rain=getTodayVal(name,'rainfall'); const temp=getTodayVal(name,'temperature');
  const hum=getTodayVal(name,'humidity');  const wind=wd.daily.windspeed_10m_max[0];
  document.getElementById('dd-rain').textContent=rain!=null?rain.toFixed(1)+'mm':'--';
  document.getElementById('dd-temp').textContent=temp!=null?temp.toFixed(1)+'°C':'--';
  document.getElementById('dd-humidity').textContent=hum!=null?hum+'%':'--';
  document.getElementById('dd-wind').textContent=wind!=null?wind.toFixed(0)+' km/h':'--';
  // forecast
  const days=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const fc=document.getElementById('dd-forecast'); fc.innerHTML='';
  for(let i=0;i<7;i++){
    const dt=new Date(); dt.setDate(dt.getDate()+i);
    const dn=i===0?'Today':days[dt.getDay()];
    const fi=wxInfo(wd.daily.weathercode[i]);
    const el=document.createElement('div'); el.className='forecast-day';
    el.innerHTML=`<div class="fc-day-name">${dn}</div><div class="fc-icon">${fi.icon}</div><div class="fc-temp">${(wd.daily.temperature_2m_max[i]||0).toFixed(0)}°</div><div class="fc-rain">${(wd.daily.precipitation_sum[i]||0).toFixed(0)}mm</div>`;
    fc.appendChild(el);
  }
  document.getElementById('dd-advisory').innerHTML=generateWeatherAdvisory(name,rain,temp,hum,district.crops);
  // health tab
  const hs=healthScores[name]||{score:50,breakdown:{}};
  document.getElementById('dd-health-score').textContent=hs.score;
  document.getElementById('dd-health-score').style.color=healthColor(hs.score);
  document.getElementById('dd-health-label').textContent=healthLabel(hs.score);
  document.getElementById('dd-crop-tag').textContent='Primary: '+district.crops[0];
  // breakdown bars
  const bkEl=document.getElementById('dd-breakdown'); bkEl.innerHTML='';
  Object.entries(hs.breakdown||{}).forEach(([label,{pct,val}])=>{
    const col=pct>=80?'#4ade80':pct>=60?'#facc15':'#fb923c';
    bkEl.innerHTML+=`<div class="breakdown-item"><span class="breakdown-label">${label}</span><div class="breakdown-bar-bg"><div class="breakdown-bar-fill" style="width:${pct}%;background:${col}"></div></div><span class="breakdown-val" style="color:${col}">${val}</span></div>`;
  });
  document.getElementById('dd-health-advisory').innerHTML=generateHealthAdvisory(name,hs);
  // populate pest + flood tabs
  populateDDPests(name);
  populateDDFlood(name);
  // switch tab
  switchDDTab(tab, null);
  document.getElementById('district-detail').classList.add('visible');
  // highlight list
  document.querySelectorAll('.district-row,.health-row').forEach(r=>r.classList.remove('selected'));
  const idx=DISTRICTS.findIndex(d=>d.name===name);
  document.querySelectorAll('.district-row')[idx]?.classList.add('selected');
  document.querySelectorAll('.health-row').forEach(r=>{ if(r.querySelector('.health-name')?.textContent===name) r.classList.add('selected'); });
}

function switchDDTab(tab, btn){
  document.querySelectorAll('.dd-tab').forEach(b=>b.classList.remove('active'));
  if(btn){ btn.classList.add('active'); }
  else {
    document.querySelectorAll('.dd-tab').forEach(b=>{
      const t=b.textContent;
      if(tab==='weather'&&t.includes('Weather')) b.classList.add('active');
      if(tab==='health' &&t.includes('Health'))  b.classList.add('active');
      if(tab==='pests'  &&t.includes('Pests'))   b.classList.add('active');
      if(tab==='flood'  &&t.includes('Flood'))   b.classList.add('active');
    });
  }
  const w=document.getElementById('dd-weather-tab'); if(w) w.className='weather-detail-wrap'+(tab==='weather'?' active':'');
  const h=document.getElementById('dd-health-tab');  if(h) h.className='health-detail-wrap'+(tab==='health'?' active':'');
  const p=document.getElementById('dd-pest-tab');    if(p) p.className='pest-detail-wrap'+(tab==='pests'?' active':'');
  const f=document.getElementById('dd-flood-tab');   if(f) f.className='flood-detail-wrap'+(tab==='flood'?' active':'');
}

function closeDetail(){
  document.getElementById('district-detail').classList.remove('visible');
  document.querySelectorAll('.district-row,.health-row').forEach(r=>r.classList.remove('selected'));
}

function generateWeatherAdvisory(name,rain,temp,hum,crops){
  const c=crops[0];
  if(rain>50)  return `<strong>⚠️ Heavy Rain</strong>Delay ${c} harvest. Check field drainage.`;
  if(rain>30&&hum>80) return `<strong>🍄 Fungal Risk</strong>High humidity + rain — monitor ${c} for disease.`;
  if(temp>36)  return `<strong>🌡️ Heat Stress</strong>${c} stressed. Increase irrigation frequency.`;
  if(rain<2&&temp>33) return `<strong>💧 Irrigate</strong>Dry spell detected. ${c} needs supplemental water.`;
  return `<strong style="color:var(--color-primary)">✅ Normal</strong>${c} conditions are favourable today.`;
}

function generateHealthAdvisory(name,hs){
  const d=DISTRICTS.find(x=>x.name===name);
  const c=d.crops[0]; const s=hs.score;
  if(s>=85) return `<strong style="color:#4ade80">🌱 Thriving</strong>${c} is in excellent condition. Maintain current practices.`;
  if(s>=70) return `<strong style="color:#86efac">✅ Healthy</strong>${c} growing well. Minor optimisation possible.`;
  if(s>=55) return `<strong style="color:#facc15">⚡ Monitor</strong>${c} showing moderate stress. Check water and nutrient levels.`;
  if(s>=40) return `<strong style="color:#fb923c">⚠️ Stressed</strong>${c} needs attention — review irrigation and pest scouting.`;
  return `<strong style="color:#f87171">🔴 Critical</strong>${c} in critical condition. Immediate agronomist consultation advised.`;
}

function updateMonsoon(){
  const today=new Date(); const y=today.getFullYear();
  const start=new Date(y,5,1); const end=new Date(y,8,30);
  const total=(end-start)/86400000; const elapsed=(today-start)/86400000;
  const pct=Math.max(0,Math.min(100,(elapsed/total)*100));
  let phase='Pre-Monsoon Season',dayLabel='--';
  if(elapsed>=0&&elapsed<=total){
    const day=Math.floor(elapsed);
    phase=day<30?'SW Monsoon — Early Phase':day<75?'SW Monsoon — Active Phase':'SW Monsoon — Withdrawal';
    dayLabel=`Day ${day}`;
  } else if(elapsed>total){ phase='Post-Monsoon (NE Monsoon)';dayLabel='Season ended'; }
  document.getElementById('monsoon-phase').textContent=phase;
  document.getElementById('monsoon-day-label').textContent=dayLabel;
  setTimeout(()=>{ document.getElementById('monsoon-fill').style.width=pct+'%'; },600);
}

function buildChart(type){
  const ctx=document.getElementById('trend-chart').getContext('2d');
  if(trendChart) trendChart.destroy();
  const labels=getDayLabels();
  // Prices chart — completely different data
  if(type==='prices'){
    const PRICE_COLORS=['#4ade80','#38bdf8','#fb923c','#a78bfa','#f472b6','#facc15','#34d399','#f87171'];
    const TOP_COMMS=['coconut','pepper','cardamom','rubber','coffee','ginger','banana','cashew'];
    const pDatasets=TOP_COMMS.map((id,i)=>{
      const c=COMMODITIES.find(x=>x.id===id);
      const hist=(priceState[id]?.history||[]).slice(-7);
      // normalise to % change from first day for comparison
      const base=hist[0]||1;
      const data=hist.map(v=>parseFloat(((v-base)/base*100).toFixed(2)));
      return{label:c?c.name:id,data,borderColor:PRICE_COLORS[i],backgroundColor:PRICE_COLORS[i]+'22',borderWidth:1.5,pointRadius:2,tension:0.4,fill:false};
    });
    if(trendChart) trendChart.destroy();
    trendChart=new Chart(ctx,{type:'line',data:{labels:getDayLabels().slice(0,Math.max(...TOP_COMMS.map(id=>(priceState[id]?.history||[]).slice(-7).length))||7),datasets:pDatasets},
      options:{responsive:true,maintainAspectRatio:false,animation:{duration:600},
        plugins:{legend:{display:false},tooltip:{backgroundColor:'#1c2a20',borderColor:'rgba(255,255,255,0.1)',borderWidth:1,titleColor:'#e2ede6',bodyColor:'#7a9982',titleFont:{family:'Satoshi',size:11},bodyFont:{family:'Satoshi',size:11},callbacks:{label:ctx=>`${ctx.dataset.label}: ${ctx.parsed.y>0?'+':''}${ctx.parsed.y.toFixed(2)}%`}}},
        scales:{x:{grid:{color:'rgba(255,255,255,0.04)'},ticks:{color:'#7a9982',font:{family:'Satoshi',size:10}}},y:{grid:{color:'rgba(255,255,255,0.04)'},ticks:{color:'#7a9982',font:{family:'Satoshi',size:10},callback:v=>(v>0?'+':'')+v+'%'},title:{display:true,text:'% Change (7D)',color:'#3f5c47',font:{size:9}}}}}});
    return;
  }
  const datasets=TOP7.map((name,i)=>{
    const wd=weatherData[name]; let data=Array(7).fill(0);
    if(wd&&wd.daily){
      if(type==='rainfall')    data=(wd.daily.precipitation_sum||[]).slice(0,7).map(v=>v||0);
      else if(type==='temperature') data=(wd.daily.temperature_2m_max||[]).slice(0,7).map(v=>v||0);
      else if(type==='humidity') data=Array.from({length:7},(_,day)=>{ const sl=(wd.hourly?.relativehumidity_2m||[]).slice(day*24,(day+1)*24); return sl.length?Math.round(sl.reduce((a,b)=>a+b)/sl.length):0; });
      else if(type==='crophealth'){
        // compute health for each of 7 forecast days using that day's rain/temp
        data=Array.from({length:7},(_,day)=>{
          const dist=DISTRICTS.find(d=>d.name===name);
          const r=wd.daily.precipitation_sum[day]||0;
          const t=wd.daily.temperature_2m_max[day]||30;
          const hSlice=wd.hourly.relativehumidity_2m.slice(day*24,(day+1)*24);
          const h=hSlice.length?Math.round(hSlice.reduce((a,b)=>a+b)/hSlice.length):70;
          const rs=scoreInRange(r,dist.idealRain[0],dist.idealRain[1],30);
          const ts=scoreInRange(t,dist.idealTemp[0],dist.idealTemp[1],25);
          const hs2=scoreInRange(h,dist.idealHum[0],dist.idealHum[1],20);
          const month=new Date().getMonth()+1;
          const ss=(month>=6&&month<=9)?10:(month>=10&&month<=12)?8:6;
          return Math.round(Math.min(100,rs+ts+hs2+15+ss));
        });
      }
    }
    return{label:name,data,borderColor:CHART_COLORS[i],backgroundColor:CHART_COLORS[i]+'22',borderWidth:1.5,pointRadius:2,tension:0.4,fill:false};
  });
  const units={rainfall:'mm',temperature:'°C',humidity:'%',crophealth:'/100',prices:'₹'};
  trendChart=new Chart(ctx,{
    type:'line',
    data:{labels,datasets},
    options:{
      responsive:true,maintainAspectRatio:false,animation:{duration:600},
      plugins:{
        legend:{display:false},
        tooltip:{
          backgroundColor:'#1c2a20',borderColor:'rgba(255,255,255,0.1)',borderWidth:1,
          titleColor:'#e2ede6',bodyColor:'#7a9982',
          titleFont:{family:'Satoshi',size:11},bodyFont:{family:'Satoshi',size:11},
          callbacks:{label:ctx=>`${ctx.dataset.label}: ${ctx.parsed.y.toFixed(1)}${units[type]}`}
        }
      },
      scales:{
        x:{grid:{color:'rgba(255,255,255,0.04)'},ticks:{color:'#7a9982',font:{family:'Satoshi',size:10}}},
        y:{grid:{color:'rgba(255,255,255,0.04)'},ticks:{color:'#7a9982',font:{family:'Satoshi',size:10}},beginAtZero:type!=='temperature'},
      }
    }
  });
}

function switchChart(type,el){
  currentChartType=type;
  document.querySelectorAll('.chart-tab').forEach(t=>t.classList.remove('active'));
  el.classList.add('active');
  buildChart(type);
}

function updateClock(){document.getElementById('clock').textContent=new Date().toLocaleTimeString('en-IN',{hour12:false,timeZone:'Asia/Kolkata'})+' IST';}
setInterval(updateClock,1000); updateClock();
function setLastUpdated(){document.getElementById('last-updated').textContent='Updated '+new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:true,timeZone:'Asia/Kolkata'});}
