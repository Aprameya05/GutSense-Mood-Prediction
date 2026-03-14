# CLAUDE.md — GutSense Developer & AI Assistant Guide

## Project Overview

**GutSense** is a **10-stage AI pipeline** (Stages 0–10) that links meal images, nutrition, gut proxies, mood, metabolism, sleep, 30-day patterns, baselines, risk flags, and Groq-generated insights. Full formulas and citations live in **`SPEC.md`**. Marketing-facing copy and quick start live in **`README.md`**.

- **Positioning**: Personalized nutrition–mood–neurology **observations only** — never diagnostic; disclaimer on all user-facing outputs.
- **Runtime**: Local Python 3.10+; optional **FastAPI** HTTP layer for apps/websites.

---

## Website / API Layer (Backend)

The **web-facing backend** is **`api.py`** (FastAPI), not Streamlit.

| Topic | Detail |
|-------|--------|
| **Run locally** | `uvicorn api:app --host 0.0.0.0 --port 8000 --reload` |
| **Title** | GutSense API — 10-stage food–gut–mood pipeline |
| **CORS** | Currently open (`allow_origins=["*"]`) — tighten for production |
| **Auth** | Register / login-style flows writing Stage 0 profiles under `data/user_profiles/` |
| **Pipeline** | Upload meal image + form/body fields → same stages as CLI; daily logs via `utils/daily_log_manager.py` |
| **Schemas** | Request/response models in **`utils/schemas.py`** (align with SPEC stage I/O) |
| **Groq off** | If `GROQ_API_KEY` unset, API can run in placeholder/skip mode (`_skip_groq`) |

Any **frontend** (web app, mobile) should call these endpoints and pass **user-supplied** profile, meal, mood, digestion, and sleep fields — do not hardcode demo users or fixed payloads in production paths.

---

## Entry Points

| File | Role |
|------|------|
| **`pipeline.py`** | Stage 1 only: `analyze_food_image(path)` → food_items, confidence, source |
| **`run_pipeline.py`** | **Full CLI**: Stage 0 load → 1 → 2 → 3,4,5 → 6 (optional) → daily log → 7–10 when enough history |
| **`api.py`** | **HTTP API** for registration, meals, mood, sleep, insights, baselines, risk, history |
| **`e2e_test.py`** | End-to-end test without real image/API (stages wired) |
| **`synthetic/generate.py`** | 30-day synthetic logs + Stages 7–10 verification |

---

## Implemented Layout (Do Not “Rebuild” Stage 1 From Scratch)

```
models/
  food_classifier.py       # EfficientNet-B2 (nateraw/food), lazy-loaded
  groq_fallback.py         # Groq Vision (Llama 4 Scout class)
stage0/profile.py          # BMR/TDEE, JSON profiles
stage1/
  pipeline.py              # Parallel EN + Groq Vision, fuzzy match, fallback
  mismatch_logger.py       # logs/mismatch_log.jsonl (gitignored)
stage2/nutrition.py        # IFCT → USDA → INDB → Groq; 13 nutrients; cache
stage3/gut_proxy.py        # MDI, IRS, DSS
stage4/mood.py             # Emoji → score, cognitive context
stage5/metabolic.py        # GL spike, fiber, crash, late meal
stage6/sleep.py            # Debt, CRI, neurological stress proxy
stage7/patterns.py         # 30-day correlations, z-scores, Groq summary
stage8/baseline.py         # Trimmed stats, CV stability
stage9/risk.py             # 8 signals, duration thresholds
stage10/insights.py        # Groq insights + disclaimer
utils/
  config.py                # Env paths + keys
  groq_client.py           # Backoff, cache
  storage.py               # JSON / SQLite helpers
  validators.py            # Stage inputs
  schemas.py               # API Pydantic models
  daily_log_manager.py     # Daily log merge / persistence for API
logs/mismatch_log.jsonl
data/
  user_profiles/{id}.json
  nutrition_db/            # IFCT, INDB (per 100g edible)
  nutrition_cache.json
  daily_logs/YYYY-MM-DD.json
  baselines/
  synthetic/
tests/test_stage0.py … test_stage10.py   # ~311 tests
```

Stage 1 **output shape** (input to Stage 2) includes at least: `food_items`, `en_pred`, `confidence`, `source`, plus `timestamp` when run from CLI/API.

---

## Tech Stack

