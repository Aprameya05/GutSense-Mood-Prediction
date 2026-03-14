"""End-to-end integration tests that simulate the mobile app's user flow.

Tests 1–5 share a single day (2026-03-15) via a module-scoped temp directory
so each test step builds on the previous one (breakfast → lunch → dinner →
digestion → sleep → overwrite sleep → integrity check).

Test 6 covers three consecutive days with independent state.

Key adaptations from the task sketch to match the real code:
  - stage4.run(mood_input, stage2_output, meal_timestamp)  ← 3 separate args
  - stage5.run(stage2_output, meal_timestamp, stage0_output)
  - stage3.run(stage2_output_or_flat_dict, digestion_report)
  - meal["stage2"] stores the full stage2 output {"items":[…], "totals":{…}}
  - meal_id must be a str
  - no daily_totals["meal_count"] — use len(log["meals"]) instead
  - nutrition totals in daily log use "calories_kcal"/"fiber_g" (same key as
    stage2 output) so those accumulate correctly; carbs/b6/b12 differ in naming
    but are not required by any assertion here
"""

import json
import pytest
from pathlib import Path
from unittest.mock import patch

import stage0.profile as stage0
import stage2.nutrition as stage2
import stage3.gut_proxy as stage3
import stage4.mood as stage4
import stage5.metabolic as stage5
import stage6.sleep as stage6
from utils.storage import (
    append_meal,
    load_daily_log,
    update_digestion,
    update_sleep,
)

# ─── Shared constants ─────────────────────────────────────────────────────────

_DATE = "2026-03-15"
_USER_ID = "test_flow_user"

_PROFILE_DATA = {
    "age": 28,
    "sex": "male",
    "height_cm": 175.0,
    "weight_kg": 70.0,
    "diet_type": "vegetarian",
    "activity_level": "moderate",
    "sleep_schedule": "23:00-07:00",
}

# Groq mock: returned when a food item is not in IFCT/INDB/USDA
_MOCK_GROQ_NUTRITION = json.dumps({
    "calories_kcal": 280.0,
    "carbohydrates_g": 42.0,
    "protein_g": 7.0,
    "fat_g": 5.0,
    "fiber_g": 4.0,
    "glycemic_load": "medium",
    "tryptophan_mg": 45.0,
    "omega3_mg": 20.0,
    "iron_mg": 1.5,
    "magnesium_mg": 18.0,
    "vitamin_b6_mg": 0.08,
    "vitamin_b12_ug": 0.0,
    "zinc_mg": 0.5,
})

# Stage 1 stubs — bypass EfficientNet + Groq Vision entirely
_S1_BREAKFAST = {
    "food_items": ["masala dosa", "sambar"],
    "en_pred": "dosa",
    "confidence": 0.85,
    "source": "stub",
    "timestamp": f"{_DATE}T08:30:00+00:00",
}
_S1_LUNCH = {
    "food_items": ["idli", "sambar"],
    "en_pred": "idli",
    "confidence": 0.90,
    "source": "stub",
    "timestamp": f"{_DATE}T13:00:00+00:00",
}
_S1_DINNER = {
    "food_items": ["rice", "dal"],
    "en_pred": "rice",
    "confidence": 0.78,
    "source": "stub",
    "timestamp": f"{_DATE}T20:30:00+00:00",
}

_DIGESTION_INPUT = {
    "bloating": "none",
    "stool_quality": 4,
    "digestion_quality": "good",
    "gas_discomfort": "none",
    "fermented_food_today": True,
}

_SLEEP_INPUT = {
    "sleep_onset": "23:30",
    "wake_time": "06:30",
    "sleep_quality": "good",
    "night_awakenings": 1,
    "caffeine_after_14h": False,
    "screen_before_bed_min": 30,
    "last_meal_to_bed_hours": 3.0,
}


# ─── Module-scoped fixtures for Tests 1–5 ────────────────────────────────────

