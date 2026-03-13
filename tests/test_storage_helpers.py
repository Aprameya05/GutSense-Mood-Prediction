"""Tests for daily log storage helpers in utils/storage.py."""

import json
from pathlib import Path

import pytest

from utils.storage import (
    append_meal,
    load_daily_log,
    recompute_daily_mood_summary,
    recompute_daily_totals,
    update_digestion,
    update_sleep,
)


# ─── Fixtures ─────────────────────────────────────────────────────────────────

def _meal(
    meal_id: str = "breakfast",
    gl: str = "low",
    fiber: float = 8.0,
    calories: float = 400.0,
    mood_score: int = 1,
    cog: str = "clear",
    spike: str = "mild",
) -> dict:
    return {
        "meal_id": meal_id,
        "meal_time": "08:00",
        "stage1": {"food_items": ["idli"], "en_pred": "dumpling", "confidence": 0.8, "source": "stub", "timestamp": "2026-01-01T08:00:00+00:00"},
        "stage2": {
            "items": [],
            "totals": {
                "calories_kcal": calories,
                "carbs_g": 60.0,
                "protein_g": 10.0,
                "fat_g": 5.0,
                "fiber_g": fiber,
                "glycemic_load": gl,
                "tryptophan_mg": 50.0,
                "omega3_mg": 20.0,
                "iron_mg": 2.0,
                "magnesium_mg": 30.0,
                "b6_mg": 0.2,
                "b12_mcg": 0.0,
                "zinc_mg": 1.0,
            },
        },
        "stage4": {
            "mood_score": mood_score,
            "mood_label": "happy",
            "cognitive_state": cog,
            "cognitive_penalty": 0.0,
            "energy_level": "moderate",
            "anxiety_level": "none",
            "emoji_used": "\U0001f642",
            "tryptophan_context_mg": 50.0,
            "hours_since_meal": 2.0,
        },
        "stage5": {
            "estimated_glucose_spike": spike,
            "spike_delta_mg_dl": 20.0,
            "fiber_attenuation_factor": 0.88,
            "energy_crash_probability": 0.15,
            "late_meal_penalty_applied": False,
            "insulin_demand_proxy": "low",
        },
    }


# ─── load_daily_log ────────────────────────────────────────────────────────────

def test_load_daily_log_returns_scaffold_when_missing(tmp_path):
    log = load_daily_log("2026-01-01", logs_dir=tmp_path)
    assert log["date"] == "2026-01-01"
    assert log["meals"] == []
    assert "daily_totals" in log
    assert "sleep" in log
    assert "digestion" in log


def test_load_daily_log_returns_existing_file(tmp_path):
    data = {"date": "2026-01-01", "meals": [], "custom_field": 42}
    (tmp_path / "2026-01-01.json").write_text(json.dumps(data), encoding="utf-8")
    log = load_daily_log("2026-01-01", logs_dir=tmp_path)
    assert log["custom_field"] == 42


# ─── recompute_daily_totals ────────────────────────────────────────────────────

def test_recompute_daily_totals_empty():
    totals = recompute_daily_totals([])
    assert totals["calories_kcal"] == 0.0
    assert totals["glycemic_load"] == "unknown"


def test_recompute_daily_totals_sums_nutrients():
    meals = [
        _meal("breakfast", calories=400.0, fiber=8.0),
        _meal("lunch",     calories=700.0, fiber=12.0),
        _meal("dinner",    calories=600.0, fiber=10.0),
    ]
    totals = recompute_daily_totals(meals)
    assert totals["calories_kcal"] == pytest.approx(1700.0, abs=0.01)
    assert totals["fiber_g"] == pytest.approx(30.0, abs=0.01)


def test_recompute_daily_totals_picks_worst_gl():
    meals = [
        _meal("breakfast", gl="low"),
        _meal("lunch",     gl="medium"),
        _meal("dinner",    gl="high"),
    ]
    totals = recompute_daily_totals(meals)
    assert totals["glycemic_load"] == "high"


