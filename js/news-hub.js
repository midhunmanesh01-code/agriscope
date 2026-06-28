function showAIView(on){
  const av=document.getElementById('ai-view');
  const mc=document.getElementById('map-container');
  if(on){
    av.classList.add('active');
    if(mc) mc.style.display='none';
    initAIAdvisory();
  } else {
    av.classList.remove('active');
    if(mc) mc.style.display='';
  }
}

function showNewsView(on){
  const nv=document.getElementById('news-view');
  const mc=document.getElementById('map-container');
  if(on){
    nv.classList.add('active');
    if(mc) mc.style.display='none';
    initNewsHub();
  } else {
    nv.classList.remove('active');
    if(mc) mc.style.display='';
  }
}

function showFloodView(on){
  const fv=document.getElementById('flood-view');
  const mc=document.getElementById('map-container');
  if(fv) fv.classList.toggle('active',on);
  if(on){ if(mc) mc.classList.add('hidden'); renderFloodTable(); renderFloodCards(); }
  else   { if(mc) mc.classList.remove('hidden'); }
}

function switchNav(view, btn){
  document.querySelectorAll('.nav-item[data-nav]').forEach(n=>n.classList.remove('active'));
  const navBtn=btn||document.querySelector('[data-nav="'+view+'"]');
  if(navBtn) navBtn.classList.add('active');
  showMarketsView(false);
  showFloodView(false);
  showNewsView(false);
  showAIView(false);
  if(view==='markets'){
    showMarketsView(true);
  } else if(view==='flood'){
    showFloodView(true);
    setLayer('floodrisk',true);
  } else if(view==='news'){
    showNewsView(true);
  } else if(view==='ai'){
    showAIView(true);
  } else {
    const layerMap={overview:'rainfall',weather:'rainfall',crophealth:'crophealth',alerts:'pestmap'};
    setLayer(layerMap[view]||'rainfall',true);
  }
  const rpMap={overview:'weather',weather:'weather',crophealth:'health',markets:'prices',alerts:'alerts',flood:'flood',news:'alerts',ai:'health'};
  const rpTab=rpMap[view]||'weather';
  const rpBtns=document.querySelectorAll('.rp-tab');
  const rpOrder=['weather','health','alerts','flood','prices'];
  const ri=rpOrder.indexOf(rpTab);
  if(rpBtns[ri]) switchRPTab(rpTab,rpBtns[ri]);
  closeDetail();
}

// ── Govt Schemes (static, Kerala-specific) ──────────────────────────────────

let SCHEMES = [];

// ── News state ───────────────────────────────────────────────────────────────
let _allNewsItems = [];
let _advFilter = 'all';
let _newsFilter = 'all';