@pytest.fixture(scope="module")
def profile(tmp_path_factory):
    """Create a test user profile and return it as a dict."""
    profiles_dir = tmp_path_factory.mktemp("profiles_1_5")
    with patch("stage0.profile.USER_PROFILES_DIR", profiles_dir):
        return stage0.run(_USER_ID, _PROFILE_DATA)


@pytest.fixture(scope="module")
def logs_dir(tmp_path_factory):
    """Shared temp directory for daily-log JSON files (Tests 1–5)."""
    return tmp_path_factory.mktemp("logs_1_5")


# ─── Helper ───────────────────────────────────────────────────────────────────

def _run_single_meal(
    stage1_stub: dict,
    meal_id: str,
    mood_emoji: str,
    mood_rating: int,
    cognitive_state: str,
    energy_level: str,
    anxiety_level: str,
    profile: dict,
    date: str,
    logs_dir: Path,
) -> dict:
    """Run stage2→4→5 for one meal and append it to the daily log.

    Returns the updated daily log dict.
    """
    timestamp = stage1_stub["timestamp"]

    with patch("stage2.nutrition.chat", return_value=_MOCK_GROQ_NUTRITION):
        stage2_out = stage2.run(stage1_stub)

    mood_input = {
        "mood_emoji": mood_emoji,
        "mood_rating": mood_rating,
        "cognitive_state": cognitive_state,
        "energy_level": energy_level,
        "anxiety_level": anxiety_level,
        "timestamp": timestamp,
    }
    stage4_out = stage4.run(mood_input, stage2_out, timestamp)
    stage5_out = stage5.run(stage2_out, timestamp, profile)

    meal_data = {
        "meal_id": meal_id,
        "meal_time": timestamp[11:16],   # "HH:MM"
        "stage1": stage1_stub,           # already contains "timestamp"
        "stage2": stage2_out,            # full {"items":[…], "totals":{…}, …}
        "stage4": stage4_out,
        "stage5": stage5_out,
    }
    return append_meal(date, meal_data, logs_dir=logs_dir)


# ═══════════════════════════════════════════════════════════════════════════════
# Test 1: Complete Meal Logging Flow (3 meals in one day)
# ═══════════════════════════════════════════════════════════════════════════════

