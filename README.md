# GutSense -- Personalized Nutrition-Mood-Neurology Pipeline

A 10-stage AI pipeline that analyzes relationships between food intake, gut health proxies, metabolic signals, and neurological indicators. Built with research-backed proxy models and Groq LLM integration.

All outputs are **informational only** -- never diagnostic. No clinical claims.

## How It Works

```
Meal Image
    |
    +--> EfficientNet-B2 (local) --+
    |                              +--> Stage 1: Food ID + Mismatch Logger
    +--> Groq Vision (cloud) ------+
                                   |
                          Stage 2: Nutrition Lookup
                        (IFCT -> USDA -> INDB -> Groq)
                                   |
              +--------------------+--------------------+
              |                    |                    |
     Stage 3: Gut Proxy   Stage 4: Mood    Stage 5: Metabolic
              |                    |                    |
              +--------------------+--------------------+
                                   |
                        Stage 6: Sleep & Physiology
                                   |
                    Stage 7: 30-Day Pattern Analysis
                                   |
                     Stage 8: Baseline Calibration
                                   |
                    Stage 9: Neurological Risk Detection
                                   |
                     Stage 10: Groq Insight Generation
                                   |
                      Personalized Health Summary
```

## Pipeline Stages

| Stage | Module | Purpose | Key Methods |
|-------|--------|---------|-------------|
| 0 | `stage0/profile.py` | User baseline profiling | Mifflin-St Jeor BMR, TDEE with activity multipliers |
| 1 | `stage1/pipeline.py` | Food identification | Dual-model: EfficientNet-B2 + Groq Vision in parallel |
| 2 | `stage2/nutrition.py` | Nutritional calibration | 4-tier lookup: IFCT 2017 -> USDA FDC -> INDB -> Groq fallback; DB values stored per 100g edible portion |
| 3 | `stage3/gut_proxy.py` | Gut microbiome proxy | MDI, IRS, DSS scores from diet + digestion self-report |
| 4 | `stage4/mood.py` | Mood & cognitive logging | PANAS-derived emoji mapping, cognitive penalty scoring |
| 5 | `stage5/metabolic.py` | Metabolic response | Glycemic load spike estimation, fiber attenuation, late-meal penalty |
| 6 | `stage6/sleep.py` | Sleep & physiology | Sleep debt, Circadian Regularity Index, neurological stress proxy |
| 7 | `stage7/patterns.py` | Time-series analysis | 30-day sliding-window Pearson correlations, z-score anomaly detection |
| 8 | `stage8/baseline.py` | Baseline creation | Trimmed means, medians, mode; CV stability check over 14 days |
| 9 | `stage9/risk.py` | Risk detection | 8 research-backed risk signals with duration thresholds |
| 10 | `stage10/insights.py` | Insight generation | Groq-powered natural-language health summary with disclaimer |

## Quick Start

### Prerequisites

- Python 3.10+
- Groq API key (free tier)
- USDA FoodData Central API key (optional, for Stage 2 secondary lookup)

### Setup

```bash
git clone <repo-url>
cd GutSense-Mood-Prediction

pip install -r requirements.txt

cp .env.example .env
# Edit .env and add your API keys:
#   GROQ_API_KEY=gsk_...
#   FDC_API_KEY=...       (optional)
```

### Create a User Profile

```python
from stage0.profile import run

profile = run("balaji_001", {
    "age": 20,
    "sex": "male",
    "height_cm": 170.0,
    "weight_kg": 76.0,
    "diet_type": "vegetarian",
    "activity_level": "heavy",
    "sleep_schedule": "23:00-06:30",
})
```

### Run the Full Pipeline

```bash
python run_pipeline.py --image meal.jpg --user balaji_001 \
    --mood-emoji "😐" --mood-rating 5 \
    --cognitive-state clear --energy-level moderate --anxiety-level none \
    --sleep-onset 23:30 --wake-time 06:15 --sleep-quality fair \
    --bloating none --stool-quality 4 --fermented-food
```