- **Python 3.10+**
- **Groq**: Vision + text (`GROQ_API_KEY`)
- **USDA FDC** (optional): `FDC_API_KEY`
- **Local DBs**: IFCT 2017, INDB JSON/CSV under `data/nutrition_db/`
- **Storage**: JSON daily logs + user profiles; SQLite where `utils/storage` uses it
- **HTTP**: FastAPI + uvicorn (`api.py`)
- **Tests**: pytest (`python -m pytest tests/ -v`), plus `python e2e_test.py`

---

## Stage Summary (SPEC.md Is Source of Truth)

| Stage | Module | Notes |
|-------|--------|--------|
| 0 | `stage0/profile.py` | Age, sex, anthropometrics, diet, activity, sleep schedule → BMR, TDEE |
| 1 | `stage1/pipeline.py` | Dual vision; mismatch logging |
| 2 | `stage2/nutrition.py` | 4-tier lookup; `portion_g` default 250g if unknown; Groq cache |
| 3 | `stage3/gut_proxy.py` | Digestion self-report + Stage 2 → MDI, IRS, DSS ∈ [0,1] |
| 4 | `stage4/mood.py` | Self-report mood/cognitive/energy/anxiety + tryptophan context |
| 5 | `stage5/metabolic.py` | GL, fiber attenuation, crash, late-night (e.g. after 21:00) |
| 6 | `stage6/sleep.py` | Sleep report + 7d history → debt, CRI, neuro stress |
| 7 | `stage7/patterns.py` | ≥30 days logs → correlations, \|z\|>2 anomalies, Groq narrative |
| 8 | `stage8/baseline.py` | ≥30 days → baselines; CV &lt; 15% stability check |
| 9 | `stage9/risk.py` | ≥7 days history + baselines → flags, mild/moderate/elevated |
| 10 | `stage10/insights.py` | Groq bullets + mandatory disclaimer |

Stages 3–6 run after Stage 2; 7–8 need **30** days of `data/daily_logs/`; 9 benefits from **7+** days.

---

## CLI (`run_pipeline.py`)

Requires existing profile: `stage0.profile.run(user_id, {...})` first.

Example:

```bash
python run_pipeline.py --image meal.jpg --user YOUR_USER_ID \
  --mood-emoji "😐" --mood-rating 5 \
  --cognitive-state clear --energy-level moderate --anxiety-level none \
  --bloating none --stool-quality 4 --gas-discomfort none \
  --sleep-onset 23:30 --wake-time 06:15 --sleep-quality fair
```

Relevant flags: `--fermented-food`, `--night-awakenings`, `--caffeine-after-14h`, `--screen-before-bed`, `--meal-to-bed-hours`, `--skip-groq`. Stage 6 skipped if `--sleep-onset` / `--wake-time` omitted.

---

## Code Conventions

- Type hints on public functions; single `run()` per stage module where applicable.
- TypedDicts/dataclasses for stage I/O where helpful.
- No clinical claims; Groq prompts must stay non-diagnostic.
- **Prefer user/API input** over hardcoded defaults for anything that changes per person or per day (see audit prompt below).

---

## Environment Variables

```
GROQ_API_KEY=gsk_...
FDC_API_KEY=...           # optional, Stage 2
FOOD_MODEL_ID=nateraw/food
```

Use `.env` (see `.env.example` if present).

---

## Testing

- **All stages**: `python -m pytest tests/ -v` (~311 tests)
- **E2E**: `python e2e_test.py`
- **Synthetic 30-day**: `python synthetic/generate.py` (seed 42; bad weeks + misclassifications for regression)

---

## Synthetic Data (Stage SIM)

- **`synthetic/generate.py`**: vegetarian Indian diet; 2–3 bad weeks, 1 good week; deliberate misclassifications for retraining tests. Not a substitute for real user input in production.

---

## Important Notes for Contributors & AI Agents

1. Read **SPEC.md** before changing formulas or thresholds (citations live there).
2. **API + CLI** should both feed the same stage contracts; keep **`utils/schemas.py`** and stage `run()` inputs aligned.
3. Streamlit is **not** required for the product; **FastAPI + any frontend** is the current web direction.
4. Tighten CORS and auth for any public deployment.
5. Periodically **audit hardcoded values** — defaults are OK for missing optional fields, but **insights, risk narrative, and per-user summaries must derive from that user’s logs and inputs**, not static demo strings.
