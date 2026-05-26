# AgroScope Kerala 🌱
[![Live Demo](https://img.shields.io/badge/Live-vvramxcec.github.io/agriscope-green?logo=github)](https://vvramxcec.github.io/agriscope) [![Gemini AI](https://img.shields.io/badge/AI-Gemini%202.0-green?logo=google)](https://ai.google.dev) [![Open-Meteo](https://img.shields.io/badge/Weather-Open--Meteo-blue)](https://open-meteo.com)

**Real-time Agricultural Intelligence Dashboard** for Kerala's 14 districts. Combines live weather, crop health scoring, market prices, flood risk, disease alerts, NASA satellite imagery, and **Gemini AI advisory** in a single browser app.

<img src="https://github.com/vvramxcec/agriscope/blob/main/Preview.png" alt="AgroScope Dashboard Preview" width="100%"/>

## 🚀 Features

| **Module** | **What it does** | **Data Source** |
|------------|------------------|-----------------|
| 🗺️ **Interactive Map** | Choropleth Kerala districts, 7 layers (rain, temp, health, flood, pests, NDVI) | Leaflet.js + GeoJSON |
| 🌤 **Live Weather** | 7-day forecasts for all 14 districts | Open-Meteo API |
| 🌿 **Crop Health** | 0-100 score vs. ideal conditions (KAU/ICAR data) | Weather vs. crop KB |
| 💰 **Market Prices** | 20+ Kerala mandi commodities + trends | KSAMB (seeded) |
| 🚨 **Disease Alerts** | 20+ Kerala crop diseases via weather rules | DISEASE_KB |
| 🌊 **Flood Risk** | IMD alerts + rainfall + KSDMA vulnerability | Composite engine |
| 🛰️ **NASA NDVI** | Live vegetation health satellite overlay | NASA GIBS MODIS |
| 🤖 **AI Advisory** | Gemini AI chatbot + offline rule engine | Google Gemini + CROP_KB |
| 📰 **News Hub** | Advisories, bulletins, schemes, RSS feeds | Synthetic + RSS |

## 🎮 Live Demo
```
https://vvramxcec.github.io/agriscope
```
**Works on any device** — no installation. Open in browser and start using immediately.

## 📱 Quick Start

1. **Download** `index.html` (single file — 185 KB)
2. **Double-click** to open in browser
3. **Or serve locally**: `python -m http.server 8080`
4. **Or deploy**: Drop to GitHub Pages / Firebase Hosting

```
💡 PRO TIP: For full RSS feeds, serve via HTTP (not file://). Weather/map/AI work offline too.
```

## 🛠 Tech Stack

```
Frontend: Single HTML file (Zero build tools)
├── Leaflet.js 1.9.4     # Interactive map
├── Chart.js             # Trends & sparklines
├── Google Gemini API    # AI Advisory (gemini-2.0-flash)
├── Open-Meteo           # Free weather API
├── NASA GIBS WMS        # MODIS Terra NDVI satellite
├── CartoDB Dark Matter  # Base map tiles
├── Lucide Icons         # Consistent icons
└── Satoshi (Fontshare)  # Typography
```

## 🌾 Kerala Agriculture Coverage

**14 Districts** | **Primary Crops** | **Ideal Conditions**
---|---|---
Thiruvananthapuram | Tapioca, Coconut, Vegetables | 25-35°C, 3-10mm rain
Alappuzha | Rice, Coconut, Coir | 24-32°C, 5-15mm rain
Idukki | Cardamom, Tea, Coffee | 18-26°C, 8-20mm rain
Ernakulam | Coconut, Vegetables, Banana | 27-33°C, 3-8mm rain
Wayanad | Coffee, Tea, Pepper, Cardamom | 20-28°C, 5-15mm rain

**20+ Commodities** tracked: Paddy, Coconut, Rubber, Pepper, Cardamom, Coffee, Cashew, Banana, Ginger, Turmeric, etc.

## 🔧 Key Engineering Solutions

### ✅ Fixed Open-Meteo 429 Rate Limit
```
❌ BROKEN: Promise.all(14 districts) → 429 crash → loading screen freeze
✅ FIXED: Batch 3 districts × 1.2s delay + 8s timeout + retry logic
```

### ✅ Gemini API Quota (limit: 0)
```
❌ BROKEN: Free tier shows limit: 0 (Dec 2025 policy change)
✅ FIXED: Billing enabled (no charges) + multi-model fallback
```

## 📊 Crop Health Engine

**Algorithm**: `score = 30%rain + 25%temp + 20%hum + 15%dry + 10%season`
```
🌱 Thriving (85+)  → 4ade80
✅ Healthy (70-84) → 86efac  
⚠️ Moderate (55-69) → facc15
🔴 Stressed (40-54) → fb923c
💀 Critical (<40)  → f87171
```

## 🌊 Flood Risk Engine

**Composite**: `risk = 50%rainfall + 30%IMD + 20%KSDMA`
```
🟢 Low:     <25
🟡 Moderate: 25-50
🟠 High:    50-75  
🔴 Extreme:  >75
```

**IMD Thresholds**: Red>115mm, Orange>64mm, Yellow>15mm (24h rainfall)

## 🤖 AI Advisory (Dual Engine)

```
1️⃣ TRY: Gemini REST API (gemini-2.0-flash) + rich context injection
   ↓ quota error?
2️⃣ FALLBACK: Rule Engine (CROP_KB 15 crops + SCHEME_KB 9 schemes)
   ↓ always works offline!
```

**Context injected**: district + crops + health score + weather + flood risk + monsoon phase

## 📈 Live KPIs (Top Bar)

```
🌧️ Max Rain: 12.4mm (Alappuzha ↑)
🌡 Max Temp: 34.2°C (Palakkad ⚠️)
🌿 Avg Health: 78/100 (Healthy)
🚨 Distressed: 2 districts
🔔 Active Alerts: 4
```

## 🚀 Deployment

### GitHub Pages (Free)
```bash
git init
git add index.html
git commit -m "Initial AgroScope commit"
git branch -M main
git remote add origin https://github.com/YOURNAME/agriscope.git
git push -u origin main
```

### Firebase Hosting (Recommended)
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
```

## 🧪 Local Development

```bash
# Serve with live reload
python -m http.server 8080

# Or Node.js
npx serve .
```

## 📱 PWA Ready (Phase 4)

Future service worker will enable:
- Full offline mode (cached weather + embedded KB)
- Background weather sync
- Push notifications for IMD Red alerts

## 🤝 Contributing

1. **Fork** the repo
2. **Update** `index.html` (single file)
3. **Test locally**: `python -m http.server`
4. **PR** with description of changes

**Good first issues:**
- Add more Kerala crops to CROP_KB
- Integrate live Agmarknet API
- Malayalam language support
- Village-level hyperlocal weather

## 📄 Knowledge Bases (Embedded)

**CROP_KB** (15 crops): irrigation schedules, fertilizer, harvest windows  
**DISEASE_KB** (20+ diseases): symptoms, weather triggers, chemical controls  
**SCHEME_KB** (9 schemes): PM-KISAN, PMFBY, KCC, RKVY, e-NAM, Kerala schemes  
**FLOOD_VULN** (14 districts): KSDMA flood/landslide/wind vulnerability baseline

## 🌟 Acknowledgments

- **Open-Meteo** — Free weather API for all districts
- **NASA GIBS** — MODIS Terra NDVI satellite imagery  
- **Google Gemini** — State-of-the-art AI advisory
- **geohacker** — Accurate Kerala district GeoJSON
- **KAU/ICAR** — Official Kerala crop recommendations
- **IMD/KSDMA** — Flood and weather alert thresholds
- **Leaflet.js Team** — Best open-source map library

## 📫 Contact

**Deployed:** [vvramxcec.github.io/agriscope](https://vvramxcec.github.io/agriscope)

```
⭐ Star if useful · 🍴 Fork to customize · 🚀 Deploy instantly
```

---

<div align="center">
  <img src="https://img.shields.io/badge/built%20with-%F0%9F%A7%A1%E2%9C%A8-green?style=for-the-badge&logo=gitbook" alt="Built with">
</div>

**Empowering Kerala's 5 lakh+ farming households with real-time agricultural intelligence.** 🌾

---

```html
<!-- Copy this single file and you're live! -->
<!-- No npm, no build tools, no backend required -->
```

## License
```
MIT License — Free for all uses (commercial, research, government)
Attribution appreciated: "Powered by AgroScope Kerala"
```
