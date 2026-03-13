"""End-to-end integration test for GutSense pipeline.

Runs Stages 0-10 with synthetic data (no image, no Groq calls needed).
"""

import json
import math
import random
import shutil
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

from dotenv import load_dotenv
load_dotenv()

from utils.config import USER_PROFILES_DIR, DAILY_LOGS_DIR
from utils.storage import ensure_dir, write_json

DIVIDER = "=" * 62
USER_ID = "e2e_test_user_001"

def banner(stage: str, color: str = ""):
    print(f"\n{DIVIDER}")
    print(f"  {stage}")
    print(DIVIDER)


def ok(label: str, value):
    print(f"  [OK]   {label}: {value}")


def warn(label: str, value):
    print(f"  [WARN] {label}: {value}")


# ── Cleanup previous test artifacts ──────────────────────────────────────────
banner("PRE-FLIGHT: cleaning previous test data", "\033[90m")
profile_path = USER_PROFILES_DIR / f"{USER_ID}.json"
if profile_path.exists():
    profile_path.unlink()
    print("  cleaned user profile")

synthetic_logs = list(DAILY_LOGS_DIR.glob("*.json")) if DAILY_LOGS_DIR.exists() else []
if synthetic_logs:
    for f in synthetic_logs:
        f.unlink()
    print(f"  cleaned {len(synthetic_logs)} existing daily log(s)")


# ─────────────────────────────────────────────────────────────────────────────
# STAGE 0 — User Baseline Profile
# ─────────────────────────────────────────────────────────────────────────────
banner("STAGE 0 — User Baseline Profile")

from stage0.profile import run as stage0_run, load as stage0_load

profile_data = {
    "age": 28,
    "sex": "male",
    "height_cm": 175.0,
    "weight_kg": 70.0,
    "diet_type": "vegetarian",
    "activity_level": "moderate",
    "sleep_schedule": "23:00-06:30",
    "supplements": ["vitamin_d"],
    "medications": [],
}

stage0 = stage0_run(USER_ID, profile_data)
ok("BMR", f"{stage0['bmr_kcal']} kcal")
ok("TDEE", f"{stage0['tdee_kcal']} kcal")
ok("Activity multiplier", stage0["activity_multiplier"])
ok("Diet type", stage0["diet_type"])
ok("Profile saved", USER_PROFILES_DIR / f"{USER_ID}.json")

assert stage0["bmr_kcal"] > 0
assert stage0["tdee_kcal"] > stage0["bmr_kcal"]


# ─────────────────────────────────────────────────────────────────────────────
# STAGE 1 — Food Identification (synthetic, no image needed)
# ─────────────────────────────────────────────────────────────────────────────
banner("STAGE 1 — Food Identification (synthetic stub)")

stage1 = {
    "food_items": ["masala dosa", "sambar", "coconut chutney"],
    "en_pred": "crepe",
    "confidence": 0.71,
    "source": "groq",
    "timestamp": datetime.now(timezone.utc).isoformat(),
}
ok("Food items", stage1["food_items"])
ok("Confidence", stage1["confidence"])
ok("Source", stage1["source"])


# ─────────────────────────────────────────────────────────────────────────────
# STAGE 2 — Nutritional Calibration
# ─────────────────────────────────────────────────────────────────────────────
banner("STAGE 2 — Nutritional Calibration")

from stage2.nutrition import run as stage2_run

stage2 = stage2_run(stage1)
totals = stage2["totals"]

ok("Calories", f"{totals.get('calories_kcal', 0):.1f} kcal")
ok("Carbs", f"{totals.get('carbs_g', 0):.1f} g")
ok("Protein", f"{totals.get('protein_g', 0):.1f} g")
ok("Fat", f"{totals.get('fat_g', 0):.1f} g")
ok("Fiber", f"{totals.get('fiber_g', 0):.1f} g")
ok("Tryptophan", f"{totals.get('tryptophan_mg', 0):.1f} mg")
ok("Glycemic load", totals.get("glycemic_load", "unknown"))
ok("Items resolved", len(stage2["items"]))
ok("Lookup sources", {i["food_item"]: i.get("source_db", "?") for i in stage2["items"]})

assert totals.get("calories_kcal", 0) > 0, "Calories must be > 0"
assert len(stage2["items"]) == 3


# ─────────────────────────────────────────────────────────────────────────────
# STAGE 3 — Gut Microbiome Proxy
# ─────────────────────────────────────────────────────────────────────────────
banner("STAGE 3 — Gut Microbiome Proxy")

from stage3.gut_proxy import run as stage3_run

digestion_report = {
    "bloating": "none",
    "stool_quality": 4,
    "digestion_quality": "good",
    "fermented_food_today": False,
    "gas_discomfort": "none",
}

