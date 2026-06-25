// ═══════════════════════════════════════════════════════
//  PEST & DISEASE ENGINE — KAU/ICAR rule-based risk model
// ═══════════════════════════════════════════════════════
function computePestRisk(disease, districtName){
  const wd = weatherData[districtName];
  if(!wd||!wd.daily) return 0;
  const d = DISTRICTS.find(x=>x.name===districtName);
  if(!d) return 0;

  const rain = wd.daily.precipitation_sum?.[0]||0;
  const temp = wd.daily.temperature_2m_max?.[0]||30;
  const humArr = (wd.hourly?.relativehumidity_2m||[]).slice(0,24);
  const hum  = humArr.length ? Math.round(humArr.reduce((a,b)=>a+b)/humArr.length) : 70;
  const hs   = healthScores[districtName];
  const dryDays = hs?.dryDays||0;

  const r=disease.rules; let score=0,total=0;
  function add(val,mn,mx,wt){
    total+=wt;
    if(mn!==undefined&&mx!==undefined){
      if(val>=mn&&val<=mx){score+=wt;return;}
      score+=wt*Math.max(0,1-Math.min(mn!==undefined?Math.abs(val<mn?mn-val:val-mx):999,mx-mn||1)/(((mx||mn)-(mn||mx)||1)*1.5));
    } else if(mn!==undefined){
      score+=val>=mn?wt:wt*Math.max(0,1-(mn-val)/(mn*0.3||1));
    } else if(mx!==undefined){
      score+=val<=mx?wt:wt*Math.max(0,1-(val-mx)/(mx*0.3||1));
    }
  }
  if(r.rainMin!==undefined||r.rainMax!==undefined) add(rain,r.rainMin,r.rainMax,disease.w.rain||33);
  if(r.tempMin!==undefined||r.tempMax!==undefined) add(temp,r.tempMin,r.tempMax,disease.w.temp||33);
  if(r.humMin!==undefined)  add(hum,r.humMin,100,disease.w.hum||33);
  if(r.dryDaysMin!==undefined) add(dryDays,r.dryDaysMin,30,disease.w.dryDays||50);

  const raw=total>0?(score/total)*100:0;
  const month=new Date().getMonth()+1;
  const isPeak=disease.peakMonths.includes(month);
  const prevMonth = month === 1 ? 12 : month - 1;
  const nextMonth = month === 12 ? 1 : month + 1;
  const isAdj=disease.peakMonths.includes(prevMonth)||disease.peakMonths.includes(nextMonth);
  const seasonMult=isPeak?1.2:isAdj?1.0:0.6;
  const cropMatch=disease.crops.some(c=>d.crops.some(dc=>dc.toLowerCase().includes(c.toLowerCase())||c.toLowerCase().includes(dc.toLowerCase())));
  return Math.min(100,Math.round(raw*seasonMult*(cropMatch?1.0:0.4)));
}

function pestLevel(score){ return score>=70?'high':score>=45?'moderate':score>=22?'watch':null; }
function pestLevelClass(l){ return l==='high'?'pc-high':l==='moderate'?'pc-moderate':'pc-watch'; }
function pestEmoji(l){ return l==='high'?'🔴':l==='moderate'?'🟠':'🟡'; }


function pestMapScore(districtName){
  // max risk score across all diseases for this district
  let max=0;
  DISEASE_KB.forEach(d=>{ const s=computePestRisk(d,districtName); if(s>max) max=s; });
  return max;
}

function pestMapColor(score){
  if(score>=70) return '#f87171';
  if(score>=45) return '#fb923c';
  if(score>=22) return '#c47a2e';
  return '#1a2f22';
}