def test_recompute_daily_totals_all_low_gl():
    meals = [_meal(gl="low") for _ in range(3)]
    totals = recompute_daily_totals(meals)
    assert totals["glycemic_load"] == "low"


# ─── recompute_daily_mood_summary ──────────────────────────────────────────────

def test_recompute_mood_summary_empty():
    summary = recompute_daily_mood_summary([])
    assert summary["avg_mood_score"] == 0.0
    assert summary["dominant_cognitive_state"] == "clear"


def test_recompute_mood_summary_averages():
    meals = [
        _meal(mood_score=2, cog="sharp"),
        _meal(mood_score=0, cog="clear"),
        _meal(mood_score=-1, cog="clear"),
    ]
    summary = recompute_daily_mood_summary(meals)
    assert summary["avg_mood_score"] == pytest.approx(1 / 3, abs=0.001)
    assert summary["min_mood_score"] == -1
    assert summary["max_mood_score"] == 2
    assert summary["dominant_cognitive_state"] == "clear"  # 2/3 votes


# ─── append_meal ──────────────────────────────────────────────────────────────

def test_append_meal_creates_file(tmp_path):
    append_meal("2026-01-01", _meal(), logs_dir=tmp_path)
    assert (tmp_path / "2026-01-01.json").exists()


def test_append_meal_accumulates(tmp_path):
    append_meal("2026-01-01", _meal("breakfast", calories=400.0), logs_dir=tmp_path)
    append_meal("2026-01-01", _meal("lunch",     calories=600.0), logs_dir=tmp_path)
    log = load_daily_log("2026-01-01", logs_dir=tmp_path)
    assert len(log["meals"]) == 2
    assert log["daily_totals"]["calories_kcal"] == pytest.approx(1000.0, abs=0.01)


def test_append_meal_updates_mood_summary(tmp_path):
    append_meal("2026-01-01", _meal(mood_score=2, cog="sharp"),   logs_dir=tmp_path)
    append_meal("2026-01-01", _meal(mood_score=-2, cog="brain_fog"), logs_dir=tmp_path)
    log = load_daily_log("2026-01-01", logs_dir=tmp_path)
    assert log["daily_mood_summary"]["min_mood_score"] == -2
    assert log["daily_mood_summary"]["max_mood_score"] == 2


# ─── update_sleep ─────────────────────────────────────────────────────────────

def test_update_sleep_overwrites(tmp_path):
    sleep_data = {"sleep_hours": 7.5, "sleep_quality": "good", "sleep_onset": "23:00"}
    update_sleep("2026-01-01", sleep_data, logs_dir=tmp_path)
    log = load_daily_log("2026-01-01", logs_dir=tmp_path)
    assert log["sleep"]["sleep_hours"] == 7.5
    assert log["sleep"]["sleep_quality"] == "good"


def test_update_sleep_does_not_touch_meals(tmp_path):
    append_meal("2026-01-01", _meal(), logs_dir=tmp_path)
    update_sleep("2026-01-01", {"sleep_hours": 6.0}, logs_dir=tmp_path)
    log = load_daily_log("2026-01-01", logs_dir=tmp_path)
    assert len(log["meals"]) == 1  # meals untouched


# ─── update_digestion ─────────────────────────────────────────────────────────

def test_update_digestion_overwrites(tmp_path):
    dig_data = {"bloating": "mild", "stool_quality": 5, "fermented_food_today": True}
    update_digestion("2026-01-01", dig_data, logs_dir=tmp_path)
    log = load_daily_log("2026-01-01", logs_dir=tmp_path)
    assert log["digestion"]["bloating"] == "mild"
    assert log["digestion"]["fermented_food_today"] is True


def test_update_digestion_does_not_touch_sleep(tmp_path):
    sleep_data = {"sleep_hours": 7.5}
    update_sleep("2026-01-01", sleep_data, logs_dir=tmp_path)
    update_digestion("2026-01-01", {"bloating": "none"}, logs_dir=tmp_path)
    log = load_daily_log("2026-01-01", logs_dir=tmp_path)
    assert log["sleep"]["sleep_hours"] == 7.5  # sleep untouched