function buildWeatherNewsItems(){
  const items = [];
  const today = new Date().toLocaleDateString('en-IN',{day:'numeric',month:'short'});
  DISTRICTS.forEach(d => {
    const w = weatherData[d.name]; if(!w||!w.daily) return;
    const rain = w.daily.precipitation_sum?.[0]||0;
    const temp = w.daily.temperature_2m_max?.[0]||0;
    const wind = w.daily.windspeed_10m_max?.[0]||0;
    if(rain > 50) items.push({ title:`Heavy rain warning — ${d.name}`, body:`${rain.toFixed(1)}mm rainfall expected today. IMD issues heavy rain alert. Farmers advised to halt field operations and secure harvested produce.`, source:'IMD/Open-Meteo', cat:'weather', tag:'warning', time:today, ts:Date.now()-Math.random()*3600000, link:'https://mausam.imd.gov.in' });
    else if(rain > 25) items.push({ title:`Moderate rain forecast — ${d.name}`, body:`${rain.toFixed(1)}mm forecast. Avoid spraying pesticides. Check drainage in paddy fields.`, source:'IMD/Open-Meteo', cat:'weather', tag:'watch', time:today, ts:Date.now()-Math.random()*7200000, link:'https://mausam.imd.gov.in' });
    if(temp > 37) items.push({ title:`Heatwave alert — ${d.name}`, body:`Max temperature ${temp.toFixed(1)}°C. Extreme heat stress risk for crops and livestock. Increase irrigation frequency.`, source:'IMD/Open-Meteo', cat:'weather', tag:'critical', time:today, ts:Date.now()-Math.random()*3600000, link:'https://mausam.imd.gov.in' });
    if(wind > 40) items.push({ title:`Strong wind advisory — ${d.name}`, body:`Winds up to ${wind.toFixed(0)} km/h. Risk of lodging in standing crops. Secure banana and arecanut plantations.`, source:'IMD/Open-Meteo', cat:'weather', tag:'warning', time:today, ts:Date.now()-Math.random()*5400000, link:'https://mausam.imd.gov.in' });
  });
  // Always add a general daily outlook so feed is never empty
  const avgTemp = DISTRICTS.reduce((s,d)=>s+(weatherData[d.name]?.daily?.temperature_2m_max?.[0]||30),0)/DISTRICTS.length;
  const avgRainAll = DISTRICTS.reduce((s,d)=>s+(weatherData[d.name]?.daily?.precipitation_sum?.[0]||0),0)/DISTRICTS.length;
  const dominantCrop = 'Paddy, Coconut & Rubber';
  items.push({
    title: `Kerala Daily Agricultural Outlook — ${today}`,
    body: `Average temperature across Kerala: ${avgTemp.toFixed(1)}°C. Average rainfall: ${avgRainAll.toFixed(1)}mm. ${avgTemp>33?'Heat stress conditions — ensure irrigation.':avgRainAll>20?'Moist conditions — watch for fungal outbreaks.':'Moderate conditions — routine crop management advised.'} Primary crops: ${dominantCrop}.`,
    source:'AgroScope AI', cat:'weather', tag:'watch', time:today, ts:Date.now()-1000, link:'#'
  });
  return items.slice(0,10);
}

function buildMarketNewsItems(){
  const items = [];
  if(!window._prices||!window._prices.length) return items;
  const today = new Date().toLocaleDateString('en-IN',{day:'numeric',month:'short'});
  _prices.forEach(p => {
    const chg = p.change; if(!chg) return;
    const pct = ((chg/p.price)*100).toFixed(1);
    if(chg > 0 && Math.abs(pct) > 2) items.push({ title:`${p.name} prices up ${pct}% today`, body:`${p.name} trading at ₹${p.price}/qt in Kerala mandis. Bullish trend — good time to sell if storage available. 7-day high: ₹${p.high}.`, source:'KSAMB/Agmarknet', cat:'market', tag:'market', time:today, ts:Date.now()-Math.random()*7200000, link:'https://www.agmarknet.gov.in' });
    else if(chg < 0 && Math.abs(pct) > 2) items.push({ title:`${p.name} prices dip ${Math.abs(pct)}% today`, body:`${p.name} at ₹${p.price}/qt. Consider holding stock if storage permits. 7-day low: ₹${p.low}. Watch for recovery.`, source:'KSAMB/Agmarknet', cat:'market', tag:'market', time:today, ts:Date.now()-Math.random()*7200000, link:'https://www.agmarknet.gov.in' });
  });
  return items.slice(0,6);
}

function buildPestNewsItems(){
  const items = [];
  const today = new Date().toLocaleDateString('en-IN',{day:'numeric',month:'short'});
  DISTRICTS.forEach(d => {
    const score = pestMapScore(d.name);
    if(score >= 60) items.push({ title:`High disease risk — ${d.name}`, body:`Conditions highly favourable for fungal/bacterial outbreaks in ${d.crops[0]}. Scout fields immediately and apply preventive fungicide.`, source:'AgroScope AI', cat:'pest', tag:'pest', time:today, ts:Date.now()-Math.random()*3600000, link:'#' });
    else if(score >= 30) items.push({ title:`Moderate pest pressure — ${d.name}`, body:`Watch for early signs of disease in ${d.crops[0]}. High humidity and warmth favour pathogen spread. Apply neem-based spray as precaution.`, source:'AgroScope AI', cat:'pest', tag:'pest', time:today, ts:Date.now()-Math.random()*7200000, link:'#' });
  });
  return items.slice(0,8);
}