def test_1_complete_meal_logging_flow(profile, logs_dir):
    """Simulate breakfast, lunch, and dinner logged by the app."""

    # ── Breakfast ─────────────────────────────────────────────────────────────
    with patch("stage2.nutrition.chat", return_value=_MOCK_GROQ_NUTRITION):
        stage2_breakfast = stage2.run(_S1_BREAKFAST)

    assert stage2_breakfast["items"], "stage2 must resolve at least one item"
    assert stage2_breakfast["totals"]["calories_kcal"] > 0
    assert stage2_breakfast["totals"]["fiber_g"] >= 0

    mood_breakfast = {
        "mood_emoji": "\U0001f642",   # 🙂
        "mood_rating": 7,
        "cognitive_state": "clear",
        "energy_level": "moderate",
        "anxiety_level": "none",
        "timestamp": _S1_BREAKFAST["timestamp"],
    }
    stage4_breakfast = stage4.run(mood_breakfast, stage2_breakfast, _S1_BREAKFAST["timestamp"])
    assert stage4_breakfast["mood_score"] == 1          # 🙂 → +1
    assert stage4_breakfast["cognitive_penalty"] == 0   # clear → 0.0

    stage5_breakfast = stage5.run(stage2_breakfast, _S1_BREAKFAST["timestamp"], profile)
    assert stage5_breakfast["estimated_glucose_spike"] in ("mild", "moderate", "high")
    assert 0.0 <= stage5_breakfast["energy_crash_probability"] <= 1.0

    updated = append_meal(_DATE, {
        "meal_id": "breakfast",
        "meal_time": "08:30",
        "stage1": _S1_BREAKFAST,
        "stage2": stage2_breakfast,
        "stage4": stage4_breakfast,
        "stage5": stage5_breakfast,
    }, logs_dir=logs_dir)

    assert len(updated["meals"]) == 1
    assert updated["daily_totals"]["calories_kcal"] > 0

    # ── Lunch ──────────────────────────────────────────────────────────────────
    updated = _run_single_meal(
        stage1_stub=_S1_LUNCH,
        meal_id="lunch",
        mood_emoji="\U0001f610",   # 😐
        mood_rating=5,
        cognitive_state="mild_fog",
        energy_level="moderate",
        anxiety_level="mild",
        profile=profile,
        date=_DATE,
        logs_dir=logs_dir,
    )
    assert len(updated["meals"]) == 2

    # ── Dinner ─────────────────────────────────────────────────────────────────
    updated = _run_single_meal(
        stage1_stub=_S1_DINNER,
        meal_id="dinner",
        mood_emoji="\U0001f634",   # 😴
        mood_rating=4,
        cognitive_state="drowsy",
        energy_level="low",
        anxiety_level="none",
        profile=profile,
        date=_DATE,
        logs_dir=logs_dir,
    )
    assert len(updated["meals"]) == 3

    # ── Post-3-meal assertions ─────────────────────────────────────────────────
    total_cal = sum(
        m["stage2"]["totals"]["calories_kcal"] for m in updated["meals"]
    )
    assert updated["daily_totals"]["calories_kcal"] == pytest.approx(total_cal, abs=0.01)

    summary = updated["daily_mood_summary"]
    assert summary["avg_mood_score"] is not None
    # scores: 🙂(+1), 😐(0), 😴(-1) → min=-1, max=+1
    assert summary["min_mood_score"] == -1
    assert summary["max_mood_score"] == 1


# ═══════════════════════════════════════════════════════════════════════════════
# Test 2: Digestion submission triggers Stage 3 with daily totals
# ═══════════════════════════════════════════════════════════════════════════════

def test_2_digestion_triggers_stage3(logs_dir):
    """After 3 meals, digestion input feeds Stage 3 from daily accumulated totals."""
    update_digestion(_DATE, _DIGESTION_INPUT, logs_dir=logs_dir)
    log = load_daily_log(_DATE, logs_dir=logs_dir)

    # Stage 3 runs against the daily totals (not a single meal)
    # stage3.run() accepts a flat totals dict as its first arg
    stage3_out = stage3.run(log["daily_totals"], log["digestion"])

    assert 0.0 <= stage3_out["microbiome_diversity_index"] <= 1.0
    assert 0.0 <= stage3_out["inflammation_risk_score"] <= 1.0
    assert 0.0 <= stage3_out["digestion_stability_score"] <= 1.0
    assert stage3_out["inflammation_risk_level"] in ("low", "moderate", "high")

    # fiber_g accumulates from all 3 meals (same key in stage2 totals and daily_totals)
    assert log["daily_totals"]["fiber_g"] > 0

    assert log["digestion"]["bloating"] == "none"


# ═══════════════════════════════════════════════════════════════════════════════
# Test 3: Sleep Logging Flow (once per day)
# ═══════════════════════════════════════════════════════════════════════════════

def test_3_sleep_logging(logs_dir):
    """Log sleep for the day and verify computed physiological indicators."""
    stage6_out = stage6.run(_SLEEP_INPUT, sleep_history_7d=[])

    assert 0 <= stage6_out["sleep_hours"] <= 24
    assert stage6_out["sleep_debt"] >= 0
    assert 0.0 <= stage6_out["neurological_stress_proxy"] <= 1.0
    assert stage6_out["sleep_stability"] in ("low", "moderate", "high")

    # Expected: 23:30 → 06:30 = 7 hours
    assert stage6_out["sleep_hours"] == pytest.approx(7.0, abs=0.01)

    update_sleep(_DATE, stage6_out, logs_dir=logs_dir)
    log = load_daily_log(_DATE, logs_dir=logs_dir)
    assert log["sleep"]["sleep_hours"] > 0


