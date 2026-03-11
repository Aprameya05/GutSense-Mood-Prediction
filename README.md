# BioSense AI (GutSense Pro)
BioSense AI is a **Bio-AI intelligence system** that goes from a **meal image** to a
multi-layer simulation of your **gut, brain, and systemic state**.
It combines:
- **Computer vision** → food detection & classification  
- **Nutrition modeling** → macro & micro nutrient vectors  
- **Microbiome simulation** → SCFA, diversity, inflammation, probiotic tone  
- **Neurochemistry estimation** → serotonin, dopamine, GABA, cortisol, melatonin  
- **State prediction** → mood, energy, focus, stress, sleep quality, clarity  
- **Health scoring** → brain/gut/metabolism scores, inflammation & burnout risk  
- **Scientific explanation** → fiber → SCFA → serotonin-style causal narratives  
The frontend is a **clinical-style dark dashboard** (Next.js + Tailwind +
Framer Motion + Chart.js) that looks and behaves like research lab software.
---
## 1. Repository Structure
At the root (`Gut/`):
- `pipeline.py` – Stage 1 pipeline: food detection & classification
- `full_pipeline.py` – Original 4-stage GutSense pipeline (food → nutrition → microbiome → mood)
- `stage1/` – Food detection entrypoint (YOLO + classifier + Groq fallback)
- `stage2/`
  - `nutrition_lookup.py` – original simple nutrition profiles
  - `nutrition_engine.py` – **BioSense NutritionVector engine**
- `stage3/`
  - `microbiome_proxy.py` – original GutSense microbiome proxies
  - `microbiome_engine.py` – **BioSense MicrobiomeState engine**
- `stage4/`
  - `mood_predictor.py` – original mood/energy heuristic
  - `neuro_engine.py` – **BioSense NeuroState engine**
- `stage5/prediction_engine.py` – **BioSense PredictionState + 6h/12h/24h timeline**
- `stage6/health_score.py` – **BioSense HealthScore aggregation**
- `stage7/explainer.py` – **BioSense scientific explanation engine**
- `biosense_pipeline.py` – **New orchestration** (image → BioSenseAnalysis)
- `schemas.py` – Shared data schemas (TypedDicts) for all stages
- `api.py` – FastAPI backend exposing the pipelines as HTTP APIs
- `frontend/` – Legacy Vite + React GutSense UI (kept for reference)
- `biosense-frontend/` – **New BioSense AI dashboard (Next.js)**
- `models/`, `stage1–4/`, `test_full_pipeline.py`, `test_gutsense.png` – existing model/pipeline artifacts
- `requirements.txt` – Python dependencies
---
## 2. Core Data Schemas
Key types (see `schemas.py` for full definitions):
- `FoodDetection` – detected foods from vision model.
- `NutritionProfile` / `FoodNutrition` – classic nutrition profile.
- `NutritionVector` – extended nutrition features for BioSense:
  - `fiber`, `sugar`, `protein`, `fat`, `polyphenol`, `tryptophan`,
    `omega3`, `resistant_starch`, `fermented`, `glycemic_load`
- `MicrobiomeState` – SCFA, diversity, inflammation, probiotic, gut balance.
- `NeuroState` – serotonin, dopamine, gaba, cortisol, melatonin.
- `PredictionState` – mood, energy, focus, stress, sleep quality, clarity +
  `timeline: List[TimeHorizonPrediction]` (6h/12h/24h).
- `HealthScore` – overall, brain, gut, metabolism + inflammation_risk,
  burnout_risk.
- `Explanation` – summary + bullet-point scientific rationale.
- `BioSenseAnalysis` – top-level result:
  - `foods: List[FoodDetection]`
  - `nutrition: List[NutritionVector]`
  - `microbiome: MicrobiomeState`
  - `neuro: NeuroState`
  - `prediction: PredictionState`
  - `health: HealthScore`
  - `explanation: Explanation`
