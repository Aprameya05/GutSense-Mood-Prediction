"""Pipeline Runner: chains all stages end-to-end.

Usage:
    python run_pipeline.py --image meal.jpg --user balaji_001 \\
        --mood-emoji 😐 --mood-rating 5 --cognitive-state clear \\
        --energy-level moderate --anxiety-level none \\
        --sleep-onset 23:30 --wake-time 06:15 --sleep-quality fair
"""

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

from utils.config import DAILY_LOGS_DIR
from utils.storage import ensure_dir, read_json, write_json


def _load_daily_log_count() -> int:
    """Count existing daily log files."""
    logs = DAILY_LOGS_DIR
    if not logs.exists():
        return 0
    return len(list(logs.glob("*.json")))


def _load_daily_records() -> list[dict]:
    """Load all daily log records sorted by date."""
    logs = DAILY_LOGS_DIR
    if not logs.exists():
        return []
    records = []
    for f in sorted(logs.glob("*.json")):
        data = read_json(f)
        if data:
            records.append(data)
    return records


def main():
    parser = argparse.ArgumentParser(
        description="GutSense Mood Prediction Pipeline"
    )
    parser.add_argument("--image", required=True, help="Path to meal image")
    parser.add_argument("--user", required=True, help="User ID (e.g. balaji_001)")

    # Stage 4: Mood inputs
    parser.add_argument("--mood-emoji", default="\U0001f610",
                        help="Mood emoji (default: neutral)")
    parser.add_argument("--mood-rating", type=int, default=5,
                        help="Mood rating 1-10")
    parser.add_argument("--cognitive-state", default="clear",
                        choices=["sharp", "clear", "mild_fog", "brain_fog", "drowsy"])
    parser.add_argument("--energy-level", default="moderate",
                        choices=["very_low", "low", "moderate", "high", "very_high"])
    parser.add_argument("--anxiety-level", default="none",
                        choices=["none", "mild", "moderate", "high"])

    # Stage 3: Digestion inputs
    parser.add_argument("--bloating", default="none",
                        choices=["none", "mild", "moderate", "severe"])
    parser.add_argument("--stool-quality", type=int, default=4,
                        choices=range(1, 8), metavar="1-7")
    parser.add_argument("--gas-discomfort", default="none",
                        choices=["none", "mild", "moderate", "severe"])
    parser.add_argument("--fermented-food", action="store_true",
                        help="Consumed fermented food today")

    # Stage 6: Sleep inputs
    parser.add_argument("--sleep-onset", default=None, help="Sleep onset HH:MM")
    parser.add_argument("--wake-time", default=None, help="Wake time HH:MM")
    parser.add_argument("--sleep-quality", default="good",
                        choices=["poor", "fair", "good", "excellent"])
    parser.add_argument("--night-awakenings", type=int, default=0)
    parser.add_argument("--caffeine-after-14h", action="store_true")
    parser.add_argument("--screen-before-bed", type=int, default=30,
                        help="Screen time before bed (minutes)")
    parser.add_argument("--meal-to-bed-hours", type=float, default=3.0)

    # Control flags
    parser.add_argument("--skip-groq", action="store_true",
                        help="Skip Groq calls (use placeholders)")

    args = parser.parse_args()

    print(f"[pipeline] Starting for user={args.user}, image={args.image}")

    # ── Stage 0: Load user profile ───────────────────────────────────────
    from stage0.profile import load as load_profile

    stage0 = load_profile(args.user)
    if stage0 is None:
        print(f"[pipeline] No profile found for '{args.user}'. "
              "Create one first with stage0.profile.run().")
        sys.exit(1)
    print(f"[stage0] Profile loaded: BMR={stage0['bmr_kcal']}, TDEE={stage0['tdee_kcal']}")

    # ── Stage 1: Food identification ─────────────────────────────────────
    from pipeline import analyze_food_image

    stage1 = analyze_food_image(args.image)
    meal_timestamp = datetime.now(timezone.utc).isoformat()
    stage1["timestamp"] = meal_timestamp
    print(f"[stage1] Identified: {stage1['food_items']} (source={stage1['source']})")

    # ── Stage 2: Nutritional calibration ─────────────────────────────────
    from stage2.nutrition import run as stage2_run

    stage2 = stage2_run(stage1)
    print(f"[stage2] Nutrition: {stage2['totals'].get('calories_kcal', 0):.0f} kcal, "
          f"fiber={stage2['totals'].get('fiber_g', 0):.1f}g")

    # ── Stage 3: Gut microbiome proxy ────────────────────────────────────
    from stage3.gut_proxy import run as stage3_run

    digestion_report = {
        "bloating": args.bloating,
        "stool_quality": args.stool_quality,
        "digestion_quality": "good",
        "fermented_food_today": args.fermented_food,
        "gas_discomfort": args.gas_discomfort,
    }
    stage3 = stage3_run(stage2, digestion_report)
    print(f"[stage3] MDI={stage3['microbiome_diversity_index']:.2f}, "
          f"IRS={stage3['inflammation_risk_score']:.2f}, "
          f"DSS={stage3['digestion_stability_score']:.2f}")

    # ── Stage 4: Mood & cognitive logging ────────────────────────────────
    from stage4.mood import run as stage4_run

    mood_input = {
        "mood_emoji": args.mood_emoji,
        "mood_rating": args.mood_rating,
        "cognitive_state": args.cognitive_state,
        "energy_level": args.energy_level,
        "anxiety_level": args.anxiety_level,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    stage4 = stage4_run(mood_input, stage2, meal_timestamp)
    print(f"[stage4] Mood={stage4['mood_label']}({stage4['mood_score']}), "
          f"cognitive={stage4['cognitive_state']}")

    # ── Stage 5: Metabolic response ──────────────────────────────────────
    from stage5.metabolic import run as stage5_run

    stage5 = stage5_run(stage2, meal_timestamp, stage0)
    print(f"[stage5] Glucose spike={stage5['estimated_glucose_spike']}, "
          f"crash_prob={stage5['energy_crash_probability']:.2f}")

    # ── Stage 6: Sleep & physiology (optional) ───────────────────────────
    stage6 = None
    if args.sleep_onset and args.wake_time:
        from stage6.sleep import run as stage6_run

        sleep_input = {
            "sleep_onset": args.sleep_onset,
            "wake_time": args.wake_time,
            "sleep_quality": args.sleep_quality,
            "night_awakenings": args.night_awakenings,
            "caffeine_after_14h": args.caffeine_after_14h,
            "screen_before_bed_min": args.screen_before_bed,
            "last_meal_to_bed_hours": args.meal_to_bed_hours,
        }
        # Load sleep history from past daily logs
        past_records = _load_daily_records()
        sleep_history = [
            r for r in past_records
            if "sleep_onset" in r and "sleep_debt" in r
        ][-7:]

        stage6 = stage6_run(sleep_input, sleep_history_7d=sleep_history or None)
        print(f"[stage6] Sleep={stage6['sleep_hours']:.1f}h, "
              f"debt={stage6['sleep_debt']:.1f}h, "
              f"neuro_stress={stage6['neurological_stress_proxy']:.2f}")
    else:
        print("[stage6] Skipped (no sleep data provided)")

    # ── Aggregate daily record ───────────────────────────────────────────
    daily = {
        **stage3,
        **stage4,
        **(stage5),
        **(stage6 or {}),
        "food_items": stage1["food_items"],
        "calories_kcal": stage2["totals"].get("calories_kcal", 0),
        "fiber_g": stage2["totals"].get("fiber_g", 0),
        "tryptophan_mg": stage2["totals"].get("tryptophan_mg", 0),
        "glycemic_load": stage2["totals"].get("glycemic_load", "unknown"),
        "fermented_food_consumed": stage3["fermented_food_consumed"],
        "late_meal": stage5.get("late_meal_penalty_applied", False),
        "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
    }

    # Save daily log
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    ensure_dir(DAILY_LOGS_DIR)
    write_json(DAILY_LOGS_DIR / f"{today}.json", daily)
    print(f"[pipeline] Daily log saved: data/daily_logs/{today}.json")

    # ── Stage 7: Time-series patterns (requires 30+ days) ───────────────
    stage7 = None
    day_count = _load_daily_log_count()
    if day_count >= 30:
        from stage7.patterns import run as stage7_run

        all_records = _load_daily_records()
        stage7 = stage7_run(all_records, skip_groq=args.skip_groq)
        print(f"[stage7] Correlations={len(stage7.get('significant_correlations', []))}, "
              f"anomalies={stage7.get('anomalies_detected', 0)}")
    else:
        print(f"[stage7] Skipped ({day_count}/30 days accumulated)")

    # ── Stage 8: Baseline creation (requires 30+ days) ───────────────────
    stage8 = None
    if day_count >= 30:
        from stage8.baseline import run as stage8_run

        stage8 = stage8_run(args.user)
        print(f"[stage8] Baselines computed, stable={stage8['all_baselines_stable']}")
    else:
        print(f"[stage8] Skipped ({day_count}/30 days)")

    # ── Stage 9: Risk detection ──────────────────────────────────────────
    stage9 = None
    all_records = _load_daily_records()
    baselines = stage8 or stage0
    if len(all_records) >= 7:
        from stage9.risk import run as stage9_run

        stage9 = stage9_run(all_records, baselines)
        print(f"[stage9] Risk={stage9['neurological_risk_level']}, "
              f"flags={stage9['active_flags']}")
    else:
        print(f"[stage9] Skipped (need 7+ days)")

    # ── Stage 10: Insight generation ─────────────────────────────────────
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
    stage10 = stage10_run(pipeline_summary, skip_groq=args.skip_groq)

    # ── Final output ─────────────────────────────────────────────────────
    print("\n" + "=" * 60)
    print("GUTSENSE INSIGHTS")
    print("=" * 60)
    for i, insight in enumerate(stage10["insights"], 1):
        print(f"  {i}. {insight}")
    print(f"\n  Risk level: {stage10['neurological_risk_flag']}")
    print(f"  {stage10['disclaimer']}")
    print("=" * 60)

    return stage10


if __name__ == "__main__":
    main()