**CLI arguments:**

| Argument | Required | Default | Description |
|----------|----------|---------|-------------|
| `--image` | Yes | -- | Path to meal image |
| `--user` | Yes | -- | User ID |
| `--mood-emoji` | No | neutral | One of: `😄 🙂 😐 😟 😔 😴 🤯` |
| `--mood-rating` | No | 5 | 1--10 self-rated mood |
| `--cognitive-state` | No | clear | sharp / clear / mild_fog / brain_fog / drowsy |
| `--energy-level` | No | moderate | very_low / low / moderate / high / very_high |
| `--anxiety-level` | No | none | none / mild / moderate / high |
| `--bloating` | No | none | none / mild / moderate / severe |
| `--stool-quality` | No | 4 | 1--7 (Bristol Stool Scale) |
| `--gas-discomfort` | No | none | none / mild / moderate / severe |
| `--fermented-food` | No | false | Flag: consumed fermented food today |
| `--sleep-onset` | No | -- | HH:MM (skips Stage 6 if omitted) |
| `--wake-time` | No | -- | HH:MM (skips Stage 6 if omitted) |
| `--sleep-quality` | No | good | poor / fair / good / excellent |
| `--skip-groq` | No | false | Use placeholders instead of Groq API calls |

Stage 7 and 8 automatically activate after 30 days of accumulated data in `data/daily_logs/`.

## Daily Log Schema

Each day's data is stored as a single JSON file with a **nested schema** under `data/daily_logs/YYYY-MM-DD.json`:

```json
{
  "date": "2026-03-13",
  "meals": [
    {
      "meal_id": "breakfast",
      "meal_time": "07:30",
      "stage1": { "food_items": ["idli"], "confidence": 0.82, "source": "groq" },
      "stage2": { "items": [], "totals": { "calories_kcal": 500, "fiber_g": 7, "glycemic_load": "low", "..." } },
      "stage4": { "mood_score": 2, "cognitive_state": "clear", "energy_level": "high", "..." },
      "stage5": { "estimated_glucose_spike": "mild", "energy_crash_probability": 0.15, "..." }
    },
    { "meal_id": "lunch", "..." },
    { "meal_id": "dinner", "..." }
  ],
  "digestion": { "bloating": "none", "stool_quality": 4, "fermented_food_today": true, "..." },
  "sleep": { "sleep_hours": 7.5, "cumulative_debt_7d": 2.1, "circadian_regularity_index": 0.85, "..." },
  "daily_totals": { "calories_kcal": 2100, "fiber_g": 28, "tryptophan_mg": 220, "glycemic_load": "low", "..." },
  "daily_gut":   { "microbiome_diversity_index": 0.70, "inflammation_risk_score": 0.28, "..." },
  "daily_mood_summary": { "avg_mood_score": 1.67, "dominant_cognitive_state": "clear", "..." }
}
```

`daily_totals` is the sum of `stage2.totals` across all meals. `daily_gut` is computed by Stage 3 from `daily_totals` + `digestion`. `daily_mood_summary` aggregates the three per-meal Stage 4 readings.

Stages 7, 8, and 9 consume flat records. `utils/flatten.py` provides `extract_flat_record(daily_log)` which maps nested fields to the expected flat keys, falling back to top-level keys for backwards compatibility with existing flat-format records.

## Project Structure