function tagLabel(tag){
  const map={critical:'🔴 Critical',warning:'🟠 Warning',watch:'🟡 Watch',news:'📰 News',scheme:'🏛️ Scheme',market:'📈 Market',pest:'🐛 Pest'};
  return map[tag]||'📰 News';
}

function escHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function renderNewsFeed(){
  const list = document.getElementById('news-feed-list');
  if(!list) return;
  const filtered = _newsFilter === 'all' ? _allNewsItems : _allNewsItems.filter(i=>i.cat===_newsFilter);
  if(!filtered.length){ list.innerHTML='<div class="news-empty">No news items found.<br>Check network connection.</div>'; return; }
  list.innerHTML = filtered.map(item => {
    const timeStr = item.time ? `<span>${item.time}</span>` : '';
    return `<div class="news-card" onclick="window.open('${item.link}','_blank')">
      <div class="news-card-top">
        <span class="news-tag tag-${item.tag||'news'}">${tagLabel(item.tag)}</span>
        <span class="news-card-title">${escHtml(item.title)}</span>
      </div>
      ${item.body ? `<div class="news-card-body">${escHtml(item.body.slice(0,150))}${item.body.length>150?'…':''}</div>` : ''}
      <div class="news-card-meta">
        <span class="news-source">${escHtml(item.source||'')}</span>
        ${timeStr}
        ${item.link&&item.link!=='#'?`<a class="news-card-link" href="${item.link}" target="_blank" onclick="event.stopPropagation()">Read →</a>`:''}
      </div>
    </div>`;
  }).join('');
}

function filterNews(cat, btn){
  _newsFilter = cat;
  document.querySelectorAll('.news-filter-bar .nf-btn').forEach(b=>b.classList.remove('active'));
  if(btn) btn.classList.add('active');
  renderNewsFeed();
}

function renderNewsAdvisories(){
  const list = document.getElementById('news-adv-list');
  if(!list) return;
  const items = [];
  DISTRICTS.forEach(d => {
    const hs = healthScores[d.name]; if(!hs) return;
    const {rain,temp,hum,dryDays,score} = hs;
    const crop = d.crops[0];
    const flood = floodComposite(d.name)||0;
    const pest  = pestMapScore(d.name)||0;
    let sev='ok', icon='✅', msgs=[], actions=[];
    if(score<40){sev='critical';icon='🔴';msgs.push(`${crop} health critical (${score}/100)`);actions.push('Emergency irrigation','Soil test','Contact KVK');}
    else if(flood>70){sev='critical';icon='🌊';msgs.push(`Extreme flood risk (score ${flood})`);actions.push('Halt field ops','Secure produce','Check KSDMA');}
    else if(pest>70){sev='critical';icon='🐛';msgs.push(`High disease/pest pressure`);actions.push('Scout fields','Apply fungicide','Isolate affected');}
    else if(rain>50){sev='warning';icon='🌧️';msgs.push(`Heavy rain ${rain.toFixed(0)}mm today`);actions.push('Check drainage','Delay harvest','Secure inputs');}
    else if(temp>36){sev='warning';icon='🌡️';msgs.push(`Heatwave ${temp.toFixed(1)}°C`);actions.push('Irrigate urgently','Mulch soil','Shade nurseries');}
    else if(hum>85&&rain>15){sev='warning';icon='🍄';msgs.push(`Fungal risk — high moisture`);actions.push('Reduce canopy density','Spray copper','Improve drainage');}
    else if(dryDays>4){sev='watch';icon='💧';msgs.push(`Dry spell — ${dryDays} days without rain`);actions.push('Irrigation due','Conserve soil moisture');}
    else if(score<60){sev='watch';icon='🟡';msgs.push(`${crop} under mild stress (${score}/100)`);actions.push('Monitor closely','Check soil nutrients');}
    else{msgs.push(`${crop} conditions normal (${score}/100)`);actions.push('Routine monitoring');}
    if(_advFilter!=='all'&&_advFilter!==sev) return;
    items.push({d, sev, icon, msgs, actions, crop, score});
  });
  items.sort((a,b)=>{'critical,warning,watch,ok'.split(',').indexOf(a.sev)-'critical,warning,watch,ok'.split(',').indexOf(b.sev);
    return ['critical','warning','watch','ok'].indexOf(a.sev)-['critical','warning','watch','ok'].indexOf(b.sev);
  });
  document.getElementById('news-adv-count').textContent = items.length;
  list.innerHTML = items.map(({d,sev,icon,msgs,actions,crop,score})=>`
    <div class="adv-card sev-${sev}" onclick="showDistrictDetail('${d.name.replace(/'/g, "&apos;")}','crophealth')">
      <div class="adv-card-top">
        <span class="adv-icon">${icon}</span>
        <span class="adv-district">${d.name}</span>
        <span class="adv-crop">${crop}</span>
      </div>
      <div class="adv-msg">${msgs.join(' · ')}</div>
      <div class="adv-actions">${actions.map(a=>`<span class="adv-action-btn">${a}</span>`).join('')}</div>
    </div>`).join('');
}