# ═══════════════════════════════════════════════════════════════════════════════
# Test 4: Sleep overwrite — re-logging replaces the previous entry
# ═══════════════════════════════════════════════════════════════════════════════

def test_4_sleep_overwrite(logs_dir):
    """Verify that re-logging sleep on the same day overwrites without touching meals."""
    log_before = load_daily_log(_DATE, logs_dir=logs_dir)
    existing_meals = len(log_before["meals"])

    # Overwrite with forced sleep_hours = 8.0
    overwrite = {**log_before["sleep"], "sleep_hours": 8.0}
    update_sleep(_DATE, overwrite, logs_dir=logs_dir)

    log_after = load_daily_log(_DATE, logs_dir=logs_dir)
    assert log_after["sleep"]["sleep_hours"] == 8.0          # overwritten
    assert len(log_after["meals"]) == existing_meals          # meals untouched


# ═══════════════════════════════════════════════════════════════════════════════
# Test 5: Full-day integrity check
# ═══════════════════════════════════════════════════════════════════════════════

def test_5_full_day_integrity(logs_dir):
    """Verify the complete daily log structure after all logging operations."""
    log = load_daily_log(_DATE, logs_dir=logs_dir)

    # Top-level structure
    assert "meals" in log and len(log["meals"]) == 3
    assert "digestion" in log and log["digestion"]["bloating"] == "none"
    assert "sleep" in log and log["sleep"]["sleep_hours"] > 0
    assert "daily_totals" in log
    assert "daily_mood_summary" in log
    assert "daily_gut" in log   # scaffold present even if stage3 output not written back

    # Every meal carries all four stage sub-dicts
    for meal in log["meals"]:
        assert "stage1" in meal, f"meal {meal.get('meal_id')} missing stage1"
        assert "stage2" in meal, f"meal {meal.get('meal_id')} missing stage2"
        assert "stage4" in meal, f"meal {meal.get('meal_id')} missing stage4"
        assert "stage5" in meal, f"meal {meal.get('meal_id')} missing stage5"

    # Nutrition totals are sums across all meals
    # (calories_kcal is the same key in stage2.totals and daily_totals)
    total_cal = sum(m["stage2"]["totals"]["calories_kcal"] for m in log["meals"])
    assert log["daily_totals"]["calories_kcal"] == pytest.approx(total_cal, abs=0.01)

    # Mood summary populated from 3 readings
    mood = log["daily_mood_summary"]
    assert mood["avg_mood_score"] is not None
    assert "dominant_cognitive_state" in mood
    assert isinstance(mood["min_mood_score"], int)
    assert isinstance(mood["max_mood_score"], int)


# ═══════════════════════════════════════════════════════════════════════════════
# Test 6: Multi-day accumulation (3 consecutive days)
# ═══════════════════════════════════════════════════════════════════════════════

_MULTI_DATES = ["2026-03-15", "2026-03-16", "2026-03-17"]

