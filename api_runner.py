from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional

from dotenv import load_dotenv

load_dotenv()

from run_pipeline import _load_daily_log_count, _load_daily_records  # type: ignore
from utils.config import DAILY_LOGS_DIR
from utils.storage import ensure_dir, write_json


def run_pipeline_for_api(
    image_path: str,
    user: str,
    *,
    mood_emoji: str = "\U0001f610",
    mood_rating: int = 5,
    cognitive_state: str = "clear",
    energy_level: str = "moderate",
    anxiety_level: str = "none",
    bloating: str = "none",
    stool_quality: int = 4,
    gas_discomfort: str = "none",
    fermented_food: bool = False,
    sleep_onset: Optional[str] = None,
    wake_time: Optional[str] = None,
    sleep_quality: str = "good",
    night_awakenings: int = 0,
    caffeine_after_14h: bool = False,
    screen_before_bed: int = 30,
    meal_to_bed_hours: float = 3.0,
    skip_groq: bool = False,
) -> Dict[str, Any]:
    """
    Run the GutSense pipeline for a single meal and return structured outputs
    suitable for the frontend API.

    This mirrors the logic in run_pipeline.main() but is parameter-based and
    returns dicts instead of printing to stdout.
    """
    image_path = str(Path(image_path).resolve())

    # Stage 0: load profile
    from stage0.profile import load as load_profile

    stage0 = load_profile(user)
    if stage0 is None:
        raise ValueError(
            f"No profile found for '{user}'. "
            "Create one first with stage0.profile.run()."
        )

    # Stage 1: food identification
    from pipeline import analyze_food_image

    stage1 = analyze_food_image(image_path)
    meal_timestamp = datetime.now(timezone.utc).isoformat()
    stage1["timestamp"] = meal_timestamp

    # Stage 2: nutrition
    from stage2.nutrition import run as stage2_run

    stage2 = stage2_run(stage1)

    # Stage 3: gut proxy
    from stage3.gut_proxy import run as stage3_run

    digestion_report = {
        "bloating": bloating,
        "stool_quality": stool_quality,
        "digestion_quality": "good",
        "fermented_food_today": fermented_food,
        "gas_discomfort": gas_discomfort,
    }
    stage3 = stage3_run(stage2, digestion_report)

    # Stage 4: mood
    from stage4.mood import run as stage4_run

    mood_input = {
        "mood_emoji": mood_emoji,
        "mood_rating": mood_rating,
        "cognitive_state": cognitive_state,
        "energy_level": energy_level,
        "anxiety_level": anxiety_level,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    stage4 = stage4_run(mood_input, stage2, meal_timestamp)

    # Stage 5: metabolic
    from stage5.metabolic import run as stage5_run

    stage5 = stage5_run(stage2, meal_timestamp, stage0)

    # Stage 6: sleep (optional)
    stage6: Optional[Dict[str, Any]] = None
    if sleep_onset and wake_time:
        from stage6.sleep import run as stage6_run

        sleep_input = {
            "sleep_onset": sleep_onset,
            "wake_time": wake_time,
            "sleep_quality": sleep_quality,
            "night_awakenings": night_awakenings,
            "caffeine_after_14h": caffeine_after_14h,
            "screen_before_bed_min": screen_before_bed,
            "last_meal_to_bed_hours": meal_to_bed_hours,
        }

        past_records = _load_daily_records()
        sleep_history = [
            r for r in past_records if "sleep_onset" in r and "sleep_debt" in r
        ][-7:]

        stage6 = stage6_run(sleep_input, sleep_history_7d=sleep_history or None)

    # Aggregate daily log (Stage 3–6 + nutrition + food items)
    totals = stage2.get("totals", {})
    daily = {
        **stage3,
        **stage4,
        **stage5,
        **(stage6 or {}),
        "food_items": stage1["food_items"],
        "calories_kcal": totals.get("calories_kcal", 0.0),
        "fiber_g": totals.get("fiber_g", 0.0),
        "tryptophan_mg": totals.get("tryptophan_mg", 0.0),
        "glycemic_load": totals.get("glycemic_load", "unknown"),
        "fermented_food_consumed": stage3["fermented_food_consumed"],
        "late_meal": stage5.get("late_meal_penalty_applied", False),
        "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
    }

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    ensure_dir(DAILY_LOGS_DIR)
    write_json(DAILY_LOGS_DIR / f"{today}.json", daily)

    # Stage 7 (optional; 30+ days)
    stage7: Optional[Dict[str, Any]] = None
    day_count = _load_daily_log_count()
    if day_count >= 30:
        from stage7.patterns import run as stage7_run

        all_records = _load_daily_records()
        stage7 = stage7_run(all_records, skip_groq=skip_groq)

    # Stage 8 (optional; 30+ days)
    stage8: Optional[Dict[str, Any]] = None
    if day_count >= 30:
        from stage8.baseline import run as stage8_run

        stage8 = stage8_run(user)

    # Stage 9 (optional; 7+ days)
    stage9: Optional[Dict[str, Any]] = None
    all_records = _load_daily_records()
    baselines = stage8 or stage0
    if len(all_records) >= 7:
        from stage9.risk import run as stage9_run

        stage9 = stage9_run(all_records, baselines)

    # Stage 10: insights
    from stage10.insights import run as stage10_run

    pipeline_summary = {
        "baselines": stage8 or {},
        "correlations": (stage7 or {}).get("significant_correlations", []),
        "risk": stage9 or {},
        "gut": stage3,
        "sleep": stage6 or {},
        "metabolic": stage5,
        "nutrition_totals": stage2.get("totals", {}),
    }
    stage10 = stage10_run(pipeline_summary, skip_groq=skip_groq)

    return {
        "stage1": stage1,
        "stage2": stage2,
        "stage3": stage3,
        "stage4": stage4,
        "stage5": stage5,
        "stage6": stage6,
        "stage7": stage7,
        "stage8": stage8,
        "stage9": stage9,
        "stage10": stage10,
        "daily": daily,
    }


