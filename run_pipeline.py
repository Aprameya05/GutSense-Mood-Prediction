"""Pipeline Runner: modal CLI for the GutSense pipeline.

Usage:
    python run_pipeline.py --mode meal --image photo.jpg --user balaji_001
    python run_pipeline.py --mode sleep --user balaji_001 --sleep-onset 23:30 --wake-time 06:15
    python run_pipeline.py --mode digestion --user balaji_001 --bloating none --stool-quality 4
    python run_pipeline.py --mode daily-summary --user balaji_001
"""

import argparse
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

from utils.config import DAILY_LOGS_DIR
from utils.flatten import extract_flat_record
from utils.storage import (
    append_meal,
    ensure_dir,
    load_daily_log,
    read_json,
    update_digestion,
    update_sleep,
    write_json,
)


# ─── Shared helpers ──────────────────────────────────────────────────────────

def _load_daily_log_count() -> int:
    """Count existing daily log files."""
    if not DAILY_LOGS_DIR.exists():
        return 0
    return len(list(DAILY_LOGS_DIR.glob("*.json")))


def _load_flat_records() -> list[dict]:
    """Load all daily log records, flattened for stages 7/8/9."""
    if not DAILY_LOGS_DIR.exists():
        return []
    records = []
    for f in sorted(DAILY_LOGS_DIR.glob("*.json")):
        data = read_json(f)
        if data:
            records.append(extract_flat_record(data))
    return records


def _load_sleep_history_7d(today: str) -> list[dict]:
    """Load the last 7 days of sleep data from daily logs."""
    history = []
    base = datetime.strptime(today, "%Y-%m-%d")
    for i in range(1, 8):
        date_str = (base - timedelta(days=i)).strftime("%Y-%m-%d")
        log = load_daily_log(date_str)
        sleep = log.get("sleep") or {}
        if sleep.get("sleep_hours", 0) > 0:
            history.append(sleep)
    return history


def _infer_meal_id() -> str:
    """Guess meal_id from current local time."""
    hour = datetime.now().hour
    if hour < 11:
        return "breakfast"
    if hour < 15:
        return "lunch"
    if hour < 19:
        return "snack"
    return "dinner"


def _today() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


# ─── Mode: meal ──────────────────────────────────────────────────────────────

def _run_meal(args: argparse.Namespace) -> dict:
    if not args.image:
        print("[error] --image is required for meal mode")
        sys.exit(1)

    # Stage 0
    from stage0.profile import load as load_profile

    stage0 = load_profile(args.user)
    if stage0 is None:
        print(f"[pipeline] No profile found for '{args.user}'. "
              "Create one first with stage0.profile.run().")
        sys.exit(1)
    print(f"[stage0] Profile loaded: BMR={stage0['bmr_kcal']}, TDEE={stage0['tdee_kcal']}")

    # Stage 1
    from pipeline import analyze_food_image

    stage1 = analyze_food_image(args.image)
    meal_timestamp = datetime.now(timezone.utc).isoformat()
    stage1["timestamp"] = meal_timestamp
    print(f"[stage1] Identified: {stage1['food_items']} (source={stage1['source']})")

    # Stage 2
    from stage2.nutrition import run as stage2_run

    stage2 = stage2_run(stage1)
    print(f"[stage2] Nutrition: {stage2['totals'].get('calories_kcal', 0):.0f} kcal, "
          f"fiber={stage2['totals'].get('fiber_g', 0):.1f}g")

    # Stage 5 (per-meal metabolic)
    from stage5.metabolic import run as stage5_run

    stage5 = stage5_run(stage2, meal_timestamp, stage0)
    print(f"[stage5] Glucose spike={stage5['estimated_glucose_spike']}, "
          f"crash_prob={stage5['energy_crash_probability']:.2f}")

    # Stage 4 (mood)
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

    # Build meal entry and persist
    meal_data = {
        "meal_id": args.meal_id or _infer_meal_id(),
        "meal_time": datetime.now().strftime("%H:%M"),
        "stage1": stage1,
        "stage2": stage2,
        "stage4": stage4,
        "stage5": stage5,
    }

    today = _today()
    log = append_meal(today, meal_data)
    meal_count = len(log["meals"])
    print(f"[pipeline] Meal #{meal_count} saved to data/daily_logs/{today}.json")
    print(f"[pipeline] Daily totals: "
          f"{log['daily_totals']['calories_kcal']:.0f} kcal, "
          f"fiber={log['daily_totals']['fiber_g']:.1f}g")
    return meal_data


# ─── Mode: sleep ─────────────────────────────────────────────────────────────

def _run_sleep(args: argparse.Namespace) -> dict:
    if not args.sleep_onset or not args.wake_time:
        print("[error] --sleep-onset and --wake-time are required for sleep mode")
        sys.exit(1)

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

    today = _today()
    sleep_history = _load_sleep_history_7d(today)

    stage6 = stage6_run(sleep_input, sleep_history_7d=sleep_history or None)
    update_sleep(today, stage6)

    print(f"[stage6] Sleep={stage6['sleep_hours']:.1f}h, "
          f"debt={stage6['sleep_debt']:.1f}h, "
          f"CRI={stage6['circadian_regularity_index']:.2f}, "
          f"neuro_stress={stage6['neurological_stress_proxy']:.2f}")
    print(f"[pipeline] Sleep data saved to data/daily_logs/{today}.json")
    return stage6


# ─── Mode: digestion ─────────────────────────────────────────────────────────

