"""JSON read/write helpers and data directory management."""

import json
import sqlite3
from collections import Counter
from pathlib import Path
from typing import Any

from utils.config import DAILY_LOGS_DIR


def ensure_dir(path: Path) -> Path:
    path.mkdir(parents=True, exist_ok=True)
    return path


def read_json(path: Path | str) -> Any:
    path = Path(path)
    if not path.exists():
        return None
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def write_json(path: Path | str, data: Any) -> None:
    path = Path(path)
    ensure_dir(path.parent)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def append_jsonl(path: Path | str, record: dict) -> None:
    path = Path(path)
    ensure_dir(path.parent)
    with open(path, "a", encoding="utf-8") as f:
        f.write(json.dumps(record, ensure_ascii=False) + "\n")


def get_sqlite_conn(db_path: Path | str) -> sqlite3.Connection:
    db_path = Path(db_path)
    ensure_dir(db_path.parent)
    return sqlite3.connect(str(db_path))


# ─── Daily log helpers ─────────────────────────────────────────────────────────

def _daily_log_path(date_str: str, logs_dir: Path | None = None) -> Path:
    base = Path(logs_dir) if logs_dir else DAILY_LOGS_DIR
    return base / f"{date_str}.json"


def load_daily_log(date_str: str, logs_dir: Path | None = None) -> dict:
    """Load daily log for date_str, or return an empty scaffold if not found.

    Args:
        date_str: ISO date string "YYYY-MM-DD".
        logs_dir: Optional override directory (defaults to DAILY_LOGS_DIR).

    Returns:
        Existing daily log dict or freshly-scaffolded empty log.
    """
    from utils.daily_log_schema import empty_daily_log

    path = _daily_log_path(date_str, logs_dir)
    existing = read_json(path)
    if existing is not None:
        return existing
    return empty_daily_log(date_str)


def recompute_daily_totals(meals: list[dict]) -> dict:
    """Sum Stage 2 nutrition totals across all meals for the day.

    Args:
        meals: List of MealEntry dicts, each with a stage2.totals sub-dict.

    Returns:
        DailyTotals dict with summed numeric nutrients and worst glycemic_load.
    """
    _NUMERIC_KEYS = [
        "calories_kcal", "carbs_g", "protein_g", "fat_g", "fiber_g",
        "tryptophan_mg", "omega3_mg", "iron_mg", "magnesium_mg",
        "b6_mg", "b12_mcg", "zinc_mg",
    ]
    _GL_PRIORITY = {"high": 2, "medium": 1, "low": 0, "unknown": -1}

    totals: dict = {k: 0.0 for k in _NUMERIC_KEYS}
    totals["glycemic_load"] = "unknown"
    worst_gl_priority = -1

    for meal in meals:
        s2 = meal.get("stage2") or {}
        mt = s2.get("totals") or {}
        for key in _NUMERIC_KEYS:
            val = mt.get(key)
            if val is not None:
                totals[key] = round(totals[key] + float(val), 4)
        gl = str(mt.get("glycemic_load", "unknown")).lower()
        priority = _GL_PRIORITY.get(gl, -1)
        if priority > worst_gl_priority:
            worst_gl_priority = priority
            totals["glycemic_load"] = gl

    return totals


def recompute_daily_mood_summary(meals: list[dict]) -> dict:
    """Aggregate Stage 4 mood readings across all meals.

    Args:
        meals: List of MealEntry dicts, each with a stage4 sub-dict.

    Returns:
        DailyMoodSummary with avg/min/max mood_score and dominant_cognitive_state.
    """
    scores = []
    cog_states = []

    for meal in meals:
        s4 = meal.get("stage4") or {}
        score = s4.get("mood_score")
        cog = s4.get("cognitive_state")
        if score is not None:
            scores.append(int(score))
        if cog:
            cog_states.append(str(cog))

    if not scores:
        return {
            "avg_mood_score": 0.0,
            "min_mood_score": 0,
            "max_mood_score": 0,
            "dominant_cognitive_state": "clear",
        }

    dominant = Counter(cog_states).most_common(1)[0][0] if cog_states else "clear"
    return {
        "avg_mood_score": round(sum(scores) / len(scores), 4),
        "min_mood_score": min(scores),
        "max_mood_score": max(scores),
        "dominant_cognitive_state": dominant,
    }


def append_meal(date_str: str, meal_data: dict, logs_dir: Path | None = None) -> dict:
    """Append a MealEntry to the day's meals list, recompute totals, and save.

    Args:
        date_str: ISO date string "YYYY-MM-DD".
        meal_data: MealEntry dict with stage1/2/4/5 sub-dicts.
        logs_dir: Optional override directory.

    Returns:
        Updated daily log dict.
    """
    log = load_daily_log(date_str, logs_dir)
    log["meals"].append(meal_data)
    log["daily_totals"] = recompute_daily_totals(log["meals"])
    log["daily_mood_summary"] = recompute_daily_mood_summary(log["meals"])
    write_json(_daily_log_path(date_str, logs_dir), log)
    return log


def update_sleep(date_str: str, sleep_data: dict, logs_dir: Path | None = None) -> dict:
    """Overwrite the sleep section of the daily log and save.

    Args:
        date_str: ISO date string "YYYY-MM-DD".
        sleep_data: SleepInput dict to store as the sleep section.
        logs_dir: Optional override directory.

    Returns:
        Updated daily log dict.
    """
    log = load_daily_log(date_str, logs_dir)
    log["sleep"] = sleep_data
    write_json(_daily_log_path(date_str, logs_dir), log)
    return log


def update_digestion(date_str: str, digestion_data: dict, logs_dir: Path | None = None) -> dict:
    """Overwrite the digestion section of the daily log and save.

    Args:
        date_str: ISO date string "YYYY-MM-DD".
        digestion_data: DigestInput dict to store as the digestion section.
        logs_dir: Optional override directory.

    Returns:
        Updated daily log dict.
    """
    log = load_daily_log(date_str, logs_dir)
    log["digestion"] = digestion_data
    write_json(_daily_log_path(date_str, logs_dir), log)
    return log