stage3 = stage3_run(stage2, digestion_report)
ok("MDI (Microbiome Diversity Index)", f"{stage3['microbiome_diversity_index']:.3f}")
ok("IRS (Inflammation Risk Score)",    f"{stage3['inflammation_risk_score']:.3f}")
ok("DSS (Digestion Stability Score)",  f"{stage3['digestion_stability_score']:.3f}")
ok("IRS level",  stage3["inflammation_risk_level"])
ok("SCFA proxy", stage3["scfa_production_proxy"])

for key in ("microbiome_diversity_index", "inflammation_risk_score", "digestion_stability_score"):
    val = stage3[key]
    assert 0.0 <= val <= 1.0, f"{key} out of range: {val}"


# ─────────────────────────────────────────────────────────────────────────────
# STAGE 4 — Mood & Cognitive Logging
# ─────────────────────────────────────────────────────────────────────────────
banner("STAGE 4 — Mood & Cognitive Logging")

from stage4.mood import run as stage4_run

mood_input = {
    "mood_emoji": "\U0001f642",
    "mood_rating": 7,
    "cognitive_state": "clear",
    "energy_level": "moderate",
    "anxiety_level": "none",
    "timestamp": datetime.now(timezone.utc).isoformat(),
}

stage4 = stage4_run(mood_input, stage2, stage1["timestamp"])
ok("Mood score",          stage4["mood_score"])
ok("Mood label",          stage4["mood_label"])
ok("Cognitive state",     stage4["cognitive_state"])
ok("Cognitive penalty",   stage4["cognitive_penalty"])
ok("Tryptophan context",  stage4.get("tryptophan_context_mg"))
ok("Hours since meal",    stage4.get("hours_since_meal"))

assert -2 <= stage4["mood_score"] <= 2


# ─────────────────────────────────────────────────────────────────────────────
# STAGE 5 — Metabolic Response
# ─────────────────────────────────────────────────────────────────────────────
banner("STAGE 5 — Metabolic Response")

from stage5.metabolic import run as stage5_run

stage5 = stage5_run(stage2, stage1["timestamp"], stage0)
ok("Glucose spike estimate",     stage5["estimated_glucose_spike"])
ok("Fiber attenuation factor",   f"{stage5['fiber_attenuation_factor']:.3f}")
ok("Energy crash probability",   f"{stage5['energy_crash_probability']:.3f}")
ok("Late-night penalty applied", stage5["late_meal_penalty_applied"])
ok("Insulin demand proxy",        stage5.get("insulin_demand_proxy", "n/a"))
ok("Spike delta (mg/dL)",         stage5.get("spike_delta_mg_dl", 0))

assert 0.0 <= stage5["energy_crash_probability"] <= 1.0


# ─────────────────────────────────────────────────────────────────────────────
# STAGE 6 — Sleep & Physiology
# ─────────────────────────────────────────────────────────────────────────────
banner("STAGE 6 — Sleep & Physiology")

from stage6.sleep import run as stage6_run

sleep_input = {
    "sleep_onset": "23:30",
    "wake_time": "06:30",
    "sleep_quality": "good",
    "night_awakenings": 1,
    "caffeine_after_14h": False,
    "screen_before_bed_min": 30,
    "last_meal_to_bed_hours": 3.0,
}

# Simulate 7 days of prior sleep history
sleep_history = [
    {"sleep_onset": "23:45", "sleep_debt": 0.5}
    for _ in range(7)
]

stage6 = stage6_run(sleep_input, sleep_history_7d=sleep_history)
ok("Sleep hours",             f"{stage6['sleep_hours']:.2f} h")
ok("Sleep debt",              f"{stage6['sleep_debt']:.2f} h")
ok("Cumulative debt (7d)",    f"{stage6['cumulative_debt_7d']:.2f} h")
ok("CRI",                     f"{stage6['circadian_regularity_index']:.3f}")
ok("Neurological stress",     f"{stage6['neurological_stress_proxy']:.3f}")
ok("Sleep stability",         stage6["sleep_stability"])

assert stage6["sleep_hours"] > 0
assert 0.0 <= stage6["circadian_regularity_index"] <= 1.0
assert 0.0 <= stage6["neurological_stress_proxy"] <= 1.0


# ─────────────────────────────────────────────────────────────────────────────
# INJECT 30 DAYS OF SYNTHETIC DAILY LOGS (for Stages 7, 8, 9)
# ─────────────────────────────────────────────────────────────────────────────
banner("SYNTHETIC DATA — Injecting 30 days of daily logs", "\033[35m")

ensure_dir(DAILY_LOGS_DIR)
random.seed(42)
today = datetime.now(timezone.utc).date()