---
## 3. Pipelines
### 3.1 Legacy GutSense Pipeline
`full_pipeline.analyze_meal(image_path: str) -> MealAnalysis`
Stages:
1. **Food detection & classification** (`stage1` / `pipeline.analyze_food_image`)
2. **Nutrition lookup** (`stage2.nutrition_lookup.get_nutrition`)
3. **Microbiome proxy scores** (`stage3.microbiome_proxy.compute_microbiome_scores`)
4. **Mood & energy prediction** (`stage4.mood_predictor.predict_mood`)
Used by the original `/analyze-meal` endpoint and legacy Vite frontend.
### 3.2 BioSense AI Pipeline
`biosense_pipeline.analyze_image_biosense(image_path: str) -> BioSenseAnalysis`
Flow:
1. **Reuse legacy pipeline**  
   Calls `full_pipeline.analyze_meal` to get `foods` and base nutrition/microbiome/mood.
2. **Nutrition Intelligence Engine** (`stage2/nutrition_engine.py`)  
   Converts each food label into a `NutritionVector` (macros + advanced heuristics).
3. **Microbiome Simulation Engine** (`stage3/microbiome_engine.py`)  
   Computes `MicrobiomeState` (SCFA, diversity, inflammation, probiotic, gut_balance).
4. **Neurochemistry Engine** (`stage4/neuro_engine.py`)  
   Combines nutrition + microbiome into `NeuroState`.
5. **Prediction Engine** (`stage5/prediction_engine.py`)  
   Produces current `PredictionState` + short-horizon timeline (6/12/24 hours).
6. **Health Score Engine** (`stage6/health_score.py`)  
   Aggregates into `HealthScore` (overall/brain/gut/metabolism + risk scores).
7. **Explanation Engine** (`stage7/explainer.py`)  
   Generates research-style explanation: summary + causal bullets.
Result is exposed via the `/biosense/analyze-meal` API and powers the new dashboard.
---
## 4. Backend API (FastAPI)
Backend entrypoint: `api.py`
### Endpoints
- `GET /`  
  Health check, returns `{"status": "ok", "service": "gutsense-api"}`.
- `POST /analyze-meal`  
  - Input: multipart form with `file: UploadFile` (meal image).  
  - Flow: runs **legacy GutSense** `full_pipeline.analyze_meal`.  
  - Output: `MealAnalysis` JSON.
- `POST /biosense/analyze-meal`  
  - Input: multipart form with `file: UploadFile`.  
  - Flow: runs **BioSense AI pipeline** `analyze_image_biosense`.  
  - Output: `BioSenseAnalysis` JSON (multi-layer biological state).
### CORS
For local development, CORS is open:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
5. Frontends
5.1 Legacy Vite + React frontend (frontend/)
Simple Vite/React UI that visualizes the original GutSense pipeline.
Talks to POST /analyze-meal.
Kept for reference; the new dashboard supersedes it.
Run (optional):

cd frontend
npm install
npm run dev  # http://localhost:5173
5.2 BioSense AI Dashboard (biosense-frontend/)
A full biotech / clinical-style UI built with:

Next.js (App Router, TypeScript)
Tailwind CSS
Framer Motion (animations)
Chart.js + react-chartjs-2 (graphs)
Key concepts
src/context/BioSenseContext.tsx
Central client-side store for:
analysis: BioSenseAnalysis | null
isAnalyzing, error
history: [{ id, createdAt, label, healthScore }]
runAnalysis(file) uploads the image to /biosense/analyze-meal using src/lib/biosenseClient.ts, then updates global state.
All pages read from this shared context so running the pipeline once updates Dashboard, Brain, Gut, Timeline, History simultaneously.
Components
Layout & shell:
src/app/layout.tsx – global gradient background, grid overlay, scanline, wraps app in BioSenseProvider.
src/components/Shell.tsx – top navbar:
BioSense logo & subtitle (“Clinical-Style Bio-AI Dashboard”)
Navigation: Dashboard, Scan, Brain, Gut, Timeline, History, Settings
Status pills (systems online, prototype)
Shared visual components:
GlowPanel.tsx – glass, glowing, animated panels with title/subtitle.
BioCard.tsx – small metric cards (mood, energy, risk).
HealthMeter.tsx – circular 0–100 meter used for health scores.
BrainMeter.tsx – neurochemistry cards built from NeuroState + PredictionState.
MicrobiomeChart.tsx – Chart.js bar plot of microbiome metrics.
TimelineChart.tsx / TimelineGraph.tsx – line chart for 6h/12h/24h forecast.
Gauges.tsx (legacy from earlier design) – kept but largely superseded.
Pages
All pages live under src/app/ and share the same dark biotech theme.