def _run_digestion(args: argparse.Namespace) -> dict:
    from stage3.gut_proxy import run as stage3_run

    digestion_data = {
        "bloating": args.bloating,
        "stool_quality": args.stool_quality,
        "digestion_quality": "good",
        "fermented_food_today": args.fermented_food,
        "gas_discomfort": args.gas_discomfort,
    }

    today = _today()

    # Persist digestion input
    update_digestion(today, digestion_data)

    # Stage 3 uses daily totals (sum of all meals), not a single meal
    log = load_daily_log(today)
    nutrition_for_stage3 = {"totals": log["daily_totals"]}
    stage3 = stage3_run(nutrition_for_stage3, digestion_data)

    # Save daily_gut back to the log
    log["daily_gut"] = {
        "microbiome_diversity_index": stage3["microbiome_diversity_index"],
        "inflammation_risk_score": stage3["inflammation_risk_score"],
        "inflammation_risk_level": stage3["inflammation_risk_level"],
        "digestion_stability_score": stage3["digestion_stability_score"],
        "scfa_production_proxy": stage3["scfa_production_proxy"],
    }
    ensure_dir(DAILY_LOGS_DIR)
    write_json(DAILY_LOGS_DIR / f"{today}.json", log)

    print(f"[stage3] MDI={stage3['microbiome_diversity_index']:.2f}, "
          f"IRS={stage3['inflammation_risk_score']:.2f}, "
          f"DSS={stage3['digestion_stability_score']:.2f}")
    print(f"[pipeline] Digestion + gut scores saved to data/daily_logs/{today}.json")
    return stage3


# ─── Mode: daily-summary ─────────────────────────────────────────────────────

def _run_daily_summary(args: argparse.Namespace) -> dict:
    from stage0.profile import load as load_profile

    stage0 = load_profile(args.user)
    if stage0 is None:
        print(f"[pipeline] No profile found for '{args.user}'.")
        sys.exit(1)

    day_count = _load_daily_log_count()
    all_records = _load_flat_records()

    # Stage 7
    stage7 = None
    if day_count >= 30:
        from stage7.patterns import run as stage7_run
        stage7 = stage7_run(all_records, skip_groq=args.skip_groq)
        print(f"[stage7] Correlations={len(stage7.get('significant_correlations', []))}, "
              f"anomalies={stage7.get('anomalies_detected', 0)}")
    else:
        print(f"[stage7] Skipped ({day_count}/30 days accumulated)")

    # Stage 8
    stage8 = None
    if day_count >= 30:
        from stage8.baseline import run as stage8_run
        stage8 = stage8_run(args.user)
        print(f"[stage8] Baselines computed, stable={stage8['all_baselines_stable']}")
    else:
        print(f"[stage8] Skipped ({day_count}/30 days)")

    # Stage 9
    stage9 = None
    baselines = stage8 or stage0
    if len(all_records) >= 7:
        from stage9.risk import run as stage9_run
        stage9 = stage9_run(all_records, baselines)
        print(f"[stage9] Risk={stage9['neurological_risk_level']}, "
              f"flags={stage9['active_flags']}")
    else:
        print(f"[stage9] Skipped (need 7+ days)")

    # Stage 10
    from stage10.insights import run as stage10_run

    today_log = load_daily_log(_today())
    pipeline_summary = {
        "baselines": stage8 or {},
        "correlations": (stage7 or {}).get("significant_correlations", []),
        "risk": stage9 or {},
        "gut": today_log.get("daily_gut", {}),
        "sleep": today_log.get("sleep", {}),
        "metabolic": {},
        "nutrition_totals": today_log.get("daily_totals", {}),
    }
    stage10 = stage10_run(pipeline_summary, skip_groq=args.skip_groq)

    print("\n" + "=" * 60)
    print("GUTSENSE INSIGHTS")
    print("=" * 60)
    for i, insight in enumerate(stage10["insights"], 1):
        print(f"  {i}. {insight}")
    print(f"\n  Risk level: {stage10['neurological_risk_flag']}")
    print(f"  {stage10['disclaimer']}")
    print("=" * 60)
    return stage10


# ─── CLI ─────────────────────────────────────────────────────────────────────

def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="GutSense Mood Prediction Pipeline"
    )
    parser.add_argument("--mode", required=True,
                        choices=["meal", "sleep", "digestion", "daily-summary"],
                        help="Pipeline mode to run")
    parser.add_argument("--user", required=True, help="User ID (e.g. balaji_001)")

    # Meal mode
    parser.add_argument("--image", default=None, help="Path to meal image (required for meal mode)")
    parser.add_argument("--meal-id", default=None,
                        choices=["breakfast", "lunch", "dinner", "snack"],
                        help="Meal identifier (auto-inferred from time if omitted)")

    # Mood inputs (meal mode)
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

    # Digestion inputs (digestion mode)
    parser.add_argument("--bloating", default="none",
                        choices=["none", "mild", "moderate", "severe"])
    parser.add_argument("--stool-quality", type=int, default=4,
                        choices=range(1, 8), metavar="1-7")
    parser.add_argument("--gas-discomfort", default="none",
                        choices=["none", "mild", "moderate", "severe"])
    parser.add_argument("--fermented-food", action="store_true",
                        help="Consumed fermented food today")

    # Sleep inputs (sleep mode)
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

    return parser


_MODE_DISPATCH = {
    "meal": _run_meal,
    "sleep": _run_sleep,
    "digestion": _run_digestion,
    "daily-summary": _run_daily_summary,
}


def main(argv: list[str] | None = None):
    parser = build_parser()
    args = parser.parse_args(argv)

    print(f"[pipeline] mode={args.mode}, user={args.user}")
    handler = _MODE_DISPATCH[args.mode]
    return handler(args)


if __name__ == "__main__":
    main()