for i in range(30):
    day = today - timedelta(days=29 - i)
    is_bad_week = 7 <= i <= 13  # deliberately bad week

    mood = random.gauss(4.5 if is_bad_week else 6.8, 0.8)
    fiber = random.gauss(8 if is_bad_week else 20, 2)
    gl = random.gauss(22 if is_bad_week else 10, 2)
    mdi = max(0.1, min(0.9, random.gauss(0.35 if is_bad_week else 0.65, 0.08)))
    irs = max(0.1, min(0.9, random.gauss(0.65 if is_bad_week else 0.3, 0.08)))
    dss = max(0.1, min(0.9, random.gauss(0.45 if is_bad_week else 0.75, 0.08)))
    sleep_h = random.gauss(5.5 if is_bad_week else 7.2, 0.4)
    sleep_debt = max(0, 7.5 - sleep_h)
    neuro = max(0.1, min(0.9, random.gauss(0.6 if is_bad_week else 0.25, 0.07)))
    cri = max(0.1, min(0.9, random.gauss(0.4 if is_bad_week else 0.8, 0.07)))
    crash_prob = max(0.0, min(1.0, random.gauss(0.55 if is_bad_week else 0.25, 0.1)))
    b12 = max(0.5, random.gauss(1.8 if i > 20 else 2.5, 0.2))

    record = {
        "date": str(day),
        "food_items": ["masala dosa", "sambar"] if not is_bad_week else ["white rice", "pickle"],
        "calories_kcal": random.gauss(1800 if is_bad_week else 2100, 150),
        "fiber_g": max(0, fiber),
        "tryptophan_mg": random.gauss(180, 30),
        "glycemic_load": max(5, gl),
        "fermented_food_consumed": not is_bad_week and random.random() > 0.5,
        "late_meal": is_bad_week and random.random() > 0.4,
        "mood_score": max(1, min(10, mood)),
        "mood_label": "low" if mood < 5 else "positive",
        "composite_wellbeing_score": max(0.1, min(0.9, mood / 10)),
        "cognitive_state": "brain_fog" if is_bad_week else "clear",
        "energy_level": "low" if is_bad_week else "moderate",
        "anxiety_level": "moderate" if is_bad_week else "none",
        "emoji_used": "\U0001f61f" if is_bad_week else "\U0001f642",
        "microbiome_diversity_index": mdi,
        "inflammation_risk_score": irs,
        "inflammation_risk_level": "high" if irs > 0.5 else "low",
        "digestion_stability_score": dss,
        "scfa_production_proxy": "low" if fiber < 10 else "moderate",
        "fermented_food_consumed": not is_bad_week,
        "estimated_glucose_spike": "high" if gl > 15 else "moderate",
        "fiber_attenuation_factor": max(0.3, min(0.9, fiber / 30)),
        "energy_crash_probability": crash_prob,
        "late_meal_penalty_applied": is_bad_week,
        "tdee_percentage_consumed": random.gauss(80 if is_bad_week else 95, 10),
        "meal_timing_risk": "high" if is_bad_week else "low",
        "sleep_onset": "01:30" if is_bad_week else "23:15",
        "sleep_hours": max(3, sleep_h),
        "sleep_debt": sleep_debt,
        "cumulative_debt_7d": sleep_debt * 3.5,
        "circadian_regularity_index": cri,
        "neurological_stress_proxy": neuro,
        "sleep_stability_label": "poor" if neuro > 0.5 else "good",
        "b12_mg": b12,
        "diet_type": "vegetarian",
    }
    write_json(DAILY_LOGS_DIR / f"{str(day)}.json", record)

print(f"  injected 30 synthetic daily log files into {DAILY_LOGS_DIR}")


# ─────────────────────────────────────────────────────────────────────────────
# STAGE 7 — Time-Series Pattern Analysis
# ─────────────────────────────────────────────────────────────────────────────
banner("STAGE 7 — Time-Series Pattern Analysis")

from stage7.patterns import run as stage7_run
from utils.storage import read_json

all_records = sorted(
    [read_json(f) for f in DAILY_LOGS_DIR.glob("*.json")],
    key=lambda r: r.get("date", "")
)

stage7 = stage7_run(all_records, skip_groq=True)
ok("Days analyzed",            stage7["days_analyzed"])
ok("Correlation pairs",        len(stage7["correlations"]))
ok("Significant correlations", len(stage7["significant_correlations"]))
ok("Anomalies detected",       stage7["anomalies_detected"])
ok("Pattern confidence",       stage7.get("pattern_confidence", "n/a"))
ok("Groq summary",             str(stage7.get("groq_summary", "(skip_groq)"))[:80])

if stage7["significant_correlations"]:
    top = stage7["significant_correlations"][0]
    ok("Top correlation",
       f"{top['pair']}  r={top['r']:.3f}  p={top['p']:.4f}  lag={top['lag_days']}d")


# ─────────────────────────────────────────────────────────────────────────────
# STAGE 8 — Baseline Creation
# ─────────────────────────────────────────────────────────────────────────────
banner("STAGE 8 — Baseline Creation")

