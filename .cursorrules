# CLAUDE.md — Gut-Mood Pipeline Build Instructions

## Project Overview
This is a **10-stage AI pipeline** that analyzes relationships between food intake, gut health proxies, metabolic signals, and neurological indicators. The full specification is in `SPEC.md`. Read it before building anything.

## What Already Exists (DO NOT REBUILD)
Stage 1 (Food Identification) is **fully implemented**. The existing structure:

```
models/
  food_classifier.py      # EfficientNet-B2 (nateraw/food), lazy-loaded
  groq_fallback.py        # Groq Vision API (llama-4-scout-17b-16e-instruct)
stage1/
  pipeline.py             # Orchestrator: parallel inference, fuzzy match, fallback
  mismatch_logger.py      # Thread-safe JSONL mismatch logger
logs/
  mismatch_log.jsonl      # Auto-created, gitignored
pipeline.py               # Entry point: opens image → stage1.pipeline.run()
```

Stage 1 output schema (this is the INPUT to Stage 2):
```json
{
  "food_items": ["masala dosa", "sambar", "coconut chutney"],
  "en_pred": "fried_rice",
  "confidence": 0.28,
  "source": "groq"
}
```

## Tech Stack
- **Language**: Python 3.10+
- **API**: Groq free tier (llama-4-scout-17b-16e-instruct). Key via `GROQ_API_KEY` env var.
- **Nutritional DBs**: IFCT 2017 (local CSV/JSON), USDA FoodData Central (REST API at api.nal.usda.gov/fdc/v1/), INDB (local CSV/JSON)
- **Storage**: Local JSON files + SQLite for user profiles and 30-day accumulation
- **Frontend**: Streamlit (later — do NOT build UI until all stages work in CLI)
- **No Docker, no cloud, no overengineering.** This runs locally.

## Build Order
Build stages sequentially. Each stage is a separate module. Test each stage independently before connecting.

### Stage 0 — User Baseline Profile (`stage0/`)
- File: `stage0/profile.py`
- Collect: age, sex, height_cm, weight_kg, diet_type, activity_level, sleep_schedule, supplements, medications
- Calculate BMR (Mifflin-St Jeor) and TDEE
- Store as JSON in `data/user_profiles/{user_id}.json`
- See SPEC.md "Stage 0" for exact formulas and activity multipliers

### Stage 2 — Nutritional Calibration (`stage2/`)
- File: `stage2/nutrition.py`
- Input: `food_items` list from Stage 1
- Lookup hierarchy: IFCT 2017 → USDA API → INDB → Groq fallback
- For IFCT/INDB: load from local `data/nutrition_db/` CSV/JSON files
- For USDA: hit `api.nal.usda.gov/fdc/v1/foods/search` (needs `FDC_API_KEY` env var)
- For Groq fallback: structured prompt requesting JSON-only nutritional estimate
- Track 13 nutrients: calories, carbs, protein, fat, fiber, glycemic_load, tryptophan, omega3, iron, magnesium, b6, b12, zinc
- Portion scaling based on portion_g (default 250g if unknown)
- Cache Groq responses in `data/nutrition_cache.json` to avoid repeat queries
- See SPEC.md "Stage 2" for full nutrient table and Groq prompt

### Stage 3 — Gut Microbiome Proxy (`stage3/`)
- File: `stage3/gut_proxy.py`
- Input: Stage 2 nutrition data + user digestion self-report
- Calculate 3 proxies:
  - Microbiome Diversity Index (MDI): fiber-based scoring with fermented food/stool modifiers
  - Inflammation Risk Score (IRS): weighted sum of pro/anti-inflammatory dietary factors
  - Digestion Stability Score (DSS): Bristol scale + bloating + gas penalties
- All formulas with exact thresholds are in SPEC.md "Stage 3"
- Clamp all scores to [0.0, 1.0]

### Stage 4 — Mood & Cognitive Logging (`stage4/`)
- File: `stage4/mood.py`
- Input: user self-report (emoji, rating 1-10, cognitive_state, energy, anxiety)
- Normalize emoji → numeric score using PANAS-derived mapping
- Add tryptophan context from Stage 2
- Track hours_since_meal (derived from Stage 1 timestamp)
- See SPEC.md "Stage 4" for emoji-to-score table

### Stage 5 — Metabolic Response (`stage5/`)
- File: `stage5/metabolic.py`
- Input: Stage 2 nutrition + meal timing + Stage 0 baseline
- Estimate glucose spike from glycemic load
- Apply fiber attenuation factor
- Calculate energy crash probability
- Apply late-night meal penalty (meals after 21:00)
- See SPEC.md "Stage 5" for all formulas