```
GutSense-Mood-Prediction/
├── models/
│   ├── food_classifier.py       # EfficientNet-B2 (nateraw/food)
│   └── groq_fallback.py         # Groq Vision API wrapper
├── stage0/profile.py            # User baseline profiling
├── stage1/
│   ├── pipeline.py              # Dual-model food identification
│   └── mismatch_logger.py       # Thread-safe JSONL mismatch logger
├── stage2/nutrition.py          # 4-tier nutritional lookup
├── stage3/gut_proxy.py          # Gut microbiome proxy (MDI, IRS, DSS)
├── stage4/mood.py               # Mood & cognitive state logging
├── stage5/metabolic.py          # Metabolic response estimation
├── stage6/sleep.py              # Sleep & neurological stress proxy
├── stage7/patterns.py           # 30-day time-series correlation analysis
├── stage8/baseline.py           # Personalized baseline creation
├── stage9/risk.py               # Neurological risk pattern detection
├── stage10/insights.py          # Groq-powered insight generation
├── utils/
│   ├── config.py                # Environment variable loading
│   ├── daily_log_schema.py      # DailyLog TypedDicts + empty_daily_log() scaffold
│   ├── flatten.py               # extract_flat_record() for Stages 7/8/9
│   ├── groq_client.py           # Shared Groq client (backoff, caching)
│   ├── storage.py               # JSON/SQLite I/O + daily log helpers
│   └── validators.py            # Input schema validation per stage
├── synthetic/
│   └── generate.py              # 30-day nested-schema synthetic data generator
├── tests/
│   ├── test_stage{0-10}.py      # Per-stage tests
│   └── test_storage_helpers.py  # Tests for daily log storage helpers
├── data/
│   ├── user_profiles/           # Stage 0 output
│   ├── nutrition_db/            # IFCT 2017, INDB local JSON (values per 100g edible portion)
│   ├── nutrition_cache.json     # Groq response cache
│   ├── daily_logs/              # Per-day nested DailyLog JSON files
│   ├── baselines/               # Stage 8 output
│   └── synthetic/               # Synthetic test data reference
├── pipeline.py                  # Stage 1 entry point
├── run_pipeline.py              # Full pipeline CLI runner
├── e2e_test.py                  # End-to-end integration test (all stages, no image required)
├── requirements.txt
├── SPEC.md                      # Full pipeline specification
└── CLAUDE.md                    # Build instructions
```

## Key Proxy Models

### Microbiome Diversity Index (MDI) -- Stage 3
Estimates gut microbial diversity from fiber intake, fermented food consumption, and stool quality. Derived from the American Gut Project (McDonald et al., 2018) and PREDIMED trial (Garcia-Mantrana et al., 2018). Range: 0.0--1.0.

### Inflammation Risk Score (IRS) -- Stage 3
Simplified Dietary Inflammatory Index based on Shivappa et al., 2014. Weighs pro-inflammatory factors (high fat, high sugar, bloating) against anti-inflammatory factors (fiber, omega-3, fermented foods). Range: 0.0--1.0.

### Neurological Stress Proxy -- Stage 6
Composite score from sleep debt (Krause et al., 2017), circadian regularity (Phillips et al., 2017), caffeine timing (Drake et al., 2013), screen exposure (Chang et al., 2015), and meal-to-bed proximity (Crispim et al., 2011). Base: 0.5, additive modifiers, clamped to [0.0, 1.0].

### Risk Signal Detection -- Stage 9
Eight research-backed risk signals with duration thresholds:

| Signal | Threshold | Duration |
|--------|-----------|----------|
| Persistent brain fog | cognitive_state = brain_fog | 5+ of last 7 days |
| Chronic sleep debt | cumulative_debt_7d > 10h | 2+ consecutive weeks |
| Mood instability | mood_score std_dev > 2.5 | 14+ days sustained |
| Metabolic dysregulation | glucose_spike = high 60%+ | 14+ days |
| Inflammation persistence | IRS > 0.6 | 14+ consecutive days |
| Circadian disruption | CRI < 0.4 | 14+ days |
| Combined neuro-stress | neuro_stress > 0.7 | 7+ consecutive days |
| B12 deficiency signal | vegetarian + cognitive decline | 21+ days |

Risk scoring: 0 flags = none, 1--2 = mild, 3--4 = moderate, 5+ = elevated (professional consult suggested).

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Language | Python 3.10+ |
| Food Vision (local) | EfficientNet-B2 (nateraw/food) |
| Food Vision (cloud) | Groq -- Llama 4 Scout 17B |
| Nutritional DBs | IFCT 2017, USDA FoodData Central, INDB |
| LLM Reasoning | Groq free tier (fallback, summarization, insights) |
| Storage | Local JSON + SQLite |
| Testing | pytest (326 tests) |