// ── Right panel pest cards ────────────────────────────────────────────────────
function renderPestCards(){
  const list=document.getElementById('pest-cards-list'); if(!list) return;
  const results=[];
  DISEASE_KB.forEach(disease=>{
    let maxScore=0; const topDistricts=[];
    DISTRICTS.forEach(d=>{
      const s=computePestRisk(disease,d.name);
      if(s>=22){ topDistricts.push(d.name); if(s>maxScore) maxScore=s; }
    });
    if(maxScore>=22) results.push({disease,maxScore,topDistricts,level:pestLevel(maxScore)});
  });
  results.sort((a,b)=>b.maxScore-a.maxScore);

    // update KPI alert count
  const highCount=results.filter(r=>r.level==='high').length;
  const el=document.getElementById('kpi-alerts'); if(el) el.textContent=results.length;
  const el2=document.getElementById('kpi-alerts-sub'); if(el2) el2.textContent=highCount>0?`${highCount} high-risk diseases`:'No high alerts';

  if(results.length===0){
    list.innerHTML='<div style="padding:14px;font-size:11px;color:var(--color-primary)">✅ No active disease alerts</div>';
    return;
  }
  list.innerHTML=results.slice(0,12).map(({disease,maxScore,topDistricts,level})=>`
    <div class="pest-card">
      <div class="pc-row1">
        <span style="font-size:13px">${disease.emoji}</span>
        <span style="font-size:11px;font-weight:600;flex:1">${disease.name}</span>
        <span class="pc-badge ${pestLevelClass(level)}">${pestEmoji(level)} ${maxScore}</span>
      </div>
      <div class="pc-crop">${disease.crops.join(' · ')} · <em>${disease.src}</em></div>
      <div class="pc-districts">${topDistricts.slice(0,4).join(', ')}${topDistricts.length>4?` +${topDistricts.length-4} more`:''}</div>
      <div class="pc-action">${disease.action.split('.')[0]}.</div>
    </div>`).join('');


}

// ── District popup pest tab ────────────────────────────────────────────────────
function populateDDPests(districtName){
  const list=document.getElementById('dd-pest-list'); if(!list) return;
  const results=[];
  DISEASE_KB.forEach(disease=>{
    const score=computePestRisk(disease,districtName);
    if(score>=22) results.push({disease,score});
  });
  results.sort((a,b)=>b.score-a.score);

  if(results.length===0){
    // Show upcoming seasonal risks
    const month=new Date().getMonth()+1;
    const upcoming=[];
    const mNames=['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    DISEASE_KB.forEach(disease=>{
      const next=disease.peakMonths.find(m=>m>month)||disease.peakMonths[0];
      const away=next>month?next-month:(12-month)+next;
      if(away<=3) upcoming.push({disease,next,away});
    });
    upcoming.sort((a,b)=>a.away-b.away);
    if(upcoming.length>0){
      list.innerHTML='<div style="font-size:9px;color:var(--color-text-faint);font-weight:600;text-transform:uppercase;letter-spacing:0.5px;padding:4px 0 8px">📅 Upcoming — next 3 months</div>'
        +upcoming.slice(0,5).map(({disease,next})=>`
        <div class="dd-pest-item pw">
          <div class="dd-pest-row1">
            <span style="font-size:12px">${disease.emoji}</span>
            <span style="font-size:11px;font-weight:600;flex:1">${disease.name}</span>
            <span style="font-size:10px;color:var(--color-text-faint)">Peak: ${mNames[next]}</span>
          </div>
          <div style="font-size:10px;color:var(--color-text-muted);margin-bottom:2px">${disease.crops.join(' · ')}</div>
          <div class="dd-pest-action">${disease.action.split('.')[0]}.</div>
        </div>`).join('')
        +'<div style="font-size:9px;color:var(--color-text-faint);margin-top:4px">No active alerts now · Prepare before peak season</div>';
    } else {
      list.innerHTML='<div style="padding:10px 0;font-size:11px;color:var(--color-primary)">✅ No active or upcoming disease alerts</div>';
    }
    return;
  }
  list.innerHTML=results.map(({disease,score})=>{
    const level=pestLevel(score);
    const col=level==='high'?'#f87171':level==='moderate'?'#fb923c':'#facc15';
    const cls=level==='high'?'ph':level==='moderate'?'pm':'pw';
    return `<div class="dd-pest-item ${cls}">
      <div class="dd-pest-row1">
        <span style="font-size:13px">${disease.emoji}</span>
        <span style="font-size:11px;font-weight:600;flex:1">${disease.name}</span>
        <span style="font-size:11px;font-weight:700;color:${col}">${pestEmoji(level)} ${score}/100</span>
      </div>
      <div style="font-size:10px;color:var(--color-text-muted);margin-bottom:3px">${disease.crops.join(' · ')}</div>
      <div class="dd-pest-action">${disease.action}</div>
    </div>`;
  }).join('');
}