"""Synthetic Data Generator — Stage SIM.

Generates 30 days of realistic vegetarian-Indian-diet data for pipeline testing.
Follows SPEC.md "Synthetic Data Simulation" rules:
  - 90 meals (3/day), 90 mood logs, 90 digestion reports, 30 sleep logs
  - 1 good week (high fiber, fermented foods, consistent sleep)
  - Bad week 1 (days 7-13): high sugar, late meals, poor sleep
  - Bad week 2 extended (days 16-29, 14 consecutive): very bad — triggers Stage 9 flags
  - 4 deliberate food misclassifications
  - Sleep onset ±90 min for realistic CRI variance

Stage 9 flags designed to fire:
  - persistent_brain_fog   : brain_fog on 6/7 of last 7 days
  - chronic_sleep_debt     : cumulative_debt_7d > 10 for ALL last 14 days
  - metabolic_dysregulation: glucose_spike="high" on ≥10/14 last days (≥60%)
  - inflammation_persistence: IRS > 0.6 for all 14 consecutive final days
  - circadian_disruption   : CRI < 0.4 for all 14 consecutive final days
  - combined_neuro_stress  : neuro_stress > 0.7 for all last 7 days
  - b12_deficiency_signal  : vegetarian + cognitive decline over 21 days
"""

import random
import shutil
import sys
from datetime import date, timedelta
from pathlib import Path

# Ensure project root on path when run as script
_ROOT = Path(__file__).resolve().parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from dotenv import load_dotenv
load_dotenv()

from utils.config import DAILY_LOGS_DIR, USER_PROFILES_DIR
from utils.storage import ensure_dir, write_json


# ─── Meal pools ───────────────────────────────────────────────────────────────

_GOOD_MEALS = [
    ["masala dosa", "sambar", "coconut chutney"],
    ["idli", "sambar", "coconut chutney"],
    ["dal", "roti", "aloo sabzi"],
    ["rajma", "rice"],
    ["chole", "roti"],
    ["pongal", "sambar"],
    ["khichdi"],
    ["uttapam", "sambar"],
    ["dal", "rice"],
]

_BAD_MEALS_1 = [
    ["biryani"],
    ["bhatura", "chole"],
    ["white rice", "pickle"],
    ["aloo sabzi", "rice"],
    ["poha"],
    ["vada"],
]

_BAD_MEALS_2 = [
    ["biryani"],
    ["white rice", "pickle"],
    ["bhatura"],
    ["aloo sabzi", "rice"],
    ["poha", "rice"],
]

# Misclassification: wrong label stored in food_items, correct in correct_food_items
_MISCLASSIFICATIONS = {
    5:  {"food_items": ["fried_rice"],    "correct_food_items": ["biryani"]},
    12: {"food_items": ["plain dosa"],    "correct_food_items": ["uttapam"]},
    19: {"food_items": ["sambar rice"],   "correct_food_items": ["curd rice"]},
    25: {"food_items": ["dal fry"],       "correct_food_items": ["rajma masala"]},
}


def _clamp(v: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, v))


def _gauss(mu: float, sigma: float, lo: float, hi: float) -> float:
    return _clamp(random.gauss(mu, sigma), lo, hi)


def _sleep_onset_str(base_hour: int, base_min: int, jitter_min: int) -> str:
    """Return HH:MM with ±jitter_min randomness."""
    total = base_hour * 60 + base_min + random.randint(-jitter_min, jitter_min)
    total = total % 1440  # wrap at midnight
    return f"{total // 60:02d}:{total % 60:02d}"


def _bad2_sleep_onset() -> str:
    """Very irregular sleep for bad week 2: anywhere from 22:00 to 04:00."""
    # Range of 360 min → std_dev ≈ 104 min → CRI ≈ 0.13 (well below 0.4)
    choices = [
        "22:00", "22:30", "23:45", "00:30", "01:00",
        "01:30", "02:00", "02:30", "03:00", "03:30", "04:00",
    ]
    return random.choice(choices)


# ─── Per-day record builder ────────────────────────────────────────────────────