# Different food combos per day so calorie totals differ
_MULTI_MEALS: dict[str, list[tuple[dict, str, str]]] = {
    "2026-03-15": [
        (
            {"food_items": ["masala dosa", "sambar"], "en_pred": "dosa",
             "confidence": 0.85, "source": "stub"},
            "breakfast", "08:30",
        ),
        (
            {"food_items": ["idli", "sambar"], "en_pred": "idli",
             "confidence": 0.90, "source": "stub"},
            "lunch", "13:00",
        ),
        (
            {"food_items": ["rice", "dal"], "en_pred": "rice",
             "confidence": 0.78, "source": "stub"},
            "dinner", "20:30",
        ),
    ],
    "2026-03-16": [
        (
            {"food_items": ["upma"], "en_pred": "upma",
             "confidence": 0.82, "source": "stub"},
            "breakfast", "09:00",
        ),
        (
            {"food_items": ["curd rice"], "en_pred": "rice",
             "confidence": 0.75, "source": "stub"},
            "lunch", "13:30",
        ),
        (
            {"food_items": ["chapati", "dal"], "en_pred": "flatbread",
             "confidence": 0.80, "source": "stub"},
            "dinner", "21:15",
        ),
    ],
    "2026-03-17": [
        (
            {"food_items": ["poha"], "en_pred": "poha",
             "confidence": 0.88, "source": "stub"},
            "breakfast", "08:00",
        ),
        (
            {"food_items": ["sambar rice"], "en_pred": "rice",
             "confidence": 0.77, "source": "stub"},
            "lunch", "12:45",
        ),
        (
            {"food_items": ["idli", "coconut chutney"], "en_pred": "idli",
             "confidence": 0.91, "source": "stub"},
            "dinner", "20:00",
        ),
    ],
}


@pytest.fixture(scope="module")
def multiday_env(tmp_path_factory):
    """Independent temp dirs + profile for Test 6."""
    logs = tmp_path_factory.mktemp("logs_multiday")
    profiles = tmp_path_factory.mktemp("profiles_multiday")
    with patch("stage0.profile.USER_PROFILES_DIR", profiles):
        prof = stage0.run("multi_test_user", _PROFILE_DATA)
    return {"logs_dir": logs, "profile": prof}


def test_6_multi_day_accumulation(multiday_env):
    """Run 3 consecutive days and verify separate log files with correct structure."""
    logs_dir = multiday_env["logs_dir"]
    profile = multiday_env["profile"]

    for date in _MULTI_DATES:
        for stub, meal_id, time_str in _MULTI_MEALS[date]:
            timestamp = f"{date}T{time_str}:00+00:00"
            full_stub = {**stub, "timestamp": timestamp}

            with patch("stage2.nutrition.chat", return_value=_MOCK_GROQ_NUTRITION):
                stage2_out = stage2.run(full_stub)

            mood_input = {
                "mood_emoji": "\U0001f642",   # 🙂
                "mood_rating": 6,
                "cognitive_state": "clear",
                "energy_level": "moderate",
                "anxiety_level": "none",
                "timestamp": timestamp,
            }
            stage4_out = stage4.run(mood_input, stage2_out, timestamp)
            stage5_out = stage5.run(stage2_out, timestamp, profile)

            append_meal(date, {
                "meal_id": meal_id,
                "meal_time": time_str,
                "stage1": full_stub,
                "stage2": stage2_out,
                "stage4": stage4_out,
                "stage5": stage5_out,
            }, logs_dir=logs_dir)

        update_digestion(date, _DIGESTION_INPUT, logs_dir=logs_dir)
        sleep_out = stage6.run(_SLEEP_INPUT, sleep_history_7d=[])
        update_sleep(date, sleep_out, logs_dir=logs_dir)

    # 3 separate log files must exist
    for date in _MULTI_DATES:
        assert (logs_dir / f"{date}.json").exists(), f"Missing log for {date}"

    # Each day: 3 meals, digestion, sleep
    for date in _MULTI_DATES:
        log = load_daily_log(date, logs_dir=logs_dir)
        assert len(log["meals"]) == 3,                         f"{date}: expected 3 meals, got {len(log['meals'])}"
        assert log["digestion"]["bloating"] == "none",         f"{date}: digestion not stored"
        assert log["sleep"]["sleep_hours"] > 0,                f"{date}: sleep not stored"

    # Daily calorie totals are positive for every day
    totals = [
        load_daily_log(d, logs_dir=logs_dir)["daily_totals"]["calories_kcal"]
        for d in _MULTI_DATES
    ]
    assert all(t > 0 for t in totals), f"Some days have zero calories: {totals}"
