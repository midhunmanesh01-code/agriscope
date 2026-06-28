let CROP_KB = {};

let _geminiKey = '';
let _aiHistory = [];
let _aiInited = false;

function ruleEngineAnswer(question, districtName){
  const q = question.toLowerCase();
  const dist = DISTRICTS.find(d=>d.name===districtName)||null;
  const hs   = dist ? (healthScores[dist.name]||{score:50,rain:0,temp:30,hum:70,dryDays:0}) : {score:50,rain:0,temp:30,hum:70,dryDays:0};
  const wd   = dist ? weatherData[dist.name] : null;
  const rain = wd?.daily?.precipitation_sum?.[0]||hs.rain||0;
  const temp = wd?.daily?.temperature_2m_max?.[0]||hs.temp||30;
  const hum  = hs.hum||70;
  const score= hs.score||50;
  const dryDays = hs.dryDays||0;
  const crops = dist?.crops||['Paddy','Coconut','Rubber'];
  const crop  = crops[0];
  const kb    = CROP_KB[crop]||CROP_KB['Vegetables'];
  const today = new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'});
  const flood = dist ? (floodComposite(dist.name)||0) : 0;
  const pest  = dist ? (pestMapScore(dist.name)||0) : 0;
  const month = new Date().getMonth();
  const loc   = districtName||'Kerala';

  if(/irrigat|water|moisture|drip/.test(q)){
    const urg = dryDays>4?'🔴 URGENT':dryDays>2?'🟠 Recommended':'🟢 Monitor';
    return `**💧 Irrigation Advisory — ${loc}** (${today})\n\n**Status:** ${urg} — ${dryDays} dry day(s)\n**Rainfall today:** ${rain.toFixed(1)}mm · **Humidity:** ${hum}%\n\n**${crop}:** ${kb.irrigate}\n\n${dryDays>4?'⚠️ Dry spell — irrigate all crops today immediately.':rain>20?'✅ Adequate rainfall — skip irrigation to prevent waterlogging.':'Monitor topsoil moisture — irrigate if dry 2cm down.'}\n\n${crops.length>1?`**Other crops (${crops.slice(1).join(', ')}):** Check individual water needs based on growth stage.`:''}`;
  }
  if(/disease|pest|fungal|insect|spray|blight|rot|wilt|attack|pathogen/.test(q)){
    const lvl = pest>=70?'🔴 HIGH':pest>=40?'🟠 MODERATE':'🟢 LOW';
    const active = (typeof DISEASE_KB!=='undefined'?DISEASE_KB:[]).filter(d=>{
      const cm=!d.crops?.length||d.crops.some(c=>crops.includes(c));
      const mm=!d.peakMonths?.length||d.peakMonths.includes(month+1);
      return cm&&mm;
    }).slice(0,3);
    const dList = active.length ? active.map(d=>`• **${d.emoji||'🌿'} ${d.name}:** ${d.action}`).join('\n') : '• No major disease alerts for this season.';
    return `**🐛 Disease & Pest Advisory — ${loc}** (${today})\n\n**Risk Level:** ${lvl} (score ${pest}/100)\n**Conditions:** ${rain.toFixed(1)}mm rain · ${temp.toFixed(0)}°C · ${hum}% humidity\n\n**Active threats for ${crop}:**\n${dList}\n\n**Disease management:** ${kb.disease}\n**Pest management:** ${kb.pest}\n\n${hum>85&&rain>10?'⚠️ High humidity + rain = elevated fungal risk. Apply preventive fungicide immediately.':'Conditions moderate — scout fields twice weekly and maintain field hygiene.'}`;
  }
  if(/fertiliz|manure|npk|nutrient|urea|dap|potash|zinc|deficien/.test(q)){
    return `**🌱 Fertilizer Advisory — ${loc}** (${today})\n\n**Primary crop:** ${crop} · **Health score:** ${score}/100\n**Conditions:** ${rain.toFixed(1)}mm rain · ${temp.toFixed(0)}°C\n\n**${crop} schedule:** ${kb.fertilize}\n\n${rain>30?'⚠️ Heavy rain forecast — delay top-dressing to avoid runoff loss.':dryDays>3?'⚠️ Dry conditions — irrigate before applying to prevent root burn.':'✅ Good conditions for fertilizer application today.'}\n\n**Organic tip:** Vermicompost 2t/ha + FYM 10t/ha improves soil health and reduces chemical input by 25–30%.`;
  }
  if(/market|price|sell|buy|mandi|rate|profit|value|trade/.test(q)){
    const pp = window._prices ? window._prices.filter(p=>crops.some(c=>p.name.toLowerCase().includes(c.toLowerCase().slice(0,4)))).slice(0,3) : [];
    const pl = pp.length ? pp.map(p=>`• **${p.name}:** ₹${p.price} ${p.unit} (${p.change>=0?'+':''}${p.change} today)`).join('\n') : '• Live prices loading — check Markets tab.';
    return `**📈 Market Advisory — ${loc}** (${today})\n\n**Your crops:** ${crops.join(', ')}\n\n**Live prices:**\n${pl}\n\n**${crop} market:** ${kb.market}\n\n**Tips:**\n• Check KSAMB daily bulletin: ksamb.kerala.gov.in\n• Trade on e-NAM for better price discovery\n• Form/join FPO for collective bargaining\n• Store if below seasonal average — usually recovers in 3–4 weeks`;
  }
  if(/flood|waterlog|drain|river|alert|inundat/.test(q)){
    const fl = flood>=70?'🔴 HIGH RISK':flood>=40?'🟠 MODERATE':'🟢 LOW';
    const fv = (typeof FLOOD_VULN!=='undefined'&&FLOOD_VULN)?FLOOD_VULN[districtName]:null;
    return `**🌊 Flood Risk Advisory — ${loc}** (${today})\n\n**Risk:** ${fl} (score ${flood}/100)\n**Rainfall today:** ${rain.toFixed(1)}mm\n${fv?`**Vulnerability:** ${fv.vuln} | Rivers: ${fv.rivers?.join(', ')||'N/A'}\n`:''}\n**Actions:**\n${flood>=70?'• 🛑 Halt all field operations\n• Move machinery & produce to high ground\n• Monitor KSDMA every 2 hours\n• Ensure pump drainage is functional':flood>=40?'• Prepare drainage channels in low-lying fields\n• Delay transplanting/direct sowing\n• Secure light equipment and inputs\n• Monitor river levels if near floodplains':'• Routine monitoring — normal precautions\n• Keep drainage channels clear\n• Ensure field bunds are intact'}\n\n**KSDMA helpline:** 0471-2364424`;
  }
  if(/plant|sow|crop plan|next season|cultivat|variety|which crop/.test(q)){
    const sn = month>=5&&month<=8?'Kharif (Virippu)':month>=9&&month<=11?'Rabi (Mundakan)':'Summer (Puncha/Pre-Kharif)';
    return `**🌾 Crop Planning — ${loc}** (${today})\n\n**Current season:** ${sn}\n**District crops:** ${crops.join(', ')}\n\n**Season guide for your crops:**\n${crops.map(c=>`• **${c}:** ${(CROP_KB[c]||CROP_KB['Vegetables']).season}`).join('\n')}\n\n**High-value options to consider:**\n• Vegetables (Rabi Oct–Feb): high returns, 60–90 day cycle\n• Banana (Nendran): ₹35–55/kg, strong Onam demand\n• Pepper: premium prices, semi drought-tolerant\n• Cardamom (Idukki belt): ₹1,400+/kg\n\n**This season:** ${month>=5&&month<=8?'Complete paddy transplanting before July 15. Ensure seed treatment done.':month>=9&&month<=11?'Harvest kharif crops. Prepare land for rabi vegetables and pulses.':'Focus on perennial crop maintenance. Plan summer irrigation schedule.'}`;
  }
  if(/scheme|subsid|govern|benefit|eligib|apply|pension|insurance|kisan/.test(q)){
    return `**🏛️ Govt Schemes — ${loc}**\n\n${SCHEMES.slice(0,5).map(s=>`**${s.title}**\n• ${s.body}\n• Deadline: ${s.deadline}\n• Ministry: ${s.ministry}`).join('\n\n')}\n\n**More:** Kerala Horticulture Mission (50–75% subsidy), RKVY grants, e-NAM registration.\n\nVisit your **Krishi Bhavan** with Aadhaar + land records to apply for most schemes.`;
  }
  // General / today
  const acts=[];
  if(dryDays>3) acts.push(`💧 Irrigate ${crop} — ${dryDays} dry days`);
  if(rain>30) acts.push(`🌊 Check drainage — ${rain.toFixed(0)}mm rain today`);
  if(temp>36) acts.push(`🌡️ Heat stress — mulch soil and shade nurseries`);
  if(pest>=60) acts.push(`🐛 Scout for disease — risk score ${pest}/100`);
  if(flood>=60) acts.push(`⚠️ Flood precautions — risk score ${flood}/100`);
  if(score<50) acts.push(`🔴 Crop health critical (${score}/100) — urgent intervention`);
  if(!acts.length) acts.push('✅ Conditions moderate — routine monitoring','📋 Check soil moisture','🌿 Inspect for early pest signs');
  return `**📋 Today's Advisory — ${loc}** (${today})\n\n**Health:** ${score}/100 · **Crop:** ${crop}${crops.length>1?` + ${crops.slice(1).join(', ')}`:''}\n**Weather:** ${rain.toFixed(1)}mm · ${temp.toFixed(0)}°C · ${hum}% humidity\n\n**Priority actions today:**\n${acts.map(a=>`• ${a}`).join('\n')}\n\n**${crop} seasonal note:** ${kb.season}\n\n_Based on Open-Meteo live weather · ${today}_`;
}

