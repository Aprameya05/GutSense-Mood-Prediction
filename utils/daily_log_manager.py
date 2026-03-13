"""Structured daily log manager.

Handles per-user, per-day logs in the format:
  data/daily_logs/{user_id}/{date}.json

Each log follows the DailyLog schema from specs.md Section 5.
"""

from __future__ import annotations

from collections import Counter
from pathlib import Path
from typing import Any, Optional

from utils.config import DAILY_LOGS_DIR
from utils.storage import ensure_dir, read_json, write_json


_GL_SEVERITY = {"unknown": 0, "low": 1, "medium": 2, "high": 3}
_GL_NAMES = {0: "unknown", 1: "low", 2: "medium", 3: "high"}


def _user_logs_dir(user_id: str) -> Path:
    return DAILY_LOGS_DIR / user_id


def _log_path(user_id: str, date: str) -> Path:
    return _user_logs_dir(user_id) / f"{date}.json"


def _empty_daily_log(date: str, diet_type: str = "vegetarian") -> dict:
    return {
        "date": date,
        "meals": [],
        "digestion": None,
        "sleep": None,
        "daily_totals": {
            "calories_kcal": 0.0,
            "carbs_g": 0.0,
            "protein_g": 0.0,
            "fat_g": 0.0,
            "fiber_g": 0.0,
            "glycemic_load": "unknown",
            "tryptophan_mg": 0.0,
            "omega3_mg": 0.0,
            "iron_mg": 0.0,
            "magnesium_mg": 0.0,
            "b6_mg": 0.0,
            "b12_mcg": 0.0,
            "zinc_mg": 0.0,
        },
        "daily_gut": {
            "microbiome_diversity_index": 0.0,
            "inflammation_risk_score": 0.0,
            "inflammation_risk_level": "low",
            "digestion_stability_score": 0.0,
            "scfa_production_proxy": "low",
        },
        "daily_mood_summary": {
            "avg_mood_score": 0.0,
            "min_mood_score": 0.0,
            "max_mood_score": 0.0,
            "dominant_cognitive_state": "clear",
        },
        "diet_type": diet_type,
    }


def get_or_create(user_id: str, date: str, diet_type: str = "vegetarian") -> dict:
    """Load existing daily log or create a fresh scaffold."""
    path = _log_path(user_id, date)
    data = read_json(path)
    if data is not None:
        return data
    return _empty_daily_log(date, diet_type)


def save(user_id: str, date: str, daily_log: dict) -> None:
    path = _log_path(user_id, date)
    ensure_dir(path.parent)
    write_json(path, daily_log)


def _normalize_stage2_totals(totals: dict) -> dict:
    """Normalize Stage 2 per-item key names to DailyTotals key names."""
    return {
        "calories_kcal": totals.get("calories_kcal", 0.0),
        "carbs_g": totals.get("carbs_g", totals.get("carbohydrates_g", 0.0)),
        "protein_g": totals.get("protein_g", 0.0),
        "fat_g": totals.get("fat_g", 0.0),
        "fiber_g": totals.get("fiber_g", 0.0),
        "glycemic_load": totals.get("glycemic_load", "unknown"),
        "tryptophan_mg": totals.get("tryptophan_mg", 0.0),
        "omega3_mg": totals.get("omega3_mg", 0.0),
        "iron_mg": totals.get("iron_mg", 0.0),
        "magnesium_mg": totals.get("magnesium_mg", 0.0),
        "b6_mg": totals.get("b6_mg", totals.get("vitamin_b6_mg", 0.0)),
        "b12_mcg": totals.get("b12_mcg", totals.get("vitamin_b12_ug", 0.0)),
        "zinc_mg": totals.get("zinc_mg", 0.0),
    }


def _recompute_daily_totals(meals: list[dict]) -> dict:
    """Sum nutrition across all meals and pick worst glycemic load."""
    totals = {
        "calories_kcal": 0.0,
        "carbs_g": 0.0,
        "protein_g": 0.0,
        "fat_g": 0.0,
        "fiber_g": 0.0,
        "glycemic_load": "unknown",
        "tryptophan_mg": 0.0,
        "omega3_mg": 0.0,
        "iron_mg": 0.0,
        "magnesium_mg": 0.0,
        "b6_mg": 0.0,
        "b12_mcg": 0.0,
        "zinc_mg": 0.0,
    }
    worst_gl = 0
    for meal in meals:
        mt = meal.get("stage2", {}).get("totals", {})
        norm = _normalize_stage2_totals(mt)
        for key in totals:
            if key == "glycemic_load":
                continue
            totals[key] = round(totals[key] + norm.get(key, 0.0), 4)
        meal_gl = _GL_SEVERITY.get(norm.get("glycemic_load", "unknown"), 0)
        worst_gl = max(worst_gl, meal_gl)

    totals["glycemic_load"] = _GL_NAMES.get(worst_gl, "unknown")
    return totals