function filterAdvisories(sev, btn){
  _advFilter = sev;
  document.querySelectorAll('#news-adv-list').forEach(()=>{});
  const bar = btn?.closest('.news-filter-bar');
  if(bar) bar.querySelectorAll('.nf-btn').forEach(b=>b.classList.remove('active'));
  if(btn) btn.classList.add('active');
  renderNewsAdvisories();
}

// ── IMD Bulletins (generated from live weather) ──────────────────────────────

function renderIMDBulletins(){
  const list = document.getElementById('news-imd-list'); if(!list) return;
  const today = new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'});
  const bulletins = [];

  // General Kerala outlook
  const allRain = DISTRICTS.map(d=>weatherData[d.name]?.daily?.precipitation_sum?.[0]||0);
  const maxRain = Math.max(...allRain);
  const avgRain = allRain.reduce((a,b)=>a+b,0)/allRain.length;
  const rainDistricts = DISTRICTS.filter(d=>(weatherData[d.name]?.daily?.precipitation_sum?.[0]||0)>30).map(d=>d.name);

  let color='green', headline='Normal conditions across Kerala';
  if(maxRain>80){color='red';headline='Extremely heavy rain warning issued for Kerala';}
  else if(maxRain>50){color='orange';headline='Heavy rain alert for parts of Kerala';}
  else if(maxRain>25){color='yellow';headline='Moderate rain expected in several districts';}

  bulletins.push({color,title:`Kerala Weather Bulletin — ${today}`,body:`${headline}. Average rainfall: ${avgRain.toFixed(1)}mm.${rainDistricts.length?` Districts on alert: ${rainDistricts.slice(0,4).join(', ')}.`:''} Farmers advised to monitor IMD updates regularly.`,meta:'Source: IMD / Open-Meteo live data'});

  // 7-day outlook
  const d0 = DISTRICTS[0]; const w0 = weatherData[d0.name];
  if(w0?.daily?.precipitation_sum){
    const days = w0.daily.precipitation_sum;
    const heavyDays = days.filter(r=>r>30).length;
    const body7 = heavyDays>3 ? `Active monsoon conditions forecast — ${heavyDays} of next 7 days expected to see heavy rainfall. Delay land preparation and harvesting activities.`
      : heavyDays>1 ? `Intermittent heavy rain on ${heavyDays} days in the next week. Plan field operations around dry windows.`
      : `Mostly dry conditions expected over next 7 days. Ensure irrigation readiness.`;
    bulletins.push({color:heavyDays>3?'orange':'green',title:'7-Day Rainfall Outlook — Kerala',body:body7,meta:'Source: Open-Meteo 7-day forecast'});
  }

  // Monsoon onset status — always push based on current month
  const monMonth = new Date().getMonth();
  const monPhases = ['Pre-Monsoon','Pre-Monsoon','Pre-Monsoon','Pre-Monsoon','Pre-Monsoon',
    'SW Monsoon Early Phase','SW Monsoon Active Phase','SW Monsoon Active Phase',
    'SW Monsoon Withdrawal','Post-Monsoon (NE Monsoon)','NE Monsoon','Winter'];
  const monAdvice = ['Prepare land, apply basal fertilizer.',
    'Start nursery preparation for kharif crops.',
    'Complete pre-kharif soil health check.',
    'Last chance for rabi crop planning.',
    'Pre-monsoon showers expected — prepare drainage.',
    'SW Monsoon onset expected Jun 1. Complete sowing preparation.',
    'Active monsoon — ideal for transplanting paddy. Ensure field drainage.',
    'Peak monsoon — monitor flood risk daily via KSDMA.',
    'Monsoon withdrawal underway — harvest kharif, plan rabi.',
    'NE Monsoon active — rice harvest season. Protect from rain damage.',
    'NE Monsoon — irrigate rabi crops, watch for fungal disease.',
    'Dry season — focus on irrigation and soil preparation.'];
  bulletins.push({color: monMonth>=5&&monMonth<=8?'yellow':'green',
    title:`Monsoon Status — ${monPhases[monMonth]}`,
    body: `Kerala is currently in the ${monPhases[monMonth]} period. ${monAdvice[monMonth]} Normal SW Monsoon onset: June 1. Monitor IMD district bulletins daily.`,
    meta:'Source: IMD Seasonal Outlook'});

  // District-level top alerts
  DISTRICTS.forEach(d=>{
    const w=weatherData[d.name]; if(!w?.daily) return;
    const r=w.daily.precipitation_sum?.[0]||0;
    const t=w.daily.temperature_2m_max?.[0]||0;
    if(r>60) bulletins.push({color:'red',title:`Red Alert — ${d.name}`,body:`IMD Red Alert issued. Expected rainfall >115mm in 24 hours. All outdoor agricultural activities must be suspended. Seek shelter immediately.`,meta:`District: ${d.name} · ${new Date().toLocaleDateString('en-IN')}`});
    else if(r>45) bulletins.push({color:'orange',title:`Orange Alert — ${d.name}`,body:`Heavy to very heavy rain (${r.toFixed(0)}mm) expected. Avoid river/canal areas. Secure harvested produce.`,meta:`District: ${d.name}`});
    else if(t>38) bulletins.push({color:'red',title:`Heatwave Warning — ${d.name}`,body:`Maximum temperature ${t.toFixed(1)}°C. IMD heatwave criteria met. Restrict outdoor work 11am–4pm. Increase irrigation.`,meta:`District: ${d.name}`});
  });

  document.getElementById('news-imd-count').textContent = bulletins.length;
  list.innerHTML = bulletins.map(b=>`
    <div class="imd-card imd-${b.color}">
      <div class="imd-title">${escHtml(b.title)}</div>
      <div class="imd-body">${escHtml(b.body)}</div>
      <div class="imd-meta">${escHtml(b.meta)}</div>
    </div>`).join('');
}