def _make_record(i: int, day: date, prev_debts: list[float]) -> dict:
    """
    Build one daily log record.

    Args:
        i: Day index 0-29.
        day: Calendar date.
        prev_debts: List of sleep debts from previous days (for cumulative calc).
    """
    is_good = i <= 6
    is_bad1 = 7 <= i <= 13
    is_trans = 14 <= i <= 15
    is_bad2 = i >= 16        # last 14 days (16-29)
    is_last7 = i >= 23       # last 7 days (23-29)

    # ── Food items ──────────────────────────────────────────────────────────
    if i in _MISCLASSIFICATIONS:
        mis = _MISCLASSIFICATIONS[i]
        food_items = mis["food_items"]
        correct_food_items = mis["correct_food_items"]
        misclassification_flag = True
    else:
        misclassification_flag = False
        correct_food_items = None
        if is_good:
            food_items = random.choice(_GOOD_MEALS)
        elif is_bad1:
            food_items = random.choice(_BAD_MEALS_1)
        else:
            food_items = random.choice(_BAD_MEALS_2)

    # ── Fiber ───────────────────────────────────────────────────────────────
    if is_good:
        fiber_g = _gauss(28, 3, 22, 36)
    elif is_bad1:
        fiber_g = _gauss(7, 1.5, 4, 10)
    elif is_trans:
        fiber_g = _gauss(9, 1.5, 5, 13)
    else:  # bad2
        fiber_g = _gauss(6, 1.5, 3, 9)

    # ── Glycemic load — stored as string ("low"/"medium"/"high") so Stage 7's
    #    _GL_NUMERIC converter works: _GL_NUMERIC.get(str(v).lower(), 1.0)
    if is_good:
        gl_str = random.choice(["low", "low", "low", "medium"])
    elif is_bad1:
        gl_str = random.choice(["high", "high", "high", "high", "medium"])
    elif is_trans:
        gl_str = random.choice(["high", "high", "medium"])
    else:  # bad2
        gl_str = random.choice(["high", "high", "high", "high", "medium"])

    gl_numeric = {"low": 0.0, "medium": 1.0, "high": 2.0}[gl_str]

    # ── Nutrition totals (per-meal aggregates stored in daily log) ───────────
    if is_good:
        calories_kcal = _gauss(2100, 120, 1850, 2400)
        tryptophan_mg = _gauss(220, 30, 160, 280)
        fat_g = _gauss(55, 8, 38, 72)
        carbs_g = _gauss(280, 25, 220, 340)
    elif is_bad1:
        calories_kcal = _gauss(1900, 150, 1600, 2250)
        tryptophan_mg = _gauss(160, 25, 100, 210)
        fat_g = _gauss(75, 10, 55, 95)
        carbs_g = _gauss(380, 30, 310, 440)
    elif is_trans:
        calories_kcal = _gauss(1950, 130, 1650, 2250)
        tryptophan_mg = _gauss(175, 25, 120, 225)
        fat_g = _gauss(70, 10, 50, 90)
        carbs_g = _gauss(360, 30, 290, 420)
    else:  # bad2
        calories_kcal = _gauss(1850, 150, 1550, 2150)
        tryptophan_mg = _gauss(145, 20, 95, 190)
        fat_g = _gauss(80, 10, 60, 100)
        carbs_g = _gauss(400, 30, 340, 460)

    # ── Fermented food ──────────────────────────────────────────────────────
    if is_good:
        fermented = random.random() > 0.43  # ~4 of 7 days
    elif is_bad1 or is_bad2 or is_trans:
        fermented = False
    else:
        fermented = random.random() > 0.7

    # ── Stage 3: Gut proxies ─────────────────────────────────────────────────
    if is_good:
        mdi = _gauss(0.70, 0.04, 0.60, 0.80)
        irs = _gauss(0.28, 0.04, 0.20, 0.40)
        dss = _gauss(0.80, 0.05, 0.68, 0.92)
        bloating = random.choice(["none", "none", "none", "mild"])
        stool_q = random.choice([3, 3, 4, 4])
    elif is_bad1:
        mdi = _gauss(0.34, 0.04, 0.24, 0.44)
        irs = _gauss(0.62, 0.04, 0.52, 0.70)
        dss = _gauss(0.52, 0.06, 0.40, 0.64)
        bloating = random.choice(["mild", "moderate", "moderate"])
        stool_q = random.choice([5, 5, 6, 6])
    elif is_trans:
        mdi = _gauss(0.38, 0.04, 0.28, 0.48)
        irs = _gauss(0.62, 0.04, 0.54, 0.70)
        dss = _gauss(0.50, 0.05, 0.38, 0.62)
        bloating = random.choice(["mild", "moderate"])
        stool_q = random.choice([5, 6, 6])
    else:  # bad2: high variance so Stage 8 CV > 15% for these metrics
        mdi = _gauss(0.28, 0.07, 0.12, 0.44)
        # IRS must all be > 0.6 (inflammation_persistence), wide spread for CV > 15%
        # With gauss(0.73, 0.17) clamped [0.62, 0.97]: effective std ≈ 0.14, CV ≈ 19%
        irs = _gauss(0.73, 0.17, 0.62, 0.97)
        dss = _gauss(0.44, 0.09, 0.26, 0.62)
        bloating = random.choice(["moderate", "moderate", "severe"])
        stool_q = random.choice([6, 6, 7])

    irs = _clamp(irs, 0.0, 1.0)
    mdi = _clamp(mdi, 0.0, 1.0)
    dss = _clamp(dss, 0.0, 1.0)

    # ── Stage 4: Mood ────────────────────────────────────────────────────────
    if is_good:
        mood_score = random.choice([1, 2, 2])
        mood_label = "happy" if mood_score == 1 else "very_happy"
        cognitive_state = random.choice(["sharp", "clear", "clear"])
        cognitive_penalty = 0.0
        energy_level = random.choice(["moderate", "high"])
        anxiety_level = "none"
        emoji = "\U0001f604" if mood_score == 2 else "\U0001f642"
    elif is_bad1:
        mood_score = -1
        mood_label = "worried"
        # 5 of 7 days have brain_fog
        bad1_fog_days = {7, 9, 10, 11, 13}
        cognitive_state = "brain_fog" if i in bad1_fog_days else "mild_fog"
        cognitive_penalty = -1.5 if cognitive_state == "brain_fog" else -0.5
        energy_level = "low"
        anxiety_level = "moderate"
        emoji = "\U0001f61f"
    elif is_trans:
        mood_score = -1
        mood_label = "worried"
        cognitive_state = "brain_fog"
        cognitive_penalty = -1.5
        energy_level = "low"
        anxiety_level = "moderate"
        emoji = "\U0001f61f"
    else:  # bad2
        mood_score = -2
        mood_label = "sad"
        # All last 7 days (i=23-29) have brain_fog; earlier bad2 too except day 18
        if is_last7 or i in {16, 17, 19, 20, 21, 22}:
            cognitive_state = "brain_fog"
            cognitive_penalty = -1.5
        else:  # day 18: give it mild_fog for variety
            cognitive_state = "mild_fog"
            cognitive_penalty = -0.5
        energy_level = "very_low"
        anxiety_level = "high"
        emoji = "\U0001f614"

    # ── Stage 5: Metabolic ───────────────────────────────────────────────────
    if is_good:
        glucose_spike = random.choice(["mild", "mild", "moderate"])
        crash_prob = _gauss(0.18, 0.05, 0.08, 0.30)
        fiber_att = _gauss(0.80, 0.03, 0.72, 0.90)
        late_meal = False
        insulin_proxy = "low" if glucose_spike == "mild" else "moderate"
    elif is_bad1:
        # 5/7 days "high" spike
        high_spike_days = {7, 8, 10, 11, 13}
        glucose_spike = "high" if i in high_spike_days else "moderate"
        crash_prob = _gauss(0.62, 0.06, 0.48, 0.76)
        fiber_att = _gauss(0.76, 0.03, 0.70, 0.82)
        late_meal = i in {7, 9, 10, 11, 12}
        insulin_proxy = "high" if glucose_spike == "high" else "moderate"
    elif is_trans:
        glucose_spike = "high"
        crash_prob = _gauss(0.65, 0.06, 0.50, 0.78)
        fiber_att = _gauss(0.75, 0.03, 0.70, 0.82)
        late_meal = True
        insulin_proxy = "high"
    else:  # bad2: 10/14 days "high" (71% ≥ 60% threshold)
        high_spike_days_bad2 = {16, 17, 18, 19, 20, 22, 23, 25, 27, 29}
        glucose_spike = "high" if i in high_spike_days_bad2 else "moderate"
        crash_prob = _gauss(0.70, 0.06, 0.55, 0.84)
        fiber_att = _gauss(0.74, 0.03, 0.70, 0.80)
        late_meal = True
        insulin_proxy = "high" if glucose_spike == "high" else "moderate"

    # ── Stage 6: Sleep ───────────────────────────────────────────────────────
    if is_good:
        sleep_h = _gauss(7.5, 0.25, 7.0, 8.2)
        sleep_onset = _sleep_onset_str(22, 55, 15)  # ~23:00 ±15 min
        cri = _gauss(0.83, 0.04, 0.72, 0.93)
        neuro_stress = _gauss(0.28, 0.04, 0.20, 0.38)
    elif is_bad1:
        sleep_h = _gauss(5.5, 0.30, 4.8, 6.2)
        sleep_onset = _sleep_onset_str(0, 30, 45)   # ~00:30 ±45 min
        cri = _gauss(0.48, 0.05, 0.36, 0.58)
        neuro_stress = _gauss(0.62, 0.04, 0.52, 0.72)
    elif is_trans:
        sleep_h = _gauss(5.8, 0.30, 4.8, 6.5)
        sleep_onset = _sleep_onset_str(0, 45, 45)
        cri = _gauss(0.42, 0.05, 0.30, 0.52)
        neuro_stress = _gauss(0.65, 0.04, 0.54, 0.74)
    else:  # bad2: very irregular — CRI must be < 0.4
        sleep_h = _gauss(5.0, 0.35, 4.0, 5.8)
        sleep_onset = _bad2_sleep_onset()
        cri = _gauss(0.22, 0.05, 0.10, 0.35)     # guaranteed < 0.4
        # First 7 of bad2 (i=16-22): vary widely for CV; last 7 (i=23-29): all > 0.70
        if is_last7:
            neuro_stress = _gauss(0.82, 0.07, 0.72, 0.96)   # guaranteed > 0.70
        else:
            # Wide spread for CV > 15%; some days may dip below 0.70
            # (combined_neuro_stress only needs LAST 7 consecutive > 0.70)
            neuro_stress = _gauss(0.64, 0.18, 0.38, 0.92)

    sleep_debt = max(0.0, round(7.5 - sleep_h, 2))

    # Cumulative debt: sum of last 7 daily debts (including today)
    all_debts = prev_debts + [sleep_debt]
    cumulative_debt_7d = round(sum(all_debts[-7:]), 2)
    # For bad2: override to guarantee > 10 (in case gauss produced low sleep_debt)
    if is_bad2 and cumulative_debt_7d <= 10.0:
        cumulative_debt_7d = round(_gauss(14.0, 1.5, 11.0, 17.5), 2)

    sleep_stability = "low" if (sleep_debt > 2 or cri < 0.5) else ("high" if sleep_debt < 1 and cri > 0.7 else "moderate")

    # ── Assemble record ──────────────────────────────────────────────────────
    record: dict = {
        "date": str(day),
        # Nutrition
        "food_items": food_items,
        "calories_kcal": round(calories_kcal, 1),
        "fiber_g": round(fiber_g, 1),
        "tryptophan_mg": round(tryptophan_mg, 1),
        "fat_g": round(fat_g, 1),
        "carbohydrates_g": round(carbs_g, 1),
        "glycemic_load": gl_str,          # string ("low"/"medium"/"high") for Stage 7 _GL_NUMERIC converter
        "fermented_food_consumed": fermented,
        "late_meal": late_meal,
        # Stage 3
        "microbiome_diversity_index": round(mdi, 4),
        "inflammation_risk_score": round(irs, 4),
        "inflammation_risk_level": "high" if irs > 0.6 else ("moderate" if irs > 0.3 else "low"),
        "digestion_stability_score": round(dss, 4),
        "scfa_production_proxy": "high" if fiber_g > 25 else ("moderate" if fiber_g > 10 else "low"),
        "bloating": bloating,
        "stool_quality": stool_q,
        # Stage 4
        "mood_score": mood_score,
        "mood_label": mood_label,
        "cognitive_state": cognitive_state,
        "cognitive_penalty": cognitive_penalty,
        "energy_level": energy_level,
        "anxiety_level": anxiety_level,
        "emoji_used": emoji,
        "composite_wellbeing_score": round(_clamp((mood_score + 2) / 4.0, 0.0, 1.0), 3),
        # Stage 5
        "estimated_glucose_spike": glucose_spike,
        "fiber_attenuation_factor": round(fiber_att, 4),
        "energy_crash_probability": round(crash_prob, 3),
        "late_meal_penalty_applied": late_meal,
        "insulin_demand_proxy": insulin_proxy,
        "tdee_percentage_consumed": round(_gauss(88 if (is_bad1 or is_bad2) else 95, 8, 68, 115), 1),
        # Stage 6
        "sleep_onset": sleep_onset,
        "sleep_hours": round(sleep_h, 2),
        "sleep_debt": sleep_debt,
        "cumulative_debt_7d": cumulative_debt_7d,
        "cumulative_sleep_debt": cumulative_debt_7d,  # alias for Stage 7 correlation pair
        "circadian_regularity_index": round(cri, 4),
        "neurological_stress_proxy": round(neuro_stress, 4),
        "sleep_stability": sleep_stability,
        "sleep_stability_label": sleep_stability,
        # Metadata
        "diet_type": "vegetarian",
    }

    if misclassification_flag:
        record["misclassification_flag"] = True
        record["correct_food_items"] = correct_food_items

    return record, sleep_debt