def _recompute_mood_summary(meals: list[dict]) -> dict:
    """Compute avg/min/max mood and dominant cognitive state across meals."""
    scores: list[float] = []
    cognitive_states: list[str] = []

    for meal in meals:
        s4 = meal.get("stage4", {})
        if "mood_score" in s4:
            scores.append(float(s4["mood_score"]))
        if "cognitive_state" in s4:
            cognitive_states.append(s4["cognitive_state"])

    if not scores:
        return {
            "avg_mood_score": 0.0,
            "min_mood_score": 0.0,
            "max_mood_score": 0.0,
            "dominant_cognitive_state": "clear",
        }

    counter = Counter(cognitive_states)
    dominant = counter.most_common(1)[0][0] if counter else "clear"

    return {
        "avg_mood_score": round(sum(scores) / len(scores), 2),
        "min_mood_score": min(scores),
        "max_mood_score": max(scores),
        "dominant_cognitive_state": dominant,
    }


def append_meal(user_id: str, date: str, meal_entry: dict, diet_type: str = "vegetarian") -> dict:
    """Append a meal and recompute aggregates. Returns updated DailyLog."""
    log = get_or_create(user_id, date, diet_type)
    log["meals"].append(meal_entry)
    log["daily_totals"] = _recompute_daily_totals(log["meals"])
    log["daily_mood_summary"] = _recompute_mood_summary(log["meals"])
    save(user_id, date, log)
    return log


def set_digestion(user_id: str, date: str, digestion_input: dict, stage3_output: dict) -> dict:
    """Set daily digestion and gut health proxy. Returns updated DailyLog."""
    log = get_or_create(user_id, date)
    log["digestion"] = digestion_input
    log["daily_gut"] = {
        "microbiome_diversity_index": stage3_output.get("microbiome_diversity_index", 0.0),
        "inflammation_risk_score": stage3_output.get("inflammation_risk_score", 0.0),
        "inflammation_risk_level": stage3_output.get("inflammation_risk_level", "low"),
        "digestion_stability_score": stage3_output.get("digestion_stability_score", 0.0),
        "scfa_production_proxy": stage3_output.get("scfa_production_proxy", "low"),
    }
    save(user_id, date, log)
    return log


def set_sleep(user_id: str, date: str, sleep_input: dict, stage6_output: dict) -> dict:
    """Set daily sleep data merging input fields + computed metrics. Returns updated DailyLog."""
    log = get_or_create(user_id, date)
    log["sleep"] = {
        "sleep_onset": sleep_input.get("sleep_onset", ""),
        "wake_time": sleep_input.get("wake_time", ""),
        "sleep_hours": stage6_output.get("sleep_hours", 0.0),
        "sleep_debt": stage6_output.get("sleep_debt", 0.0),
        "cumulative_debt_7d": stage6_output.get("cumulative_debt_7d", 0.0),
        "circadian_regularity_index": stage6_output.get("circadian_regularity_index", 0.0),
        "neurological_stress_proxy": stage6_output.get("neurological_stress_proxy", 0.0),
        "sleep_quality": sleep_input.get("sleep_quality", "good"),
        "sleep_stability": stage6_output.get("sleep_stability", "moderate"),
        "night_awakenings": sleep_input.get("night_awakenings", 0),
        "caffeine_after_14h": sleep_input.get("caffeine_after_14h", False),
        "screen_before_bed_min": sleep_input.get("screen_before_bed_min", 0),
    }
    save(user_id, date, log)
    return log


def get_sleep_history(user_id: str, days: int = 7) -> list[dict]:
    """Load the last N days of sleep records for CRI / cumulative debt calculation."""
    user_dir = _user_logs_dir(user_id)
    if not user_dir.exists():
        return []

    records: list[dict] = []
    for f in sorted(user_dir.glob("*.json")):
        data = read_json(f)
        if data and data.get("sleep"):
            records.append(data["sleep"])

    return records[-days:]