### Stage 6 — Sleep & Physiology (`stage6/`)
- File: `stage6/sleep.py`
- Input: user sleep self-report
- Calculate: sleep_debt, cumulative_debt_7d, Circadian Regularity Index (CRI)
- Compute neurological_stress_proxy (multi-factor weighted score)
- See SPEC.md "Stage 6" for CRI formula and stress weights

### Stage 7 — Time-Series Pattern Analysis (`stage7/`)
- File: `stage7/patterns.py`
- Input: 30 days of accumulated Stages 2-6 data
- Sliding-window correlation analysis (acute/short/medium/long windows)
- Compute pairwise Pearson correlations between food metrics and outcomes
- Z-score anomaly detection on 7-day rolling windows (flag if |z| > 2.0)
- Send correlation matrix to Groq for natural-language summarization
- See SPEC.md "Stage 7" for correlation targets and window definitions

### Stage 8 — Baseline Creation (`stage8/`)
- File: `stage8/baseline.py`
- Input: 30 days of all stage outputs
- Compute trimmed means, medians, modes for 8 baseline metrics
- Stability check: CV < 15% over last 14 days
- See SPEC.md "Stage 8" for metric list and CV formula

### Stage 9 — Neurological Risk Detection (`stage9/`)
- File: `stage9/risk.py`
- Input: baselines + rolling stage outputs
- Check 8 risk signals against duration thresholds
- Score: 0 flags=none, 1-2=mild, 3-4=moderate, 5+=elevated
- See SPEC.md "Stage 9" for signal-threshold table

### Stage 10 — Insight Generation (`stage10/`)
- File: `stage10/insights.py`
- Input: all stage outputs
- Send pipeline summary to Groq with structured insight prompt
- Generate 3-5 actionable, non-diagnostic insights
- Always append disclaimer
- See SPEC.md "Stage 10" for Groq prompt template

## Shared Utilities
Create these in a `utils/` directory:
- `utils/groq_client.py` — Shared Groq API client with exponential backoff, 429 retry, response caching
- `utils/storage.py` — JSON read/write helpers, SQLite connection, data directory management
- `utils/validators.py` — Input schema validation for each stage's expected input
- `utils/config.py` — Environment variable loading (GROQ_API_KEY, FDC_API_KEY, etc.)

## Data Directory Structure
```
data/
  user_profiles/          # Stage 0 output
  nutrition_db/           # IFCT, INDB local CSV/JSON files
  nutrition_cache.json    # Groq nutritional response cache
  daily_logs/             # Per-day aggregated stage outputs
    2026-03-13.json
    2026-03-14.json
  baselines/              # Stage 8 output
  synthetic/              # Stage SIM test data
```

## Synthetic Data (Stage SIM)
- File: `synthetic/generate.py`
- Generate 30 days: 90 meals, 90 mood logs, 90 digestion reports, 30 sleep logs
- Vegetarian Indian diet only
- Include 2-3 "bad weeks" (high sugar, late meals, poor sleep) and 1 "good week"
- 3-5 deliberate food misclassifications for retraining loop testing
- See SPEC.md "Synthetic Data Simulation" for full rules

## Code Style
- Python, clean and simple. No over-engineering.
- Type hints on function signatures.
- Minimal comments — only where logic is non-obvious.
- Each stage module exposes a single `run()` function.
- Each `run()` takes the previous stage's output dict and returns its own output dict.
- Use dataclasses or TypedDicts for stage I/O schemas.

## Testing Strategy
- Build `tests/test_stage{N}.py` for each stage.
- Test with synthetic data first (`synthetic/generate.py`).
- Each test should verify: (a) output schema matches spec, (b) values are within plausible ranges, (c) edge cases (empty input, API failure).

## Environment Variables
```
GROQ_API_KEY=gsk_...
FDC_API_KEY=...            # USDA FoodData Central
FOOD_MODEL_ID=nateraw/food  # Override EfficientNet model
```

## Pipeline Runner
- File: `run_pipeline.py`
- Chains all stages: 0 → 1 → 2 → 3 → (4,5,6 parallel) → 7 → 8 → 9 → 10
- Stages 3, 4, 5, 6 can run after Stage 2 completes (they don't depend on each other)
- Stage 7 needs 30 days accumulated before it runs
- CLI interface: `python run_pipeline.py --image meal.jpg --user balaji_001`

## Important Notes
- ALL outputs are informational, never diagnostic. No clinical claims anywhere.
- Groq is the primary reasoning engine AND the fallback layer — not just a backup.
- Read SPEC.md before building each stage. Every formula, threshold, and proxy has a research citation.
- Don't build Streamlit UI until all 10 stages work end-to-end in CLI.