async function fetchNewsFeeds(){
  // Step 1: always render synthetic items immediately so feed is never blank
  try {
    const syn = [];
    syn.push(...buildWeatherNewsItems());
    syn.push(...buildMarketNewsItems());
    syn.push(...buildPestNewsItems());
    _allNewsItems = syn.sort((a,b)=>(b.ts||0)-(a.ts||0));
    document.getElementById('news-live-count').textContent = _allNewsItems.length;
    renderNewsFeed();
  } catch(e){ console.warn('Synthetic news error:', e); }

  // Step 2: fetch RSS in background, append results
  const FEEDS = [
    { url:'https://www.thehindu.com/sci-tech/agriculture/feeder/default.rss', label:'The Hindu', cat:'agri' },
    { url:'https://agriculturepost.com/feed/', label:'Agriculture Post', cat:'agri' },
    { url:'https://indianexpress.com/section/india/feed/', label:'Indian Express', cat:'agri' },
  ];
  const AGRI_KW = /farm|crop|agri|paddy|rice|wheat|kisan|harvest|monsoon|irrigation|soil|pest|fertiliz|vegetable|fruit|coconut|rubber|spice|kerala/i;
  // Use allorigins proxy — works from file:// and avoids CORS issues
  const proxy = url => `https://api.allorigins.win/get?url=${encodeURIComponent(
    'https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent(url)
  )}`;

  const feedPromises = FEEDS.map(async feed => {
    try {
      const res = await fetch(proxy(feed.url));
      if(!res.ok) return [];
      const wrapped = await res.json();
      // allorigins wraps response in {contents:"..."} — unwrap it
      let data;
      try { data = typeof wrapped.contents === 'string' ? JSON.parse(wrapped.contents) : wrapped; }
      catch(e) { return []; }
      if(data.status !== 'ok' || !data.items?.length) return [];
      return data.items
        .filter(it => AGRI_KW.test(it.title + ' ' + (it.description||'')))
        .slice(0, 6)
        .map(it => ({
          title:  it.title?.trim() || '—',
          body:   (it.description||'').replace(/<[^>]+>/g,'').trim().slice(0,160),
          link:   it.link || '#',
          source: feed.label,
          cat:    feed.cat,
          tag:    'news',
          time:   it.pubDate ? new Date(it.pubDate).toLocaleDateString('en-IN',{day:'numeric',month:'short'}) : '',
          ts:     it.pubDate ? new Date(it.pubDate).getTime() : Date.now(),
        }));
    } catch(e){ return []; }
  });

  try {
    const feedResults = await Promise.all(feedPromises);
    const rssItems = feedResults.flat();
    if(rssItems.length > 0){
      _allNewsItems = [..._allNewsItems, ...rssItems].sort((a,b)=>(b.ts||0)-(a.ts||0));
      document.getElementById('news-live-count').textContent = _allNewsItems.length;
      renderNewsFeed();
    }
  } catch(e){ console.warn('RSS fetch error:', e); }
}

