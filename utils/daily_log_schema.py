"""Nested daily log schema definitions and scaffold factory.

Each day's data is stored as a single JSON file with this top-level structure:
  {date, meals:[], digestion:{}, sleep:{}, daily_totals:{},
   daily_gut:{}, daily_mood_summary:{}}

Meals is a list of MealEntry dicts, each containing sub-dicts produced by
Stages 1, 2, 4, and 5.
"""

from typing import TypedDict


# ─── Meal sub-dicts ───────────────────────────────────────────────────────────

class Stage1Meal(TypedDict):
    food_items: list[str]
    en_pred: str
    confidence: float
    source: str      # "groq" | "efficientnet" | "stub"
    timestamp: str


class NutritionTotals(TypedDict):
    calories_kcal: float
    carbs_g: float
    protein_g: float
    fat_g: float
    fiber_g: float
    glycemic_load: str    # "low" | "medium" | "high" | "unknown"
    tryptophan_mg: float
    omega3_mg: float
    iron_mg: float
    magnesium_mg: float
    b6_mg: float
    b12_mcg: float
    zinc_mg: float


class Stage2Meal(TypedDict):
    items: list[dict]        # list of NutritionRecord dicts from stage2
    totals: NutritionTotals


class Stage4Meal(TypedDict):
    mood_score: int           # -2..+2
    mood_label: str
    cognitive_state: str      # sharp | clear | mild_fog | brain_fog | drowsy
    cognitive_penalty: float  # 0.0 | -0.5 | -1.0 | -1.5
    energy_level: str         # very_low | low | moderate | high
    anxiety_level: str        # none | mild | moderate | high
    emoji_used: str
    tryptophan_context_mg: float
    hours_since_meal: float


class Stage5Meal(TypedDict):
    estimated_glucose_spike: str  # mild | moderate | high
    spike_delta_mg_dl: float
    fiber_attenuation_factor: float
    energy_crash_probability: float
    late_meal_penalty_applied: bool
    insulin_demand_proxy: str     # low | moderate | high


class MealEntry(TypedDict):
    meal_id: str              # "breakfast" | "lunch" | "dinner" | "snack"
    meal_time: str            # "HH:MM" approximate serving time
    stage1: Stage1Meal
    stage2: Stage2Meal
    stage4: Stage4Meal
    stage5: Stage5Meal


# ─── Daily section dicts ──────────────────────────────────────────────────────

class DigestInput(TypedDict):
    bloating: str             # none | mild | moderate | severe
    stool_quality: int        # 1–7 Bristol scale
    fermented_food_today: bool
    gas_discomfort: str       # none | mild | moderate | severe
    digestion_quality: str    # poor | fair | good | excellent


class SleepInput(TypedDict):
    sleep_onset: str          # "HH:MM"
    wake_time: str            # "HH:MM"
    sleep_hours: float
    sleep_debt: float         # max(0, 7.5 - sleep_hours)
    cumulative_debt_7d: float
    circadian_regularity_index: float   # [0.0, 1.0]
    neurological_stress_proxy: float    # [0.0, 1.0]
    sleep_quality: str        # poor | fair | good | excellent
    sleep_stability: str      # low | moderate | high
    night_awakenings: int
    caffeine_after_14h: bool
    screen_before_bed_min: int


class DailyTotals(TypedDict):
    """Sum of Stage 2 nutrition across all meals for the day."""
    calories_kcal: float
    carbs_g: float
    protein_g: float
    fat_g: float
    fiber_g: float
    glycemic_load: str        # worst (highest) GL across all meals
    tryptophan_mg: float
    omega3_mg: float
    iron_mg: float
    magnesium_mg: float
    b6_mg: float
    b12_mcg: float
    zinc_mg: float


class DailyGut(TypedDict):
    """Stage 3 output computed from daily_totals + digestion."""
    microbiome_diversity_index: float
    inflammation_risk_score: float
    inflammation_risk_level: str      # low | moderate | high
    digestion_stability_score: float
    scfa_production_proxy: str        # low | moderate | high


class DailyMoodSummary(TypedDict):
    """Aggregated across all meal-level Stage 4 readings."""
    avg_mood_score: float
    min_mood_score: int
    max_mood_score: int
    dominant_cognitive_state: str


class DailyLog(TypedDict):
    date: str                         # "YYYY-MM-DD"
    meals: list[MealEntry]
    digestion: DigestInput
    sleep: SleepInput
    daily_totals: DailyTotals
    daily_gut: DailyGut
    daily_mood_summary: DailyMoodSummary
    diet_type: str                    # "vegetarian" | "vegan" | "omnivore"


# ─── Empty scaffold factory ───────────────────────────────────────────────────

_EMPTY_TOTALS: DailyTotals = {
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

_EMPTY_GUT: DailyGut = {
    "microbiome_diversity_index": 0.0,
    "inflammation_risk_score": 0.5,
    "inflammation_risk_level": "moderate",
    "digestion_stability_score": 0.5,
    "scfa_production_proxy": "low",
}

_EMPTY_MOOD_SUMMARY: DailyMoodSummary = {
    "avg_mood_score": 0.0,
    "min_mood_score": 0,
    "max_mood_score": 0,
    "dominant_cognitive_state": "clear",
}


def empty_daily_log(date_str: str) -> DailyLog:
    """Return a fully-scaffolded empty daily log for the given date.

    Args:
        date_str: ISO date string "YYYY-MM-DD".

    Returns:
        DailyLog dict with empty meals list and zero/default values in all
        sections. Callers should populate meals, digestion, and sleep, then
        call recompute_daily_totals / recompute_daily_gut to fill aggregates.
    """
    return {
        "date": date_str,
        "meals": [],
        "digestion": {
            "bloating": "none",
            "stool_quality": 4,
            "fermented_food_today": False,
            "gas_discomfort": "none",
            "digestion_quality": "good",
        },
        "sleep": {
            "sleep_onset": "23:00",
            "wake_time": "07:00",
            "sleep_hours": 0.0,
            "sleep_debt": 0.0,
            "cumulative_debt_7d": 0.0,
            "circadian_regularity_index": 0.0,
            "neurological_stress_proxy": 0.0,
            "sleep_quality": "fair",
            "sleep_stability": "moderate",
            "night_awakenings": 0,
            "caffeine_after_14h": False,
            "screen_before_bed_min": 0,
        },
        "daily_totals": dict(_EMPTY_TOTALS),
        "daily_gut": dict(_EMPTY_GUT),
        "daily_mood_summary": dict(_EMPTY_MOOD_SUMMARY),
        "diet_type": "vegetarian",
    }
