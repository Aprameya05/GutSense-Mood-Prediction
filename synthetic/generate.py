"""Synthetic Data Generator — Stage SIM (nested schema).

Generates 30 days of realistic vegetarian-Indian-diet data in the new nested
DailyLog schema.  Each day contains 3 MealEntry dicts (breakfast / lunch /
dinner), each with stage1/2/4/5 sub-dicts.  Daily aggregates
(daily_totals, daily_gut, daily_mood_summary) are computed from the meal
sub-dicts.  Sleep and digestion are nested sections.

Follows SPEC.md "Synthetic Data Simulation" rules:
  - 90 meals (3/day), 90 mood logs, 90 digestion reports, 30 sleep logs
  - 1 good week (high fiber, fermented foods, consistent sleep)
  - Bad week 1 (days 7-13): high sugar, late meals, poor sleep
  - Bad week 2 extended (days 16-29, 14 consecutive): very bad
  - 4 deliberate food misclassifications (in lunch meal stage1)
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
import sys
from datetime import date, timedelta
from pathlib import Path

_ROOT = Path(__file__).resolve().parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from dotenv import load_dotenv
load_dotenv()

from utils.config import DAILY_LOGS_DIR, USER_PROFILES_DIR
from utils.storage import ensure_dir, write_json


# ─── Meal pools ───────────────────────────────────────────────────────────────

_BREAKFAST_GOOD = ["idli", "pongal", "uttapam", "upma", "poha"]
_BREAKFAST_BAD  = ["white bread", "poha", "aloo paratha"]

_LUNCH_GOOD = [
    ["masala dosa", "sambar", "coconut chutney"],
    ["dal", "roti", "aloo sabzi"],
    ["rajma", "rice"],
    ["chole", "roti"],
    ["khichdi"],
]
_LUNCH_BAD1 = [["biryani"], ["bhatura", "chole"], ["white rice", "pickle"], ["aloo sabzi", "rice"]]
_LUNCH_BAD2 = [["biryani"], ["white rice", "pickle"], ["bhatura"], ["aloo sabzi", "rice"]]

_DINNER_GOOD = ["dal", "roti", "sabzi", "rice", "sambar"]
_DINNER_BAD  = ["white rice", "pickle", "bhatura", "poha"]

# Misclassification: wrong label stored in stage1.food_items, correct in correct_food_items
_MISCLASSIFICATIONS: dict[int, dict] = {
    5:  {"food_items": ["fried_rice"],  "correct_food_items": ["biryani"]},
    12: {"food_items": ["plain dosa"],  "correct_food_items": ["uttapam"]},
    19: {"food_items": ["sambar rice"], "correct_food_items": ["curd rice"]},
    25: {"food_items": ["dal fry"],     "correct_food_items": ["rajma masala"]},
}


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _clamp(v: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, v))


def _gauss(mu: float, sigma: float, lo: float, hi: float) -> float:
    return _clamp(random.gauss(mu, sigma), lo, hi)


def _sleep_onset_str(base_hour: int, base_min: int, jitter_min: int) -> str:
    total = base_hour * 60 + base_min + random.randint(-jitter_min, jitter_min)
    total = total % 1440
    return f"{total // 60:02d}:{total % 60:02d}"


def _bad2_sleep_onset() -> str:
    choices = [
        "22:00", "22:30", "23:45", "00:30", "01:00",
        "01:30", "02:00", "02:30", "03:00", "03:30", "04:00",
    ]
    return random.choice(choices)


def _split_nutrition(full: dict, frac: float) -> dict:
    """Scale numeric nutrition fields by frac; keep glycemic_load string as-is."""
    _NUMERIC = [
        "calories_kcal", "carbs_g", "protein_g", "fat_g", "fiber_g",
        "tryptophan_mg", "omega3_mg", "iron_mg", "magnesium_mg",
        "b6_mg", "b12_mcg", "zinc_mg",
    ]
    out = {k: round(full.get(k, 0.0) * frac, 4) for k in _NUMERIC}
    out["glycemic_load"] = full.get("glycemic_load", "unknown")
    return out


# ─── Per-day record builder ────────────────────────────────────────────────────

def _make_record(i: int, day: date, prev_debts: list[float]) -> tuple[dict, float]:
    """Build one DailyLog record in nested schema."""
    is_good  = i <= 6
    is_bad1  = 7 <= i <= 13
    is_trans = 14 <= i <= 15
    is_bad2  = i >= 16
    is_last7 = i >= 23

    # ── Misclassification ────────────────────────────────────────────────────
    if i in _MISCLASSIFICATIONS:
        mis = _MISCLASSIFICATIONS[i]
        lunch_food_items = mis["food_items"]
        misclassification_flag = True
        correct_food_items = mis["correct_food_items"]
    else:
        misclassification_flag = False
        correct_food_items = None
        if is_good:
            lunch_food_items = random.choice(_LUNCH_GOOD)
        elif is_bad1:
            lunch_food_items = random.choice(_LUNCH_BAD1)
        else:
            lunch_food_items = random.choice(_LUNCH_BAD2)

    # ── Nutrition totals (daily) ──────────────────────────────────────────────
    if is_good:
        calories_kcal = _gauss(2100, 120, 1850, 2400)
        fiber_g       = _gauss(28,   3,   22,   36)
        tryptophan_mg = _gauss(220,  30,  160,  280)
        fat_g         = _gauss(55,   8,   38,   72)
        carbs_g       = _gauss(280,  25,  220,  340)
        protein_g     = _gauss(70,   8,   55,   85)
    elif is_bad1:
        calories_kcal = _gauss(1900, 150, 1600, 2250)
        fiber_g       = _gauss(7,    1.5, 4,    10)
        tryptophan_mg = _gauss(160,  25,  100,  210)
        fat_g         = _gauss(75,   10,  55,   95)
        carbs_g       = _gauss(380,  30,  310,  440)
        protein_g     = _gauss(60,   8,   45,   75)
    elif is_trans:
        calories_kcal = _gauss(1950, 130, 1650, 2250)
        fiber_g       = _gauss(9,    1.5, 5,    13)
        tryptophan_mg = _gauss(175,  25,  120,  225)
        fat_g         = _gauss(70,   10,  50,   90)
        carbs_g       = _gauss(360,  30,  290,  420)
        protein_g     = _gauss(62,   8,   48,   77)
    else:  # bad2
        calories_kcal = _gauss(1850, 150, 1550, 2150)
        fiber_g       = _gauss(6,    1.5, 3,    9)
        tryptophan_mg = _gauss(145,  20,  95,   190)
        fat_g         = _gauss(80,   10,  60,   100)
        carbs_g       = _gauss(400,  30,  340,  460)
        protein_g     = _gauss(58,   8,   42,   73)

    # Fixed micronutrients (vegetarian Indian diet estimates)
    omega3_mg   = _gauss(150 if is_good else 60, 20, 30, 300)
    iron_mg     = _gauss(11 if is_good else 8,   1.5, 5, 18)
    magnesium_mg = _gauss(290 if is_good else 200, 30, 120, 400)
    b6_mg       = _gauss(1.7 if is_good else 1.2, 0.2, 0.5, 3.0)
    b12_mcg     = 0.0   # vegetarian — no natural B12
    zinc_mg     = _gauss(8 if is_good else 6, 1.0, 3, 14)

    # ── Glycemic load (string for Stage 7 _GL_NUMERIC converter) ─────────────
    if is_good:
        gl_str = random.choice(["low", "low", "low", "medium"])
    elif is_bad1:
        gl_str = random.choice(["high", "high", "high", "high", "medium"])
    elif is_trans:
        gl_str = random.choice(["high", "high", "medium"])
    else:  # bad2
        gl_str = random.choice(["high", "high", "high", "high", "medium"])

    # ── Fermented food ────────────────────────────────────────────────────────
    if is_good:
        fermented = random.random() > 0.43
    elif is_bad1 or is_bad2 or is_trans:
        fermented = False
    else:
        fermented = random.random() > 0.7

    # ── Stage 3: Gut proxies (assigned directly) ──────────────────────────────
    if is_good:
        mdi      = _gauss(0.70, 0.04, 0.60, 0.80)
        irs      = _gauss(0.28, 0.04, 0.20, 0.40)
        dss      = _gauss(0.80, 0.05, 0.68, 0.92)
        bloating = random.choice(["none", "none", "none", "mild"])
        stool_q  = random.choice([3, 3, 4, 4])
        gas_disc = "none"
    elif is_bad1:
        mdi      = _gauss(0.34, 0.04, 0.24, 0.44)
        irs      = _gauss(0.62, 0.04, 0.52, 0.70)
        dss      = _gauss(0.52, 0.06, 0.40, 0.64)
        bloating = random.choice(["mild", "moderate", "moderate"])
        stool_q  = random.choice([5, 5, 6, 6])
        gas_disc = "mild"
    elif is_trans:
        mdi      = _gauss(0.38, 0.04, 0.28, 0.48)
        irs      = _gauss(0.62, 0.04, 0.54, 0.70)
        dss      = _gauss(0.50, 0.05, 0.38, 0.62)
        bloating = random.choice(["mild", "moderate"])
        stool_q  = random.choice([5, 6, 6])
        gas_disc = "mild"
    else:  # bad2
        mdi      = _gauss(0.28, 0.07, 0.12, 0.44)
        irs      = _gauss(0.73, 0.17, 0.62, 0.97)
        dss      = _gauss(0.44, 0.09, 0.26, 0.62)
        bloating = random.choice(["moderate", "moderate", "severe"])
        stool_q  = random.choice([6, 6, 7])
        gas_disc = "moderate"

    irs = _clamp(irs, 0.0, 1.0)
    mdi = _clamp(mdi, 0.0, 1.0)
    dss = _clamp(dss, 0.0, 1.0)

    # ── Stage 4: Mood (same for all 3 meals) ──────────────────────────────────
    if is_good:
        mood_score       = random.choice([1, 2, 2])
        mood_label       = "happy" if mood_score == 1 else "very_happy"
        cognitive_state  = random.choice(["sharp", "clear", "clear"])
        cognitive_penalty = 0.0
        energy_level     = random.choice(["moderate", "high"])
        anxiety_level    = "none"
        emoji            = "\U0001f604" if mood_score == 2 else "\U0001f642"
    elif is_bad1:
        mood_score       = -1
        mood_label       = "worried"
        bad1_fog_days    = {7, 9, 10, 11, 13}
        cognitive_state  = "brain_fog" if i in bad1_fog_days else "mild_fog"
        cognitive_penalty = -1.5 if cognitive_state == "brain_fog" else -0.5
        energy_level     = "low"
        anxiety_level    = "moderate"
        emoji            = "\U0001f61f"
    elif is_trans:
        mood_score       = -1
        mood_label       = "worried"
        cognitive_state  = "brain_fog"
        cognitive_penalty = -1.5
        energy_level     = "low"
        anxiety_level    = "moderate"
        emoji            = "\U0001f61f"
    else:  # bad2
        mood_score       = -2
        mood_label       = "sad"
        if is_last7 or i in {16, 17, 19, 20, 21, 22}:
            cognitive_state   = "brain_fog"
            cognitive_penalty = -1.5
        else:  # day 18
            cognitive_state   = "mild_fog"
            cognitive_penalty = -0.5
        energy_level     = "very_low"
        anxiety_level    = "high"
        emoji            = "\U0001f614"

    # ── Stage 5: Metabolic ────────────────────────────────────────────────────
    if is_good:
        glucose_spike = random.choice(["mild", "mild", "moderate"])
        crash_prob    = _gauss(0.18, 0.05, 0.08, 0.30)
        fiber_att     = _gauss(0.80, 0.03, 0.72, 0.90)
        late_meal     = False
        insulin_proxy = "low" if glucose_spike == "mild" else "moderate"
    elif is_bad1:
        high_spike_days = {7, 8, 10, 11, 13}
        glucose_spike = "high" if i in high_spike_days else "moderate"
        crash_prob    = _gauss(0.62, 0.06, 0.48, 0.76)
        fiber_att     = _gauss(0.76, 0.03, 0.70, 0.82)
        late_meal     = i in {7, 9, 10, 11, 12}
        insulin_proxy = "high" if glucose_spike == "high" else "moderate"
    elif is_trans:
        glucose_spike = "high"
        crash_prob    = _gauss(0.65, 0.06, 0.50, 0.78)
        fiber_att     = _gauss(0.75, 0.03, 0.70, 0.82)
        late_meal     = True
        insulin_proxy = "high"
    else:  # bad2
        high_spike_days_bad2 = {16, 17, 18, 19, 20, 22, 23, 25, 27, 29}
        glucose_spike = "high" if i in high_spike_days_bad2 else "moderate"
        crash_prob    = _gauss(0.70, 0.06, 0.55, 0.84)
        fiber_att     = _gauss(0.74, 0.03, 0.70, 0.80)
        late_meal     = True
        insulin_proxy = "high" if glucose_spike == "high" else "moderate"

    # ── Stage 6: Sleep ────────────────────────────────────────────────────────
    if is_good:
        sleep_h      = _gauss(7.5, 0.25, 7.0, 8.2)
        sleep_onset  = _sleep_onset_str(22, 55, 15)
        cri          = _gauss(0.83, 0.04, 0.72, 0.93)
        neuro_stress = _gauss(0.28, 0.04, 0.20, 0.38)
        sleep_quality = random.choice(["good", "good", "excellent"])
    elif is_bad1:
        sleep_h      = _gauss(5.5, 0.30, 4.8, 6.2)
        sleep_onset  = _sleep_onset_str(0, 30, 45)
        cri          = _gauss(0.48, 0.05, 0.36, 0.58)
        neuro_stress = _gauss(0.62, 0.04, 0.52, 0.72)
        sleep_quality = random.choice(["poor", "fair"])
    elif is_trans:
        sleep_h      = _gauss(5.8, 0.30, 4.8, 6.5)
        sleep_onset  = _sleep_onset_str(0, 45, 45)
        cri          = _gauss(0.42, 0.05, 0.30, 0.52)
        neuro_stress = _gauss(0.65, 0.04, 0.54, 0.74)
        sleep_quality = "poor"
    else:  # bad2
        sleep_h      = _gauss(5.0, 0.35, 4.0, 5.8)
        sleep_onset  = _bad2_sleep_onset()
        cri          = _gauss(0.22, 0.05, 0.10, 0.35)
        if is_last7:
            neuro_stress = _gauss(0.82, 0.07, 0.72, 0.96)
        else:
            neuro_stress = _gauss(0.64, 0.18, 0.38, 0.92)
        sleep_quality = "poor"

    sleep_debt = max(0.0, round(7.5 - sleep_h, 2))
    all_debts  = prev_debts + [sleep_debt]
    cumulative_debt_7d = round(sum(all_debts[-7:]), 2)
    if is_bad2 and cumulative_debt_7d <= 10.0:
        cumulative_debt_7d = round(_gauss(14.0, 1.5, 11.0, 17.5), 2)

    sleep_stability = (
        "low"      if (sleep_debt > 2 or cri < 0.5) else
        "high"     if (sleep_debt < 1 and cri > 0.7) else
        "moderate"
    )

    # ── Build daily nutrition totals dict ─────────────────────────────────────
    daily_totals_full = {
        "calories_kcal": round(calories_kcal, 1),
        "carbs_g":       round(carbs_g, 1),
        "protein_g":     round(protein_g, 1),
        "fat_g":         round(fat_g, 1),
        "fiber_g":       round(fiber_g, 1),
        "glycemic_load": gl_str,
        "tryptophan_mg": round(tryptophan_mg, 1),
        "omega3_mg":     round(omega3_mg, 1),
        "iron_mg":       round(iron_mg, 1),
        "magnesium_mg":  round(magnesium_mg, 1),
        "b6_mg":         round(b6_mg, 2),
        "b12_mcg":       b12_mcg,
        "zinc_mg":       round(zinc_mg, 1),
    }

    # ── Build 3 meal entries ──────────────────────────────────────────────────
    meal_times = {
        "breakfast": ("07:30", 0.25),
        "lunch":     ("13:00", 0.40),
        "dinner":    ("19:30" if not late_meal else "21:30", 0.35),
    }

    breakfast_food = random.choice(_BREAKFAST_GOOD if is_good else _BREAKFAST_BAD)
    dinner_food    = random.choice(_DINNER_GOOD if is_good else _DINNER_BAD)

    stage4_base = {
        "mood_score":          mood_score,
        "mood_label":          mood_label,
        "cognitive_state":     cognitive_state,
        "cognitive_penalty":   cognitive_penalty,
        "energy_level":        energy_level,
        "anxiety_level":       anxiety_level,
        "emoji_used":          emoji,
        "hours_since_meal":    2.0,
    }

    def _make_meal(meal_id: str, meal_time: str, frac: float, food_items: list[str]) -> dict:
        s2_totals = _split_nutrition(daily_totals_full, frac)
        meal_fiber = s2_totals["fiber_g"]
        s5 = {
            "estimated_glucose_spike":  glucose_spike,
            "spike_delta_mg_dl":        round({"mild": 25, "moderate": 45, "high": 75}[glucose_spike] * fiber_att, 1),
            "fiber_attenuation_factor": round(fiber_att, 4),
            "energy_crash_probability": round(crash_prob, 2),
            "late_meal_penalty_applied": late_meal and meal_id == "dinner",
            "insulin_demand_proxy":     insulin_proxy,
        }
        s4 = dict(stage4_base)
        s4["tryptophan_context_mg"] = round(s2_totals.get("tryptophan_mg", 0.0), 2)
        return {
            "meal_id":   meal_id,
            "meal_time": meal_time,
            "stage1": {
                "food_items": food_items,
                "en_pred":    food_items[0] if food_items else "unknown",
                "confidence": round(_gauss(0.65, 0.10, 0.40, 0.90), 2),
                "source":     "synthetic",
                "timestamp":  f"{str(day)}T{meal_time}:00+00:00",
            },
            "stage2": {
                "items": [],
                "totals": s2_totals,
            },
            "stage4": s4,
            "stage5": s5,
        }

    breakfast_meal = _make_meal("breakfast", "07:30",  0.25, [breakfast_food])
    lunch_meal     = _make_meal("lunch",     "13:00",  0.40, lunch_food_items)
    dinner_time    = "21:30" if late_meal else "19:30"
    dinner_meal    = _make_meal("dinner",    dinner_time, 0.35, [dinner_food])

    if misclassification_flag:
        lunch_meal["misclassification_flag"] = True
        lunch_meal["correct_food_items"]     = correct_food_items

    meals = [breakfast_meal, lunch_meal, dinner_meal]

    # ── Assemble DailyLog ─────────────────────────────────────────────────────
    record: dict = {
        "date": str(day),
        "meals": meals,
        "digestion": {
            "bloating":             bloating,
            "stool_quality":        stool_q,
            "fermented_food_today": fermented,
            "gas_discomfort":       gas_disc,
            "digestion_quality":    "poor" if dss < 0.4 else ("fair" if dss < 0.6 else ("good" if dss < 0.8 else "excellent")),
        },
        "sleep": {
            "sleep_onset":               sleep_onset,
            "wake_time":                 "07:00",
            "sleep_hours":               round(sleep_h, 2),
            "sleep_debt":                sleep_debt,
            "cumulative_debt_7d":        cumulative_debt_7d,
            "circadian_regularity_index": round(cri, 4),
            "neurological_stress_proxy": round(neuro_stress, 4),
            "sleep_quality":             sleep_quality,
            "sleep_stability":           sleep_stability,
            "night_awakenings":          0 if is_good else random.randint(1, 3),
            "caffeine_after_14h":        not is_good,
            "screen_before_bed_min":     15 if is_good else random.randint(30, 90),
        },
        "daily_totals": daily_totals_full,
        "daily_gut": {
            "microbiome_diversity_index": round(mdi, 4),
            "inflammation_risk_score":    round(irs, 4),
            "inflammation_risk_level":    "high" if irs > 0.6 else ("moderate" if irs > 0.3 else "low"),
            "digestion_stability_score":  round(dss, 4),
            "scfa_production_proxy":      "high" if fiber_g > 25 else ("moderate" if fiber_g > 10 else "low"),
        },
        "daily_mood_summary": {
            "avg_mood_score":          float(mood_score),   # all 3 meals same
            "min_mood_score":          mood_score,
            "max_mood_score":          mood_score,
            "dominant_cognitive_state": cognitive_state,
        },
        # Top-level aliases for backward compatibility and Stage 7 correlation pairs
        "diet_type":               "vegetarian",
        "late_meal":               late_meal,
        "cognitive_penalty":       cognitive_penalty,
        "estimated_glucose_spike": glucose_spike,   # daily worst (same all meals)
    }

    if misclassification_flag:
        record["misclassification_flag"] = True
        record["correct_food_items"]     = correct_food_items

    return record, sleep_debt


# ─── Public API ────────────────────────────────────────────────────────────────

def generate(
    output_dir: Path,
    user_id: str = "synthetic_001",
    seed: int = 42,
    overwrite: bool = True,
    base_date: date | None = None,
) -> list[dict]:
    """Generate 30 days of synthetic nested DailyLog records.

    Args:
        output_dir: Directory to write YYYY-MM-DD.json files.
        user_id:    User identifier (metadata only; create profile separately).
        seed:       Random seed for reproducibility.
        overwrite:  If True, remove existing *.json files before writing.
        base_date:  Last day of the 30-day window (default: today).

    Returns:
        List of 30 DailyLog dicts in chronological order.
    """
    random.seed(seed)
    ensure_dir(output_dir)

    if overwrite:
        for f in Path(output_dir).glob("*.json"):
            f.unlink()

    today  = base_date or date.today()
    records: list[dict] = []
    prev_debts: list[float] = []

    for i in range(30):
        day = today - timedelta(days=29 - i)
        record, debt = _make_record(i, day, prev_debts)
        prev_debts.append(debt)
        write_json(Path(output_dir) / f"{str(day)}.json", record)
        records.append(record)

    return records


# ─── Verification helpers ──────────────────────────────────────────────────────

def _run_verification(records: list[dict], user_id: str, skip_groq: bool = True) -> None:
    """Run stages 7-10 on the generated records and print results."""
    from utils.config import BASELINES_DIR

    print("\n" + "=" * 60)
    print("SYNTHETIC DATA VERIFICATION -- Stages 7-10")
    print("=" * 60)

    # Stage 7 — pass nested records directly (run() flattens internally)
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

    # Stage 8 — loads nested records from DAILY_LOGS_DIR and flattens internally
    from stage8.baseline import run as stage8_run
    s8 = stage8_run(user_id)
    print(f"\n[Stage 8] Baselines computed: {s8['baseline_period_days']} days")
    print(f"          baseline_mood={s8['baseline_mood']:.2f}  baseline_sleep={s8['baseline_sleep_hours']:.1f}h")
    unstable = [k for k, v in s8.get("stability_details", {}).items() if not v.get("stable")]
    print(f"          Unstable metrics (CV>15%): {unstable or 'none'}")
    infl_cv  = s8.get("stability_details", {}).get("inflammation", {}).get("cv_percent", 0)
    neuro_cv = s8.get("stability_details", {}).get("neuro_stress",  {}).get("cv_percent", 0)
    print(f"          inflammation CV={infl_cv:.1f}%  neuro_stress CV={neuro_cv:.1f}%")
    if infl_cv > 15 and neuro_cv > 15:
        print("          [OK] Both correctly unstable")
    else:
        print("          [!!] One or both unexpectedly stable -- check bad-week values")

    # Stage 9 — pass nested records directly (run() flattens internally)
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

    from stage0.profile import run as stage0_run
    profile = stage0_run(USER_ID, {
        "age": 28, "sex": "male", "height_cm": 175.0, "weight_kg": 70.0,
        "diet_type": "vegetarian", "activity_level": "moderate",
        "sleep_schedule": "23:00-06:30", "supplements": [], "medications": [],
    })
    print(f"[synthetic] Profile: BMR={profile['bmr_kcal']} TDEE={profile['tdee_kcal']}")

    records = generate(DAILY_LOGS_DIR, user_id=USER_ID, seed=SEED)

    # Summary stats using nested structure
    bad2_irs   = [r["daily_gut"]["inflammation_risk_score"]       for r in records[16:]]
    bad2_cri   = [r["sleep"]["circadian_regularity_index"]        for r in records[16:]]
    bad2_neuro = [r["sleep"]["neurological_stress_proxy"]         for r in records[16:]]
    last7_fog  = sum(1 for r in records[-7:] if r["daily_mood_summary"].get("dominant_cognitive_state") == "brain_fog")
    last14_debt = [r["sleep"]["cumulative_debt_7d"]               for r in records[-14:]]
    last14_high = sum(1 for r in records[-14:] if r.get("estimated_glucose_spike") == "high")

    print(f"\n[synthetic] 30 records written to {DAILY_LOGS_DIR}")
    print(f"  Misclassification days: {sorted(_MISCLASSIFICATIONS.keys())}")
    print(f"  Last 7 days brain_fog: {last7_fog}/7  (need >=5)")
    print(f"  Last 14 days cumulative_debt_7d min: {min(last14_debt):.1f}h  (need >10)")
    print(f"  Last 14 days 'high' glucose spikes: {last14_high}/14  (need >=9)")
    print(f"  Bad week 2 IRS range: [{min(bad2_irs):.2f}, {max(bad2_irs):.2f}]  (need all >0.6)")
    print(f"  Bad week 2 CRI range: [{min(bad2_cri):.2f}, {max(bad2_cri):.2f}]  (need all <0.4)")
    print(f"  Bad week 2 neuro range: [{min(bad2_neuro):.2f}, {max(bad2_neuro):.2f}]  (need last 7 all >0.7)")

    _run_verification(records, USER_ID, skip_groq=True)