function renderSchemes(data = SCHEMES){

  const list = document.getElementById('news-schemes-list');

  if(!list) return;

  list.innerHTML = data.map(s=>`
    <div class="scheme-card">

      <div class="scheme-title">
        <span class="scheme-badge">Scheme</span> ${escHtml(s.title)}
      </div>

      <div class="scheme-body">
        ${escHtml(s.body)}
      </div>

      <div class="scheme-meta">
        <span>🏛️ ${escHtml(s.ministry)}</span>
        <span>📅 ${escHtml(s.deadline)}</span>

        ${(() => {
          try {
            const url = new URL(s.link, location.href);

            if(url.protocol !== "https:" && url.protocol !== "http:"){
              return "";
            }

            return `<a href="${escHtml(url.href)}"
              target="_blank"
              rel="noopener noreferrer"
              class="news-card-link">
              Details →
            </a>`;
          } catch {
            return "";
          }
        })()}

      </div>

    </div>
  `).join('');
}

async function loadSchemes(){

  const list = document.getElementById('news-schemes-list');

  if(!list) return;

  list.innerHTML = "Loading schemes...";

  try{

    const res = await fetch('./data/schemes.json');

    if(!res.ok){
      throw new Error("Failed to load schemes");
    }

    SCHEMES = await res.json();

    renderSchemes(SCHEMES);

  }catch(error){

    console.error(error);

    SCHEMES = [
      {
        title:"Government schemes unavailable",
        body:"Please check again later.",
        deadline:"-",
        ministry:"-",
        link:""
      }
    ];

    renderSchemes(SCHEMES);
}
}

let _newsHubInited = false;

function initNewsHub(){
  renderSchemes();
  renderNewsAdvisories();
  renderIMDBulletins();
  fetchNewsFeeds();
  if(!_newsHubInited){
    _newsHubInited = true;
    setInterval(()=>{ fetchNewsFeeds(); renderNewsAdvisories(); renderIMDBulletins(); }, 600000);
  }
}