def count_days_logged(user_id: str) -> int:
    """Count how many days have at least one log entry."""
    user_dir = _user_logs_dir(user_id)
    if not user_dir.exists():
        return 0
    return len(list(user_dir.glob("*.json")))


def load_all_daily_logs(user_id: str) -> list[dict]:
    """Load all daily log files for a user, sorted by date."""
    user_dir = _user_logs_dir(user_id)
    if not user_dir.exists():
        return []
    logs = []
    for f in sorted(user_dir.glob("*.json")):
        data = read_json(f)
        if data:
            logs.append(data)
    return logs


def load_date_range(user_id: str, from_date: str, to_date: str) -> list[dict]:
    """Load daily logs within a date range (inclusive)."""
    user_dir = _user_logs_dir(user_id)
    if not user_dir.exists():
        return []
    logs = []
    for f in sorted(user_dir.glob("*.json")):
        date_str = f.stem
        if from_date <= date_str <= to_date:
            data = read_json(f)
            if data:
                logs.append(data)
    return logs


def flatten_for_timeseries(daily_log: dict) -> dict:
    """Convert structured DailyLog to flat dict for Stages 7-9 compatibility.

    Stages 7-9 expect flat dicts with keys like mood_score, fiber_g,
    microbiome_diversity_index, sleep_hours, etc. at the top level.
    """
    flat: dict[str, Any] = {"date": daily_log.get("date", "")}

    totals = daily_log.get("daily_totals", {})
    flat["calories_kcal"] = totals.get("calories_kcal", 0.0)
    flat["fiber_g"] = totals.get("fiber_g", 0.0)
    flat["tryptophan_mg"] = totals.get("tryptophan_mg", 0.0)
    flat["glycemic_load"] = totals.get("glycemic_load", "unknown")
    flat["carbohydrates_g"] = totals.get("carbs_g", 0.0)

    gut = daily_log.get("daily_gut", {})
    flat["microbiome_diversity_index"] = gut.get("microbiome_diversity_index", 0.0)
    flat["inflammation_risk_score"] = gut.get("inflammation_risk_score", 0.0)
    flat["inflammation_risk_level"] = gut.get("inflammation_risk_level", "low")
    flat["digestion_stability_score"] = gut.get("digestion_stability_score", 0.0)
    flat["scfa_production_proxy"] = gut.get("scfa_production_proxy", "low")
    flat["fermented_food_consumed"] = daily_log.get("digestion", {}).get(
        "fermented_food_today", False
    ) if daily_log.get("digestion") else False

    mood = daily_log.get("daily_mood_summary", {})
    flat["mood_score"] = mood.get("avg_mood_score", 0.0)
    flat["cognitive_penalty"] = 0.0

    meals = daily_log.get("meals", [])
    if meals:
        penalties = [m.get("stage4", {}).get("cognitive_penalty", 0.0) for m in meals]
        flat["cognitive_penalty"] = min(penalties) if penalties else 0.0

        late_meals = [m.get("stage5", {}).get("late_meal_penalty_applied", False) for m in meals]
        flat["late_meal"] = any(late_meals)
    else:
        flat["late_meal"] = False

    sleep = daily_log.get("sleep") or {}
    flat["sleep_hours"] = sleep.get("sleep_hours", 0.0)
    flat["sleep_debt"] = sleep.get("sleep_debt", 0.0)
    flat["cumulative_debt_7d"] = sleep.get("cumulative_debt_7d", 0.0)
    flat["circadian_regularity_index"] = sleep.get("circadian_regularity_index", 0.0)
    flat["neurological_stress_proxy"] = sleep.get("neurological_stress_proxy", 0.0)
    flat["sleep_onset"] = sleep.get("sleep_onset", "")
    flat["sleep_quality"] = sleep.get("sleep_quality", "")

    flat["estimated_glucose_spike"] = "mild"
    if meals:
        spikes = [m.get("stage5", {}).get("estimated_glucose_spike", "mild") for m in meals]
        spike_severity = {"mild": 1, "moderate": 2, "high": 3}
        worst = max(spikes, key=lambda s: spike_severity.get(s, 0))
        flat["estimated_glucose_spike"] = worst

    return flat
