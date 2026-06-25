(function () {
  function scoreInRange(val, min, max, weight) {
    if (val === null || val === undefined) return weight * 0.5;
    if (val >= min && val <= max) return weight;
    const range = max - min;
    const over = val > max ? val - max : min - val;
    const penalty = Math.min(1, over / (range * 0.8));
    return weight * (1 - penalty);
  }

  function computeHealthScore(districtName) {
    const d = DISTRICTS.find((x) => x.name === districtName);
    if (!d) return { score: 50, breakdown: {} };
    const wd = weatherData[districtName];
    if (!wd || !wd.daily) {
      return { score: 50, breakdown: {}, rain: 0, temp: 30, hum: 70, dryDays: 0 };
    }

    const rainSeries = Array.isArray(wd.daily?.precipitation_sum) ? wd.daily.precipitation_sum : [];
    const tempSeries = Array.isArray(wd.daily?.temperature_2m_max) ? wd.daily.temperature_2m_max : [];
    const humSeries = Array.isArray(wd.hourly?.relativehumidity_2m) ? wd.hourly.relativehumidity_2m : [];
    const rain = rainSeries[0] ?? 0;
    const temp = tempSeries[0] ?? 30;
    const humSlice = humSeries.slice(0, 24);
    const hum = humSlice.length ? Math.round(humSlice.reduce((a, b) => a + b) / humSlice.length) : 70;

    let dryDays = 0;
    for (let i = 0; i < Math.min(7, rainSeries.length); i++) {
      if ((rainSeries[i] || 0) < 2) dryDays++;
      else break;
    }

    const hasWeatherData = rainSeries.length || tempSeries.length || humSlice.length;
    if (!hasWeatherData) {
      return { score: 50, breakdown: {}, rain, temp, hum, dryDays };
    }

    const rainScore = scoreInRange(rain, d.idealRain[0], d.idealRain[1], 30);
    const tempScore = scoreInRange(temp, d.idealTemp[0], d.idealTemp[1], 25);
    const humScore = scoreInRange(hum, d.idealHum[0], d.idealHum[1], 20);
    const dryPenalty = Math.min(15, dryDays * 2.5);
    const dryScore = 15 - dryPenalty;

    const month = new Date().getMonth() + 1;
    const seasonScore = month >= 6 && month <= 9 ? 10 : month >= 10 && month <= 12 ? 8 : 6;

    const total = Math.round(Math.min(100, Math.max(0, rainScore + tempScore + humScore + dryScore + seasonScore)));

    return {
      score: total,
      breakdown: {
        Rainfall: { pct: Math.round((rainScore / 30) * 100), val: rain.toFixed(1) + 'mm' },
        Temperature: { pct: Math.round((tempScore / 25) * 100), val: temp.toFixed(0) + '°C' },
        Humidity: { pct: Math.round((humScore / 20) * 100), val: hum + '%' },
        'Dry Spell': { pct: Math.round((dryScore / 15) * 100), val: dryDays + ' days' },
        'Season Fit': { pct: Math.round((seasonScore / 10) * 100), val: month >= 6 && month <= 9 ? 'Kharif ✓' : 'Pre-season' },
      },
      dryDays,
      rain,
      temp,
      hum,
    };
  }

  function computeAllHealth() {
    DISTRICTS.forEach((d) => {
      try {
        healthScores[d.name] = computeHealthScore(d.name);
      } catch (e) {
        healthScores[d.name] = { score: 50, breakdown: {}, rain: 0, temp: 30, hum: 70, dryDays: 0 };
      }
    });
  }

  function healthColor(score) {
    if (score >= 85) return '#4ade80';
    if (score >= 70) return '#86efac';
    if (score >= 55) return '#facc15';
    if (score >= 40) return '#fb923c';
    return '#f87171';
  }

  function healthLabel(score) {
    if (score >= 85) return '🟢 Thriving';
    if (score >= 70) return '🟩 Healthy';
    if (score >= 55) return '🟡 Moderate';
    if (score >= 40) return '🟠 Stressed';
    return '🔴 Critical';
  }

  function getTodayVal(name, metric) {
    const d = weatherData[name];
    if (!d || !d.daily) return null;
    if (metric === 'rainfall') return d.daily.precipitation_sum?.[0] ?? null;
    if (metric === 'temperature') return d.daily.temperature_2m_max?.[0] ?? null;
    if (metric === 'humidity') {
      const sl = (d.hourly?.relativehumidity_2m || []).slice(0, 24);
      return sl.length ? Math.round(sl.reduce((a, b) => a + b) / sl.length) : null;
    }
    if (metric === 'crophealth') return healthScores?.[name]?.score ?? null;
    if (metric === 'pestmap') return pestMapScore?.(name);
    if (metric === 'floodrisk') return floodComposite?.(name);
    return null;
  }

  window.scoreInRange = scoreInRange;
  window.computeHealthScore = computeHealthScore;
  window.computeAllHealth = computeAllHealth;
  window.healthColor = healthColor;
  window.healthLabel = healthLabel;
  window.getTodayVal = getTodayVal;
})();