async function geminiAnswer(question, districtName){
  // ── Firebase AI Logic path (key lives on Firebase servers, never exposed) ──
  if(window._firebaseReady && window._firebaseModel){
    const dist  = DISTRICTS.find(d=>d.name===districtName);
    const hs    = dist?(healthScores[dist.name]||{score:50,hum:70}):{score:50,hum:70};
    const wd    = dist?weatherData[dist.name]:null;
    const rain  = wd?.daily?.precipitation_sum?.[0]||0;
    const temp  = wd?.daily?.temperature_2m_max?.[0]||30;
    const crops = dist?.crops?.join(', ')||'Paddy, Coconut, Rubber';
    const today = new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
    const flood = dist?(floodComposite(dist.name)||0):0;
    const pest  = dist?(pestMapScore(dist.name)||0):0;

    const prompt = `You are AgroScope, an expert AI agricultural advisor for Kerala, India.
Today: ${today}. District: ${districtName||'Kerala'}. Crops: ${crops}.
Crop health: ${hs.score||50}/100. Rainfall: ${rain.toFixed(1)}mm. Temp: ${temp.toFixed(0)}°C. Humidity: ${hs.hum||70}%.
Flood risk: ${flood}/100. Disease/pest risk: ${pest}/100.
Provide concise actionable advice specific to Kerala farmers. Use Indian units (kg/ha, ₹/qt).
Reference KAU (Kerala Agricultural University) recommendations and Kerala govt schemes where relevant.
Format with bold headers (**text**) and bullet points. Keep under 250 words.

Farmer's question: ${question}`;

    const result = await window._firebaseModel.generateContent(prompt);
    return result.response.text();
  }

  // ── Fallback: direct Gemini REST API (if user has manually set a key) ──────
  if(_geminiKey && _geminiKey.length>20){
    const dist  = DISTRICTS.find(d=>d.name===districtName);
    const hs    = dist?(healthScores[dist.name]||{score:50,hum:70}):{score:50,hum:70};
    const wd    = dist?weatherData[dist.name]:null;
    const rain  = wd?.daily?.precipitation_sum?.[0]||0;
    const temp  = wd?.daily?.temperature_2m_max?.[0]||30;
    const crops = dist?.crops?.join(', ')||'Paddy, Coconut, Rubber';
    const today = new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
    const ctx   = `You are AgroScope, an expert AI agricultural advisor for Kerala, India. Today: ${today}. District: ${districtName||'Kerala'}. Crops: ${crops}. Crop health: ${hs.score||50}/100. Rainfall: ${rain.toFixed(1)}mm. Temp: ${temp.toFixed(0)}°C. Humidity: ${hs.hum||70}%. Provide concise actionable Kerala farming advice in under 250 words.`;
    const url   = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${_geminiKey}`;
    const body  = {
      contents:[
        {role:'user',parts:[{text:ctx}]},
        ..._aiHistory.slice(-6).map(h=>({role:h.role,parts:[{text:h.text}]})),
        {role:'user',parts:[{text:question}]}
      ],
      generationConfig:{maxOutputTokens:450,temperature:0.4}
    };
    const res = await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    if(!res.ok){const e=await res.json();throw new Error(e.error?.message||`HTTP ${res.status}`);}
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text||'No response received.';
  }

  throw new Error('No AI backend available');
}

function waitForFirebase(timeoutMs=4000){
  return new Promise(resolve=>{
    if(window._firebaseReady!==undefined){ resolve(window._firebaseReady); return; }
    const start=Date.now();
    const iv=setInterval(()=>{
      if(window._firebaseReady!==undefined||Date.now()-start>timeoutMs){
        clearInterval(iv);
        resolve(!!window._firebaseReady);
      }
    },100);
  });
}

async function aiSend(){
  const ta=document.getElementById('ai-textarea');
  const btn=document.getElementById('ai-send-btn');
  const sel=document.getElementById('ai-district-sel');
  const hist=document.getElementById('ai-chat-history');
  const q=ta.value.trim();if(!q)return;
  // Wait for Firebase module to finish loading (handles async ES module timing)
  if(window._firebaseReady===undefined) await waitForFirebase(3000);
  const district=sel.value||'';
  const welcome=hist.querySelector('.ai-welcome');if(welcome)welcome.remove();
  hist.innerHTML+=`<div class="ai-bubble user">${escHtml(q)}<div class="ai-bubble-meta">${district||'All Kerala'} · ${new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</div></div>`;
  ta.value='';btn.disabled=true;
  const tid='t'+Date.now();
  hist.innerHTML+=`<div class="ai-bubble bot thinking" id="${tid}">⟳ Thinking…</div>`;
  hist.scrollTop=hist.scrollHeight;
  _aiHistory.push({role:'user',text:q});
  let ans='';
  try{
    // Check Firebase (may still be loading — waitForFirebase polls up to 3s)
    const fbReady = window._firebaseReady !== undefined
      ? window._firebaseReady
      : await waitForFirebase(3000);
    if(fbReady || (_geminiKey && _geminiKey.length>20)){
      ans = await geminiAnswer(q, district);
    }
    else ans=ruleEngineAnswer(q,district);
  }catch(e){
    ans=`⚠️ ${e.message}\n\nFalling back to rule engine:\n\n${ruleEngineAnswer(q,district)}`;
  }
  _aiHistory.push({role:'model',text:ans});
  const th=document.getElementById(tid);if(th)th.remove();
  const fmt=ans.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/\n/g,'<br>');
  hist.innerHTML+=`<div class="ai-bubble bot">${fmt}<div class="ai-bubble-meta">${window._firebaseReady?'Firebase AI':(_geminiKey&&_geminiKey.length>20)?'Gemini AI':'Rule Engine'} · ${district||'All Kerala'} · ${new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</div></div>`;
  hist.scrollTop=hist.scrollHeight;
  btn.disabled=false;
  renderAIQuickCards(district);
}

function aiKeydown(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();aiSend();}}

function onApiKeyInput(val){
  _geminiKey=val.trim();
  const s=document.getElementById('ai-key-status');
  const m=document.getElementById('ai-mode-badge');
  if(_geminiKey.length>20){s.textContent='Key set ✓';s.className='ai-key-badge connected';m.textContent='Gemini AI';m.className='ai-key-badge connected';}
  else{s.textContent='No Key';s.className='ai-key-badge disconnected';m.textContent='Rule Engine';m.className='ai-key-badge disconnected';}
}

function aiChip(text){
  const ta=document.getElementById('ai-textarea');
  ta.value=text;
  aiSend();
}


function renderAIQuickCards(districtName){
  const list=document.getElementById('ai-quick-list');if(!list)return;
  const dist=DISTRICTS.find(d=>d.name===districtName);
  const cards=[];
  if(dist){
    const hs=healthScores[dist.name]||{score:50,rain:0,temp:30,hum:70,dryDays:0};
    const flood=floodComposite(dist.name)||0;
    const pest=pestMapScore(dist.name)||0;
    const crops=dist.crops;
    cards.push({icon:'🌿',title:`${crops[0]} Health`,sev:hs.score<40?'Critical':hs.score<65?'Warning':'Good',sc:hs.score<40?'c':hs.score<65?'w':'g',body:`Score ${hs.score}/100 · ${(hs.rain||0).toFixed(1)}mm rain · ${(hs.temp||30).toFixed(0)}°C · ${hs.hum||70}% humidity`,acts:[{l:'💧 Irrigate',q:`Irrigation advice for ${crops[0]} in ${districtName}`},{l:'🌱 Fertilize',q:`Fertilizer schedule for ${crops[0]} in ${districtName}`},{l:'🐛 Scout',q:`Disease risk for ${crops[0]} in ${districtName}`}]});
    cards.push({icon:'🌊',title:'Flood Risk',sev:flood>=70?'High':flood>=40?'Moderate':'Low',sc:flood>=70?'c':flood>=40?'w':'g',body:`Composite score ${flood}/100 · ${(hs.rain||0).toFixed(1)}mm today`,acts:[{l:'Precautions',q:`Flood precautions for ${districtName}`}]});
    cards.push({icon:'🐛',title:'Disease Risk',sev:pest>=70?'High':pest>=40?'Moderate':'Low',sc:pest>=70?'c':pest>=40?'w':'g',body:`Risk score ${pest}/100 · ${hs.hum||70}% humidity · ${(hs.rain||0).toFixed(1)}mm rain`,acts:crops.slice(0,2).map(c=>({l:`${c} diseases`,q:`Disease risks for ${c} in ${districtName}`}))});
    const pp=window._prices?window._prices.filter(p=>crops.some(c=>p.name.toLowerCase().includes(c.toLowerCase().slice(0,4)))).slice(0,2):[];
    cards.push({icon:'📈',title:'Market',sev:'',sc:'g',body:pp.length?pp.map(p=>`${p.name}: ₹${p.price} (${p.change>=0?'+':''}${p.change})`).join(' · '):'Tap for live prices',acts:[{l:'Sell timing',q:`Market timing for ${crops[0]} in ${districtName}`}]});
    cards.push({icon:'🌾',title:'Crop Planning',sev:'',sc:'g',body:`Season: ${new Date().getMonth()>=5&&new Date().getMonth()<=8?'Kharif active':new Date().getMonth()>=9?'Rabi season':'Pre-monsoon'} · Crops: ${crops.join(', ')}`,acts:[{l:'What to plant',q:`What crops to plant next season in ${districtName}`},{l:'Harvest timing',q:`Harvest timing for ${crops[0]} in ${districtName}`}]});
  } else {
    const avg=Object.values(healthScores).reduce((s,h)=>s+(h?.score||50),0)/14;
    const crit=DISTRICTS.filter(d=>(healthScores[d.name]?.score||50)<50);
    cards.push({icon:'🗺️',title:'Kerala Overview',sev:'',sc:'g',body:`Avg health ${avg.toFixed(0)}/100 · ${crit.length} district(s) need attention`,acts:[{l:'Highest risk district',q:'Which district has highest crop risk today?'},{l:'Today\'s overview',q:'Give me an overview of Kerala farming conditions today'}]});
    DISTRICTS.slice(0,4).forEach(d=>{
      const hs=healthScores[d.name]||{score:50};
      cards.push({icon:'📍',title:d.name,sev:`${hs.score}/100`,sc:hs.score<50?'c':hs.score<70?'w':'g',body:`${d.crops.slice(0,2).join(', ')} · Score ${hs.score}/100`,acts:[{l:'Full advisory',q:`Full farming advisory for ${d.name}`}]});
    });
  }
  document.getElementById('ai-adv-count').textContent=cards.length;
  list.innerHTML=cards.map(c=>`<div class="ai-qcard"><div class="ai-qcard-head"><span class="ai-qcard-icon">${c.icon}</span><span class="ai-qcard-title">${c.title}</span>${c.sev?`<span class="ai-qcard-sev sev-${c.sc}">${c.sev}</span>`:''}</div><div class="ai-qcard-body">${c.body}</div><div class="ai-qcard-actions">${c.acts.map(a=>`<button class="ai-qcard-btn" onclick="aiChipQ(${JSON.stringify(a.q)})">${a.l}</button>`).join('')}</div></div>`).join('');
}

function aiChipQ(q){
  const ta=document.getElementById('ai-textarea');
  ta.value=q;aiSend();
}

function initAIAdvisory(){
  // Re-check Firebase status after module loads (async)
  setTimeout(async()=>{
    const ready = await waitForFirebase(5000);
    const s=document.getElementById('ai-key-status');
    const m=document.getElementById('ai-mode-badge');
    if(ready){
      if(s){s.textContent='Connected ✓';s.className='ai-key-badge connected';}
      if(m){m.textContent='Firebase AI';m.className='ai-key-badge connected';}
    } else {
      if(s){s.textContent='Not configured';s.className='ai-key-badge disconnected';}
      if(m){m.textContent='Rule Engine';m.className='ai-key-badge disconnected';}
    }
  },500);
  // Update status badge based on Firebase readiness
  const statusBadge = document.getElementById('ai-key-status');
  const modeBadge   = document.getElementById('ai-mode-badge');
  if(window._firebaseReady){
    if(statusBadge){statusBadge.textContent='Connected ✓';statusBadge.className='ai-key-badge connected';}
    if(modeBadge){modeBadge.textContent='Firebase AI';modeBadge.className='ai-key-badge connected';}
  } else {
    if(statusBadge){statusBadge.textContent='Config needed';statusBadge.className='ai-key-badge disconnected';}
    if(modeBadge){modeBadge.textContent='Rule Engine';modeBadge.className='ai-key-badge disconnected';}
  }
  const sel=document.getElementById('ai-district-sel');
  if(sel&&sel.options.length===1){
    DISTRICTS.forEach(d=>{const o=document.createElement('option');o.value=d.name;o.textContent=d.name;sel.appendChild(o);});
  }
  renderAIQuickCards('');
}

