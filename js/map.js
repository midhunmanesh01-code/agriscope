
// Pest / disease map helpers
function pestMapScore(districtName) {
  let max = 0;
  DISEASE_KB.forEach(d => {
    const s = computePestRisk(d, districtName);
    if (s > max) max = s;
  });
  return max;
}


function pestMapColor(score) {
  if (score >= 70) return '#f87171'; //high   — red
  if (score >= 45) return '#fb923c'; //medium — orange
  if (score >= 22) return '#c47a2e'; //watch  — amber
  return '#1a2f22';                  //none   — dark green
}


//choropleth fill dispatcher

function districtFill(name) {
  const v = getTodayVal(name, currentLayer);
  if (v === null) return '#1c2a20';

  if (currentLayer === 'rainfall') {
    if (v < 1)  return '#1a2f22';
    if (v < 5)  return '#164e63';
    if (v < 15) return '#0ea5e9';
    if (v < 30) return '#38bdf8';
    if (v < 50) return '#7dd3fc';
    return '#bae6fd';
  }

  if (currentLayer === 'temperature') {
    if (v < 28) return '#1e3a5f';
    if (v < 32) return '#854d0e';
    if (v < 35) return '#ea580c';
    return '#ef4444';
  }

  if (currentLayer === 'humidity') {
    if (v < 50) return '#1a2f22';
    if (v < 65) return '#5b21b6';
    if (v < 80) return '#7c3aed';
    return '#a78bfa';
  }

  if (currentLayer === 'crophealth') return healthColor(v);
  if (currentLayer === 'pestmap')    return pestMapColor(v);
  if (currentLayer === 'floodrisk')  return floodColor(floodComposite(name));

  return '#1c2a20';
}


//GeoJSON choropleth layer


function renderGeoLayer(geojson) {
  if (geoLayer) map.removeLayer(geoLayer);

  geoLayer = L.geoJSON(geojson, {
    style: f => ({
      fillColor:   districtFill(f.properties.DISTRICT),
      weight:      1,
      opacity:     0.6,
      color:       'rgba(255,255,255,0.15)',
      fillOpacity: 0.85,
    }),
    onEachFeature: (f, layer) => {
      const name = f.properties.DISTRICT;
      layer.on({
        mouseover: e => {
          e.target.setStyle({
            weight:      2,
            color:       'rgba(255,255,255,0.5)',
            fillOpacity: 0.95,
          });
        },
        mouseout: e => { geoLayer.resetStyle(e.target); },
        click: () => showDistrictDetail(
          name,
          currentLayer === 'crophealth' ? 'health'  :
          currentLayer === 'pestmap'    ? 'pests'   :
          currentLayer === 'floodrisk'  ? 'flood'   : 'weather'
        ),
      });
    },
  }).addTo(map);
}


function refreshMap() {
  if (!geoLayer) return;
  geoLayer.eachLayer(l =>
    l.setStyle({ fillColor: districtFill(l.feature.properties.DISTRICT) })
  );
}


//NASA MODIS NDVI WMS overlay


function toggleNASA() {
  nasaOn = !nasaOn;
  const btn   = document.getElementById('btn-nasa');
  const badge = document.getElementById('nasa-badge');

  if (nasaOn) {
    nasaLayer = L.tileLayer.wms(
      'https://gibs.earthdata.nasa.gov/wms/epsg3857/best/wms.cgi',
      {
        layers:      'MODIS_Terra_NDVI_8Day',
        format:      'image/png',
        transparent: true,
        opacity:     0.55,
        attribution: 'NASA GIBS',
      }
    ).addTo(map);
    btn.classList.add('l-purple');
    badge.style.display = 'block';
  } else {
    if (nasaLayer) { map.removeLayer(nasaLayer); nasaLayer = null; }
    btn.classList.remove('l-purple');
    badge.style.display = 'none';
  }
}


//Layer legend configuration

const LEGENDS = {
  rainfall: {
    title: 'Rainfall (mm/day)',
    bar:   'linear-gradient(90deg,#1a2f22,#164e63,#0ea5e9,#38bdf8,#bae6fd)',
    min:   '0',
    max:   '50mm+',
  },
  temperature: {
    title: 'Max Temperature (°C)',
    bar:   'linear-gradient(90deg,#1e3a5f,#854d0e,#ea580c,#ef4444)',
    min:   '25°',
    max:   '38°+',
  },
  humidity: {
    title: 'Avg Humidity (%)',
    bar:   'linear-gradient(90deg,#1a2f22,#5b21b6,#7c3aed,#a78bfa)',
    min:   '40%',
    max:   '95%',
  },
  crophealth: {
    title: 'Crop Health Score',
    bar:   'linear-gradient(90deg,#f87171,#fb923c,#facc15,#86efac,#4ade80)',
    min:   '0',
    max:   '100',
  },
  pestmap: {
    title: 'Disease Risk Level',
    bar:   'linear-gradient(90deg,#1a2f22,#854d0e,#fb923c,#f87171)',
    min:   'None',
    max:   'High',
  },
  floodrisk: {
    title: 'Flood / Disaster Risk',
    bar:   'linear-gradient(90deg,#1a2f22,#facc15,#fb923c,#f87171)',
    min:   'Low',
    max:   'Extreme',
  },
};


//Layer selector

/** Button accent classes keyed by layer id. */
const _LAYER_ACCENT = {
  rainfall:    'l-blue',
  temperature: 'l-orange',
  humidity:    'l-purple',
  crophealth:  'l-green',
  pestmap:     'l-orange',
  floodrisk:   'l-blue',
};


const _LAYER_BTN_IDS = ['rainfall', 'temperature', 'humidity', 'crophealth', 'pestmap', 'floodrisk'];

function setLayer(type, forceOn = false) {
  if (currentLayer === type && !forceOn) {
    currentLayer = 'none';

    _LAYER_BTN_IDS.forEach(t => {
      const b = document.getElementById('btn-' + t);
      if (b) b.className = 'layer-btn';
    });

    if (geoLayer) geoLayer.eachLayer(l => l.setStyle({ fillColor: '#1c2a20' }));
    document.getElementById('legend-title').textContent       = 'No Layer Selected';
    document.getElementById('legend-bar').style.background    = 'linear-gradient(90deg,#1c2a20,#1c2a20)';
    document.getElementById('legend-min').textContent         = '';
    document.getElementById('legend-max').textContent         = '';
    return;
  }

  //Activate layer
  currentLayer = type;

  //Reset all buttons then highlight the active one
  _LAYER_BTN_IDS.forEach(t => {
    const b = document.getElementById('btn-' + t);
    if (b) b.className = 'layer-btn';
  });
  const activeBtn = document.getElementById('btn-' + type);
  if (activeBtn) activeBtn.classList.add(_LAYER_ACCENT[type] || 'l-orange');

  //Update legend
  const leg = LEGENDS[type];
  document.getElementById('legend-title').textContent    = leg.title;
  document.getElementById('legend-bar').style.background = leg.bar;
  document.getElementById('legend-min').textContent      = leg.min;
  document.getElementById('legend-max').textContent      = leg.max;

  refreshMap();
}