/ – Dashboard

Meal image panel with scan overlay and “live layers” chips.
Health meters:
Overall, Brain (from HealthScore).
Risk + state cards:
Inflammation risk, Burnout risk, Energy, Mood.
Brain layer:
Serotonin, Dopamine, GABA, Cortisol, Melatonin, Focus.
Gut layer:
Microbiome bar chart (SCFA, diversity, probiotic, gut balance, inflammation).
Timeline:
Mood/Energy/Stress vs time (6/12/24h).
Explanation:
Narrative summary + bullet list from the explanation engine.
/scan – Meal Scan

Camera-style optical intake panel for selecting and previewing an image.
Pipeline stage chips and capture guidelines.
Wearables “slots” (HR/HRV, Sleep, Steps, Stress) as placeholders for future data.
/microbiome – Gut Panel

Full microbiome state visualization:
MicrobiomeChart + BioCards for SCFA, Diversity, Probiotic, Inflammation.
“Nutrition drivers” table per detected food (fiber, polyphenol, resistant starch, fermented).
/brain – Neuro Panel

BrainMeter (serotonin, dopamine, GABA, cortisol, melatonin + focus).
Brain and Overall health meters.
State cards: Energy, Focus, Sleep quality, Mental clarity.
/timeline – Prediction Timeline

Forecast chart using TimelineGraph.
Horizon cards for each timepoint (6h, 12h, 24h) with mood/energy/focus/ stress/sleep/clarity values.
/history – History

Recent runs list with time, meal label, health score.
Full session table of all runs (in-memory for this session).
Summary cards:
Best score, latest score.
/settings – Settings & Integrations

Informational page describing planned wearable & API integrations.
Frontend configuration
API base is configured via:

NEXT_PUBLIC_BIOSENSE_API_BASE (optional)
Defaults to http://127.0.0.1:8000 if unset.
In src/lib/biosenseClient.ts:

const API_BASE =
  process.env.NEXT_PUBLIC_BIOSENSE_API_BASE ?? "http://127.0.0.1:8000";
6. Running the Full System
From the root of the repo (Gut/):

6.1 Backend (FastAPI + pipelines)
# Install Python dependencies
pip install -r requirements.txt
# Start API server (FastAPI + Uvicorn)
python -m uvicorn api:app --reload --port 8000
Server runs at http://127.0.0.1:8000.

You can smoke-test the BioSense endpoint:

python - << "PY"
import requests
from pathlib import Path
p = Path("test_gutsense.png")
files = {"file": (p.name, p.read_bytes(), "image/png")}
r = requests.post("http://127.0.0.1:8000/biosense/analyze-meal", files=files, timeout=120)
print("status:", r.status_code)
print("snippet:", r.text[:400])
PY
6.2 BioSense Dashboard (Next.js)
cd biosense-frontend
# Install JS deps (first time)
npm install
# Run dev server
npm run dev
Dashboard runs at http://localhost:3000.

Workflow:

Open http://localhost:3000.
Go to Dashboard or Scan.
Upload a meal image and click Run pipeline / Analyze.
Explore:
Brain panel
Gut microbiome panel
Mood/energy/inflammation panels
Timeline forecast
History log
7. Notes & Disclaimers
BioSense AI is a research / prototyping tool, not a medical device.
All nutrition, microbiome, neurochemistry and state scores are heuristic and intended for exploration, not diagnosis or treatment.
The architecture is intentionally transparent and rule-based in many stages so that it’s easy to reason about and extend for future research (e.g. real microbiome sequencing data, wearable streams, sleep trackers).