from stage8.baseline import run as stage8_run

stage8 = stage8_run(USER_ID)
ok("Period (days)",           stage8["baseline_period_days"])
ok("Baseline mood",           f"{stage8['baseline_mood']:.3f}")
ok("Baseline sleep (h)",      f"{stage8['baseline_sleep_hours']:.2f}")
ok("Baseline MDI",            f"{stage8['baseline_MDI']:.3f}")
ok("Baseline IRS",            f"{stage8['baseline_inflammation_risk']:.3f}")
ok("All baselines stable",    stage8["all_baselines_stable"])
unstable = [k for k, v in stage8.get("stability_details", {}).items() if not v.get("stable")]
ok("Unstable metrics",        unstable or "none")


# ─────────────────────────────────────────────────────────────────────────────
# STAGE 9 — Neurological Risk Detection
# ─────────────────────────────────────────────────────────────────────────────
banner("STAGE 9 — Neurological Risk Detection")

from stage9.risk import run as stage9_run

stage9 = stage9_run(all_records, stage8)
ok("Risk level",     stage9["neurological_risk_level"])
ok("Active flags",   stage9["active_flags"])
ok("Flag count",     stage9["risk_count"])
ok("Recommendation", stage9.get("recommendation", "—")[:70])


# ─────────────────────────────────────────────────────────────────────────────
# STAGE 10 — Insight Generation
# ─────────────────────────────────────────────────────────────────────────────
banner("STAGE 10 — Insight Generation")

from stage10.insights import run as stage10_run

pipeline_summary = {
    "baselines": stage8,
    "correlations": stage7.get("significant_correlations", []),
    "risk": stage9,
    "gut": stage3,
    "sleep": stage6,
    "metabolic": stage5,
    "nutrition_totals": stage2.get("totals", {}),
}

stage10 = stage10_run(pipeline_summary, skip_groq=True)
ok("Insights generated",   len(stage10["insights"]))
ok("Risk flag",            stage10["neurological_risk_flag"])
ok("Disclaimer present",   bool(stage10["disclaimer"]))
ok("Generated by",         stage10.get("generated_by", "—"))

print()
for idx, insight in enumerate(stage10["insights"], 1):
    print(f"  {idx}. {insight}")
print(f"\n  NOTE: {stage10['disclaimer']}")


# ─────────────────────────────────────────────────────────────────────────────
# FINAL SUMMARY
# ─────────────────────────────────────────────────────────────────────────────
banner("PIPELINE SUMMARY", "\033[92m")

stages = {
    "Stage 0 — User Profile":       f"BMR={stage0['bmr_kcal']} kcal  TDEE={stage0['tdee_kcal']} kcal",
    "Stage 1 — Food ID (stub)":     f"{stage1['food_items']}  conf={stage1['confidence']}",
    "Stage 2 — Nutrition":          f"{totals.get('calories_kcal',0):.0f} kcal  fiber={totals.get('fiber_g',0):.1f}g",
    "Stage 3 — Gut Proxy":          f"MDI={stage3['microbiome_diversity_index']:.2f}  IRS={stage3['inflammation_risk_score']:.2f}  DSS={stage3['digestion_stability_score']:.2f}",
    "Stage 4 — Mood":               f"score={stage4['mood_score']}  label={stage4['mood_label']}  cognitive={stage4['cognitive_state']}",
    "Stage 5 — Metabolic":          f"spike={stage5['estimated_glucose_spike']}  crash_prob={stage5['energy_crash_probability']:.2f}  insulin={stage5['insulin_demand_proxy']}",
    "Stage 6 — Sleep":              f"{stage6['sleep_hours']:.1f}h  debt={stage6['sleep_debt']:.1f}h  neuro={stage6['neurological_stress_proxy']:.2f}  stability={stage6['sleep_stability']}",
    "Stage 7 — Patterns":           f"{stage7['days_analyzed']} days  correlations={len(stage7['correlations'])}  sig={len(stage7['significant_correlations'])}  anomalies={stage7['anomalies_detected']}",
    "Stage 8 — Baselines":          f"mood={stage8['baseline_mood']:.2f}  sleep={stage8['baseline_sleep_hours']:.1f}h  MDI={stage8['baseline_MDI']:.2f}  stable={stage8['all_baselines_stable']}",
    "Stage 9 — Risk":               f"level={stage9['neurological_risk_level']}  flags={stage9['active_flags']}  consult={stage9['professional_consult_suggested']}",
    "Stage 10 — Insights":          f"{len(stage10['insights'])} insights  risk={stage10['neurological_risk_flag']}",
}

for name, summary in stages.items():
    print(f"  [OK]  {name:<32}  {summary}")

print(f"\n  ALL STAGES PASSED -- pipeline is operational")
print(f"{DIVIDER}\n")
