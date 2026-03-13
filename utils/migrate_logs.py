"""Migrate existing flat daily logs to the new structured DailyLog format.

Converts data/daily_logs/{date}.json (global, flat) into
data/daily_logs/{user_id}/{date}.json (user-scoped, structured).

Usage:
    python -m utils.migrate_logs --user synthetic_001
    python -m utils.migrate_logs --user synthetic_001 --dry-run
"""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
from pathlib import Path

from utils.config import DAILY_LOGS_DIR
from utils.storage import ensure_dir, read_json, write_json


def _flat_to_structured(flat: dict) -> dict:
    """Convert a flat daily log dict into the structured DailyLog format."""
    date = flat.get("date", "unknown")

    food_items = flat.get("food_items", [])
    stage1 = {
        "food_items": food_items,
        "en_pred": food_items[0] if food_items else "",
        "confidence": 1.0,
        "source": "synthetic",
        "timestamp": flat.get("timestamp", datetime.now(timezone.utc).isoformat()),
    }

    totals = {
        "calories_kcal": flat.get("calories_kcal", 0.0),
        "carbs_g": flat.get("carbohydrates_g", flat.get("carbs_g", 0.0)),
        "protein_g": flat.get("protein_g", 0.0),
        "fat_g": flat.get("fat_g", 0.0),
        "fiber_g": flat.get("fiber_g", 0.0),
        "glycemic_load": flat.get("glycemic_load", "unknown"),
        "tryptophan_mg": flat.get("tryptophan_mg", 0.0),
        "omega3_mg": flat.get("omega3_mg", 0.0),
        "iron_mg": flat.get("iron_mg", 0.0),
        "magnesium_mg": flat.get("magnesium_mg", 0.0),
        "b6_mg": flat.get("vitamin_b6_mg", flat.get("b6_mg", 0.0)),
        "b12_mcg": flat.get("vitamin_b12_ug", flat.get("b12_mcg", 0.0)),
        "zinc_mg": flat.get("zinc_mg", 0.0),
    }

    stage2 = {
        "items": [
            {
                "food_item": item,
                "portion_g": 250.0,
                "source_db": "groq_estimate",
                "calories_kcal": totals["calories_kcal"] / max(len(food_items), 1),
                "carbohydrates_g": totals["carbs_g"] / max(len(food_items), 1),
                "protein_g": totals["protein_g"] / max(len(food_items), 1),
                "fat_g": totals["fat_g"] / max(len(food_items), 1),
                "fiber_g": totals["fiber_g"] / max(len(food_items), 1),
                "glycemic_load": totals["glycemic_load"],
                "tryptophan_mg": totals["tryptophan_mg"] / max(len(food_items), 1),
                "omega3_mg": totals["omega3_mg"] / max(len(food_items), 1),
                "iron_mg": totals["iron_mg"] / max(len(food_items), 1),
                "magnesium_mg": totals["magnesium_mg"] / max(len(food_items), 1),
                "vitamin_b6_mg": totals["b6_mg"] / max(len(food_items), 1),
                "vitamin_b12_ug": totals["b12_mcg"] / max(len(food_items), 1),
                "zinc_mg": totals["zinc_mg"] / max(len(food_items), 1),
            }
            for item in food_items
        ],
        "totals": totals,
        "timestamp": flat.get("timestamp", datetime.now(timezone.utc).isoformat()),
    }

    stage4 = {
        "mood_score": flat.get("mood_score", 0),
        "mood_label": flat.get("mood_label", "neutral"),
        "cognitive_state": flat.get("cognitive_state", "clear"),
        "cognitive_penalty": flat.get("cognitive_penalty", 0.0),
        "energy_level": flat.get("energy_level", "moderate"),
        "anxiety_level": flat.get("anxiety_level", "none"),
        "emoji_used": flat.get("emoji_used"),
        "tryptophan_context_mg": flat.get("tryptophan_mg", 0.0),
        "hours_since_meal": flat.get("hours_since_meal", 0.0),
        "timestamp": flat.get("timestamp", datetime.now(timezone.utc).isoformat()),
    }

    stage5 = {
        "estimated_glucose_spike": flat.get("estimated_glucose_spike", "mild"),
        "spike_delta_mg_dl": flat.get("spike_delta_mg_dl", 25.0),
        "fiber_attenuation_factor": flat.get("fiber_attenuation_factor", 1.0),
        "energy_crash_probability": flat.get("energy_crash_probability", 0.0),
        "late_meal_penalty_applied": flat.get("late_meal_penalty_applied", False),
        "insulin_demand_proxy": flat.get("insulin_demand_proxy", "low"),
        "timestamp": flat.get("timestamp", datetime.now(timezone.utc).isoformat()),
    }

    meal_entry = {
        "meal_id": "lunch",
        "meal_time": "12:00",
        "stage1": stage1,
        "stage2": stage2,
        "stage4": stage4,
        "stage5": stage5,
    }

    digestion = None
    if "bloating" in flat or "stool_quality" in flat:
        digestion = {
            "bloating": flat.get("bloating", "none"),
            "stool_quality": flat.get("stool_quality", 4),
            "gas_discomfort": flat.get("gas_discomfort", "none"),
            "digestion_quality": flat.get("digestion_quality", "good"),
            "fermented_food_today": flat.get("fermented_food_consumed", False),
        }

    sleep = None
    if "sleep_hours" in flat and flat.get("sleep_hours", 0) > 0:
        sleep = {
            "sleep_onset": flat.get("sleep_onset", "23:00"),
            "wake_time": flat.get("wake_time", "06:30"),
            "sleep_hours": flat.get("sleep_hours", 0.0),
            "sleep_debt": flat.get("sleep_debt", 0.0),
            "cumulative_debt_7d": flat.get(
                "cumulative_debt_7d", flat.get("cumulative_sleep_debt", 0.0)
            ),
            "circadian_regularity_index": flat.get("circadian_regularity_index", 0.0),
            "neurological_stress_proxy": flat.get("neurological_stress_proxy", 0.0),
            "sleep_quality": flat.get("sleep_quality", "good"),
            "sleep_stability": flat.get(
                "sleep_stability", flat.get("sleep_stability_label", "moderate")
            ),
            "night_awakenings": flat.get("night_awakenings", 0),
            "caffeine_after_14h": flat.get("caffeine_after_14h", False),
            "screen_before_bed_min": flat.get("screen_before_bed_min", 0),
        }

    daily_gut = {
        "microbiome_diversity_index": flat.get("microbiome_diversity_index", 0.0),
        "inflammation_risk_score": flat.get("inflammation_risk_score", 0.0),
        "inflammation_risk_level": flat.get("inflammation_risk_level", "low"),
        "digestion_stability_score": flat.get("digestion_stability_score", 0.0),
        "scfa_production_proxy": flat.get("scfa_production_proxy", "low"),
    }

    daily_mood_summary = {
        "avg_mood_score": float(flat.get("mood_score", 0)),
        "min_mood_score": float(flat.get("mood_score", 0)),
        "max_mood_score": float(flat.get("mood_score", 0)),
        "dominant_cognitive_state": flat.get("cognitive_state", "clear"),
    }

    return {
        "date": date,
        "meals": [meal_entry],
        "digestion": digestion,
        "sleep": sleep,
        "daily_totals": totals,
        "daily_gut": daily_gut,
        "daily_mood_summary": daily_mood_summary,
        "diet_type": flat.get("diet_type", "vegetarian"),
    }


def migrate(user_id: str, dry_run: bool = False) -> int:
    """Migrate all flat daily logs in data/daily_logs/ to user-scoped structured format.

    Returns the number of files migrated.
    """
    source_dir = DAILY_LOGS_DIR
    if not source_dir.exists():
        print(f"[migrate] Source directory not found: {source_dir}")
        return 0

    target_dir = DAILY_LOGS_DIR / user_id
    count = 0

    for f in sorted(source_dir.glob("*.json")):
        flat = read_json(f)
        if flat is None:
            continue

        structured = _flat_to_structured(flat)
        target_path = target_dir / f.name

        if dry_run:
            print(f"[dry-run] Would write: {target_path}")
        else:
            ensure_dir(target_dir)
            write_json(target_path, structured)
            print(f"[migrate] {f.name} -> {target_path}")

        count += 1

    print(f"[migrate] {'Would migrate' if dry_run else 'Migrated'} {count} files for user '{user_id}'")
    return count


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Migrate flat daily logs to structured format")
    parser.add_argument("--user", required=True, help="User ID to associate logs with")
    parser.add_argument("--dry-run", action="store_true", help="Preview without writing files")
    args = parser.parse_args()
    migrate(args.user, dry_run=args.dry_run)