## Testing

```bash
# Run all 326 tests
python -m pytest tests/ -v

# Run a specific stage's tests
python -m pytest tests/test_stage4.py -v

# Run storage helper tests
python -m pytest tests/test_storage_helpers.py -v

# Run with coverage
python -m pytest tests/ --cov=. --cov-report=term-missing

# End-to-end integration test (no API key or image required)
python e2e_test.py
```

### Synthetic Data Testing

`synthetic/generate.py` produces 30 days of realistic vegetarian-Indian-diet data in the nested DailyLog schema for testing Stages 7--10 without real images or API calls. Run it standalone to generate logs and immediately verify the pipeline:

```bash
python synthetic/generate.py
```

This creates a `synthetic_001` user profile, writes 30 nested DailyLog JSON files to `data/daily_logs/`, then runs Stages 7--10 and prints a verification summary. Each day contains 3 meals (breakfast / lunch / dinner) with per-meal Stage 1/2/4/5 sub-dicts. The dataset is structured so the final two weeks are deliberately bad, guaranteeing measurable risk signals:

| Metric verified | Expected result |
|-----------------|-----------------|
| Stage 7 GL <-> mood correlation | r < -0.5 (negative, typically around -0.81) |
| Stage 8 inflammation CV | > 15% (correctly unstable across bad weeks) |
| Stage 8 neuro_stress CV | > 15% (correctly unstable) |
| Stage 9 risk flags | 5+ flags, level = elevated |
| Stage 9 persistent brain_fog | >= 5 of last 7 days |
| Stage 9 chronic sleep debt | cumulative debt > 10h for all last 14 days |
| Stage 9 glucose dysregulation | high spike on >= 60% of last 14 days |

The generator uses seed=42 for reproducibility. Four deliberate food misclassifications (days 5, 12, 19, 25) are embedded in the lunch meal's Stage 1 sub-dict for retraining-loop testing.

### Storage Helpers

`utils/storage.py` provides helpers for building and updating daily logs incrementally:

```python
from utils.storage import append_meal, update_sleep, update_digestion, load_daily_log

# Add a meal (recomputes daily_totals and daily_mood_summary automatically)
append_meal("2026-03-13", meal_entry)

# Update sleep section without touching meals
update_sleep("2026-03-13", sleep_data)

# Update digestion section without touching meals or sleep
update_digestion("2026-03-13", digestion_data)

# Load a log (returns empty scaffold if the file doesn't exist yet)
log = load_daily_log("2026-03-13")
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GROQ_API_KEY` | Yes | Groq API key for vision, fallback, and insight generation |
| `FDC_API_KEY` | No | USDA FoodData Central API key for Stage 2 secondary lookup |
| `FOOD_MODEL_ID` | No | Override EfficientNet model (default: `nateraw/food`) |

## Research Citations

This pipeline references 61 peer-reviewed publications. Key citations:

- **BMR/TDEE**: Mifflin et al., 1990; FAO/WHO/UNU, 2001
- **Gut-Brain Axis**: Cryan & Dinan, 2012; Foster & McVey Neufeld, 2013
- **Microbiome & Fiber**: McDonald et al., 2018; Sonnenburg et al., 2016
- **Glycemic Response**: Jenkins et al., 1981; Foster-Powell et al., 2002
- **Sleep & Cognition**: Xie et al., 2013; Krause et al., 2017
- **Mood & Tryptophan**: Fernstrom & Wurtman, 1971; Richard et al., 2009
- **Dietary Inflammation**: Shivappa et al., 2014; Furman et al., 2019

Full reference list available in [SPEC.md](SPEC.md).

## Disclaimer

All outputs from this pipeline are **informational observations, not medical advice**. This system does not diagnose, treat, or prevent any disease. Consult a qualified healthcare professional for medical concerns.

## Author

Mr. Balaji -- March 2026