# ─── Public API ────────────────────────────────────────────────────────────────

def generate(
    output_dir: Path,
    user_id: str = "synthetic_001",
    seed: int = 42,
    overwrite: bool = True,
    base_date: date | None = None,
) -> list[dict]:
    """
    Generate 30 days of synthetic daily log records.

    Args:
        output_dir: Directory to write YYYY-MM-DD.json files.
        user_id: User identifier (for metadata only; profile must be created separately).
        seed: Random seed for reproducibility.
        overwrite: If True, remove existing *.json files before writing.
        base_date: Last day of the 30-day window (default: today).

    Returns:
        List of 30 daily record dicts in chronological order.
    """
    random.seed(seed)
    ensure_dir(output_dir)

    if overwrite:
        for f in output_dir.glob("*.json"):
            f.unlink()

    today = base_date or date.today()
    records: list[dict] = []
    prev_debts: list[float] = []

    for i in range(30):
        day = today - timedelta(days=29 - i)
        record, debt = _make_record(i, day, prev_debts)
        prev_debts.append(debt)
        write_json(output_dir / f"{str(day)}.json", record)
        records.append(record)

    return records


# ─── Verification helpers ──────────────────────────────────────────────────────

def _run_verification(records: list[dict], user_id: str, skip_groq: bool = True) -> None:
    """Run stages 7-10 on the generated records and print results."""
    from utils.storage import read_json
    from utils.config import BASELINES_DIR

    print("\n" + "=" * 60)
    print("SYNTHETIC DATA VERIFICATION -- Stages 7-10")
    print("=" * 60)

    # Stage 7
    from stage7.patterns import run as stage7_run
    s7 = stage7_run(records, skip_groq=skip_groq)
    print(f"\n[Stage 7] Days analyzed: {s7['days_analyzed']}")
    print(f"          Correlations: {len(s7['correlations'])}  significant: {len(s7['significant_correlations'])}")
    print(f"          Anomalies: {s7['anomalies_detected']}")
    gl_mood = next(
        (c for c in s7["correlations"] if "glycemic" in c.get("pair", "").lower() and "mood" in c.get("pair", "").lower()),
        None,
    )
    if gl_mood:
        r = gl_mood.get("r", 0)
        direction = "NEGATIVE [OK]" if r < -0.3 else ("weak" if abs(r) < 0.3 else "POSITIVE [!!]")
        print(f"          GL<->mood r={r:.3f}  [{direction}]")
    else:
        print("          GL<->mood pair not found in correlations")

    # Stage 8
    from stage8.baseline import run as stage8_run
    s8 = stage8_run(user_id)
    print(f"\n[Stage 8] Baselines computed: {s8['baseline_period_days']} days")
    print(f"          baseline_mood={s8['baseline_mood']:.2f}  baseline_sleep={s8['baseline_sleep_hours']:.1f}h")
    unstable = [k for k, v in s8.get("stability_details", {}).items() if not v.get("stable")]
    print(f"          Unstable metrics (CV>15%): {unstable or 'none'}")
    infl_cv = s8.get("stability_details", {}).get("inflammation", {}).get("cv_percent", 0)
    neuro_cv = s8.get("stability_details", {}).get("neuro_stress", {}).get("cv_percent", 0)
    print(f"          inflammation CV={infl_cv:.1f}%  neuro_stress CV={neuro_cv:.1f}%")
    if infl_cv > 15 and neuro_cv > 15:
        print("          [OK] Both correctly unstable")
    else:
        print("          [!!] One or both unexpectedly stable -- check bad-week values")

    # Stage 9
    from stage9.risk import run as stage9_run
    s9 = stage9_run(records, s8)
    print(f"\n[Stage 9] Risk level: {s9['neurological_risk_level'].upper()}")
    print(f"          Flags ({s9['risk_count']}): {s9['active_flags']}")
    if s9["risk_count"] >= 2:
        print("          [OK] >=2 risk signals detected")
    else:
        print("          [!!] Fewer than 2 flags -- check bad-week parameter tuning")

    # Stage 10
    from stage10.insights import run as stage10_run
    pipeline_summary = {
        "baselines": s8,
        "correlations": s7.get("significant_correlations", []),
        "risk": s9,
        "gut": {},
        "sleep": {},
        "metabolic": {},
        "nutrition_totals": {},
    }
    s10 = stage10_run(pipeline_summary, skip_groq=skip_groq)
    print(f"\n[Stage 10] Insights generated: {len(s10['insights'])}")
    for idx, insight in enumerate(s10["insights"], 1):
        print(f"  {idx}. {insight}")
    print(f"\n  Risk flag: {s10['neurological_risk_flag']}")
    print(f"  {s10['disclaimer']}")
    print("=" * 60)


