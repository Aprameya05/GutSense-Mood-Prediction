---
name: Two GutSense profiles
overview: Align synthetic generation with per-user API storage (structured daily logs under `data/daily_logs/{user_id}/`), document Profile A (empty history) vs Profile B (30-day demo), and add PROFILES.md plus minimal generator/README updates without breaking Stage 7–10 verification semantics.
todos:
  - id: generator-per-user
    content: |
      Update synthetic/generate.py: (1) In __main__ change `generate(DAILY_LOGS_DIR, ...)` → `generate(DAILY_LOGS_DIR / USER_ID, ...)`. (2) Inside generate(), after building each flat record with _make_record, call `_flat_to_structured(record)` (import from utils.migrate_logs) and write the structured dict to output_dir/{date}.json instead of the raw flat dict. (3) Keep returning the flat list so Stage 7/9 in-memory logic is unchanged. (4) Fix _run_verification: change `stage8_run(user_id)` → `stage8_run(user_id, daily_logs_dir=output_dir)` — stage8/baseline.py already accepts this param (line 91). (5) Add argparse `--user-id` (default "synthetic_001") to __main__ so a second demo user can be generated without editing the file. (6) Update overwrite logic: glob `output_dir/*.json` (user subfolder only), not `DAILY_LOGS_DIR/*.json`.
    status: pending
  - id: docs-profiles
    content: |
      Create docs/PROFILES.md with: (A) Side-by-side table: user_id | creation steps | expected API responses (days_logged 0 vs 30, 404 vs full trends/baselines/risks). (B) Profile A (live_logger_001): stage0.profile.run() Python snippet + POST /api/auth/register JSON body; note that data/daily_logs/live_logger_001/ must not be pre-populated; CLI run_pipeline.py writes flat root logs (limitation — use API for multi-user). (C) Profile B (synthetic_001): `python synthetic/generate.py [--user-id synthetic_001]` command; expected Stage 9 flags (6 elevated); Groq skip note (GROQ_API_KEY unset → placeholder summary/insights); second demo user via `--user-id demo_30d_001`. (D) Legacy flat files warning: root data/daily_logs/*.json are unscoped; migrate with `python -m utils.migrate_logs --user <id>` or delete. (E) Add one-line pointer to docs/PROFILES.md in README.md under Quick Start.
    status: pending
  - id: verify-tests
    content: |
      (1) Run `python -m pytest tests/ -v` — all 311 tests must pass. (2) Run `python synthetic/generate.py` and assert 30 files exist under data/daily_logs/synthetic_001/ (not at DAILY_LOGS_DIR root). (3) Confirm each written file contains the structured schema keys: date, meals, digestion, sleep, daily_totals, daily_gut, daily_mood_summary (not raw flat keys like mood_score at root level). (4) Confirm _run_verification still prints Stage 9 flags=6 (ELEVATED) and Stage 8 baseline saves to data/baselines/synthetic_001.json.
    status: pending
isProject: false
---

# Two profiles: day-one logger vs 30-day synthetic

## Current state (confirmed by code reading)


| Piece                                         | Behavior                                                                                                                                                     |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `utils/daily_log_manager.py`                  | Reads/writes `data/daily_logs/{user_id}/{date}.json`. API always scopes by `user_id`.                                                                        |
| `synthetic/generate.py` — `generate()`        | Already accepts `output_dir: Path` and `user_id: str` params. Returns flat record list.                                                                      |
| `synthetic/generate.py` — `__main__`          | Passes `DAILY_LOGS_DIR` (root) as `output_dir` → writes flat files to `data/daily_logs/*.json`, not under a user subfolder. **This is the only bug to fix.** |
| `synthetic/generate.py` — `_run_verification` | Calls `stage8_run(user_id)` without `daily_logs_dir` → reads from `DAILY_LOGS_DIR` root (wrong after the move).                                              |
| `stage8/baseline.py` — `run()`                | Already accepts `daily_logs_dir: Path | None = None` override (line 91). No changes to stage8 needed.                                                        |
| `utils/migrate_logs.py`                       | Has `_flat_to_structured(flat: dict) → dict` (line 21). Generator must call this before writing each file.                                                   |
| API Stages 7–9                                | Load logs via `flatten_for_timeseries(user_id)` → reads `data/daily_logs/{user_id}/*.json`. Flat root files are never loaded for any named user.             |


**Gap**: `synthetic_001` API history shows 0 days after `generate.py` because logs land in root, not `data/daily_logs/synthetic_001/`. Fix is two lines in `__main__` + one line in `_run_verification`.

---

## Profile A — `live_logger_001` (day one, real logging)

### Registration

**Python (direct):**

```python
from stage0.profile import run as profile_run

profile_run("live_logger_001", {
    "age": 32,
    "sex": "female",
    "height_cm": 165.0,
    "weight_kg": 62.0,
    "diet_type": "vegetarian",
    "activity_level": "moderate",
    "sleep_schedule": "22:30-06:30",
    "known_conditions": [],
    "supplements": [],
    "medications": [],
})
# → writes data/user_profiles/live_logger_001.json
```

**API (FastAPI running):**

```http
POST /api/auth/register
Content-Type: application/json

{
  "user_id": "live_logger_001",
  "age": 32,
  "sex": "female",
  "height_cm": 165,
  "weight_kg": 62,
  "diet_type": "vegetarian",
  "activity_level": "moderate",
  "sleep_schedule": "22:30-06:30",
  "known_conditions": [],
  "supplements": [],
  "medications": []
}
```

### Expected API responses (day one)


| Endpoint                                     | Response                                                   |
| -------------------------------------------- | ---------------------------------------------------------- |
| `GET /api/trends?user_id=live_logger_001`    | 404 or `{"days_logged": 0}`                                |
| `GET /api/baselines?user_id=live_logger_001` | 404 (no 30-day baseline yet)                               |
| `GET /api/risks?user_id=live_logger_001`     | 404 or `{"status": "insufficient_data", "days_needed": 7}` |


Do **not** pre-create `data/daily_logs/live_logger_001/`. Stages 7–8 skip until 30 days; Stage 9 limited until 7+ days.

### CLI limitation

`run_pipeline.py` writes flat `data/daily_logs/{today}.json` with no `user_id` — these go to the root, not under a user folder. For multi-user scenarios, use the **API** for meal logging so data lands in `live_logger_001/`.

---

## Profile B — `synthetic_001` (30-day demo with history + risk)

### Generation

```bash
# Default user_id = synthetic_001
python synthetic/generate.py

# Second demo user (same demographics, same seed → same flags)
python synthetic/generate.py --user-id demo_30d_001
```

After running, confirm:

```
data/daily_logs/synthetic_001/
  2026-02-12.json  ...  2026-03-12.json   ← 30 structured files
data/baselines/synthetic_001.json
data/user_profiles/synthetic_001.json
```

### Expected outcomes (from generator design)


| Stage    | Expected                                                                                                                                                         |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stage 7  | GL↔mood r ≈ −0.88; 1–2 significant correlations                                                                                                                  |
| Stage 8  | Baseline written; inflammation CV ~16.7%, neuro_stress CV ~17.0% (may show unstable)                                                                             |
| Stage 9  | **6 flags — ELEVATED**: persistent_brain_fog, chronic_sleep_debt, metabolic_dysregulation, inflammation_persistence, circadian_disruption, combined_neuro_stress |
| Stage 10 | 3–5 data-driven insights (or placeholder if GROQ_API_KEY unset)                                                                                                  |


### Groq note

No `GROQ_API_KEY` → Stage 7 summary shows `"Groq summarization skipped. N/7 correlations significant; M anomaly event(s) detected across 30 days."` Stage 10 generates data-driven fallback insights from actual stage outputs (not generic placeholders — fixed in this audit).

---

## Legacy flat files

Root `data/daily_logs/*.json` (from old generator runs or `run_pipeline.py`) are unscoped — no API endpoint loads them for any named user. Remove or migrate:

```bash
python -m utils.migrate_logs --user synthetic_001  # moves root flats → synthetic_001/ as structured
```

`e2e_test.py` cleans only root `*.json` on startup; it does not need changes.

---

## Deliverables


| Deliverable              | Change                                                                                                                                                                                                            |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `synthetic/generate.py`  | `__main__`: `DAILY_LOGS_DIR / USER_ID` as output_dir; write structured via `_flat_to_structured`; `stage8_run(user_id, daily_logs_dir=output_dir)`; `--user-id` argparse arg; overwrite globs user subfolder only |
| `docs/PROFILES.md` (new) | Profile A vs B table, registration snippets, expected API responses, Groq note, legacy flat warning                                                                                                               |
| `README.md`              | One-line pointer to `docs/PROFILES.md` under Quick Start; updated synthetic run command                                                                                                                           |
| Tests                    | `pytest tests/` all pass; smoke `python synthetic/generate.py`; assert 30 structured files under `data/daily_logs/synthetic_001/`                                                                                 |


---

## Implementation notes (concrete diffs)

### synthetic/generate.py — `__main_`_ (lines 508–550)

```python
# Add at top of __main__ block:
import argparse
parser = argparse.ArgumentParser()
parser.add_argument("--user-id", default="synthetic_001")
args = parser.parse_args()
USER_ID = args.user_id

# Change output dir:
output_dir = DAILY_LOGS_DIR / USER_ID          # was: DAILY_LOGS_DIR
records = generate(output_dir, user_id=USER_ID, seed=SEED)
```

### synthetic/generate.py — `generate()` — write structured files

```python
# Add import at top of file:
from utils.migrate_logs import _flat_to_structured

# Inside generate(), replace:
#   write_json(output_dir / f"{str(day)}.json", record)
# with:
write_json(output_dir / f"{str(day)}.json", _flat_to_structured(record))
```

Return value stays `records` (flat list) — unchanged.

### synthetic/generate.py — `_run_verification` (line 463)

```python
# Change:
#   s8 = stage8_run(user_id)
# to:
s8 = stage8_run(user_id, daily_logs_dir=output_dir)
# (pass output_dir down from generate() call or re-derive as DAILY_LOGS_DIR / user_id)
```

`stage8/baseline.py` already has `daily_logs_dir` param — no changes to stage8.

---

## Risk / scope control

- Do **not** change `_make_record()` or Stage 7–9 numerical expectations — same flat record values, same flags.
- `_flat_to_structured` contract is stable (used by `migrate_logs`); generator becomes another consumer.
- `run_pipeline.py` / CLI flat writes remain a documented limitation — no change in this task.
- No test files import `synthetic.generate` directly (confirmed by grep); stage tests use tmp paths → no test changes needed beyond `pytest` green.