# ─── Entry point ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    USER_ID = "synthetic_001"
    SEED = 42

    print(f"[synthetic] Generating 30 days for user='{USER_ID}' (seed={SEED})")

    # Create user profile
    from stage0.profile import run as stage0_run
    profile = stage0_run(USER_ID, {
        "age": 28,
        "sex": "male",
        "height_cm": 175.0,
        "weight_kg": 70.0,
        "diet_type": "vegetarian",
        "activity_level": "moderate",
        "sleep_schedule": "23:00-06:30",
        "supplements": [],
        "medications": [],
    })
    print(f"[synthetic] Profile: BMR={profile['bmr_kcal']} TDEE={profile['tdee_kcal']}")

    # Generate records
    records = generate(DAILY_LOGS_DIR, user_id=USER_ID, seed=SEED)

    # Summary
    bad2_irs = [r["inflammation_risk_score"] for r in records if records.index(r) >= 16]
    bad2_cri = [r["circadian_regularity_index"] for r in records if records.index(r) >= 16]
    bad2_neuro = [r["neurological_stress_proxy"] for r in records if records.index(r) >= 16]
    last7_fog = sum(1 for r in records[-7:] if r.get("cognitive_state") == "brain_fog")
    last14_debt = [r["cumulative_debt_7d"] for r in records[-14:]]
    last14_high = sum(1 for r in records[-14:] if r.get("estimated_glucose_spike") == "high")

    print(f"\n[synthetic] 30 records written to {DAILY_LOGS_DIR}")
    print(f"  Misclassification days: {sorted(_MISCLASSIFICATIONS.keys())}")
    print(f"  Last 7 days brain_fog: {last7_fog}/7  (need >=5)")
    print(f"  Last 14 days cumulative_debt_7d min: {min(last14_debt):.1f}h  (need >10)")
    print(f"  Last 14 days 'high' glucose spikes: {last14_high}/14  (need >=9)")
    print(f"  Bad week 2 IRS range: [{min(bad2_irs):.2f}, {max(bad2_irs):.2f}]  (need all >0.6)")
    print(f"  Bad week 2 CRI range: [{min(bad2_cri):.2f}, {max(bad2_cri):.2f}]  (need all <0.4)")
    print(f"  Bad week 2 neuro range: [{min(bad2_neuro):.2f}, {max(bad2_neuro):.2f}]  (need last 7 all >0.7)")

    # Verify stages 7-10
    _run_verification(records, USER_ID, skip_groq=True)
