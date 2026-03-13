"""Flatten a nested DailyLog dict into the flat record format expected by Stages 7/8/9.

Stages 7, 8, and 9 were written against a flat daily record where all fields
live at the top level (e.g. ``fiber_g``, ``mood_score``).  With the new nested
schema each day's data is split across sub-dicts
(``daily_totals``, ``daily_mood_summary``, ``daily_gut``, ``sleep``,
``digestion``, ``meals``).

``extract_flat_record`` bridges the two representations:
  - If the nested sub-dicts are present their values take priority.
  - If they are absent (old flat records, unit-test fixtures) the function falls
    back to reading the key directly from the top-level dict.

This means all existing Stage 7/8/9 unit tests — which pass flat dicts to
``run()`` — continue to work without any modification.
"""

from __future__ import annotations


# Worst glycemic-load ranking used to pick the daily "worst" across meals.
_GL_PRIORITY: dict[str, int] = {"high": 2, "medium": 1, "low": 0, "unknown": -1}

# Worst glucose-spike ranking used to pick the daily "worst" across meals.
_SPIKE_PRIORITY: dict[str, int] = {"high": 2, "moderate": 1, "mild": 0}


def extract_flat_record(daily_log: dict) -> dict:
    """Convert a DailyLog (nested or flat) into the flat format used by Stages 7-9.

    Mapping applied:
      daily_totals.fiber_g              → fiber_g
      daily_totals.tryptophan_mg        → tryptophan_mg
      daily_totals.carbs_g              → carbohydrates_g  (stage3/7 key)
      daily_mood_summary.avg_mood_score → mood_score
      daily_mood_summary.dominant_*     → cognitive_state
      daily_gut.*                       → microbiome_diversity_index, etc.
      sleep.*                           → sleep_hours, sleep_quality, etc.
      digestion.fermented_food_today    → fermented_food_today / fermented_food_consumed
      meals[].stage5.estimated_glucose_spike → estimated_glucose_spike (worst)
      meals[].stage2.totals.glycemic_load    → glycemic_load (worst)

    Flat fallbacks (for old records / test fixtures):
      If a nested sub-dict is absent, the function reads the key directly from
      ``daily_log``.  This keeps all existing unit tests passing unchanged.

    Args:
        daily_log: A DailyLog dict (nested or flat).

    Returns:
        A flat dict suitable for Stages 7, 8, and 9.
    """
    dt = daily_log.get("daily_totals") or {}
    dm = daily_log.get("daily_mood_summary") or {}
    dg = daily_log.get("daily_gut") or {}
    sl = daily_log.get("sleep") or {}
    dig = daily_log.get("digestion") or {}
    meals = daily_log.get("meals") or []

    def _n(nested_val, flat_key):
        """Return nested_val if not None, else fall back to daily_log[flat_key]."""
        return nested_val if nested_val is not None else daily_log.get(flat_key)

    # ── Worst glycemic_load across meals ──────────────────────────────────────
    glycemic_load: str | None = None
    worst_gl_p = -2
    for meal in meals:
        s2 = meal.get("stage2") or {}
        mt = s2.get("totals") or {}
        gl = str(mt.get("glycemic_load", "")).lower()
        if gl and _GL_PRIORITY.get(gl, -2) > worst_gl_p:
            worst_gl_p = _GL_PRIORITY[gl]
            glycemic_load = gl
    if glycemic_load is None:
        glycemic_load = daily_log.get("glycemic_load")

    # ── Worst estimated_glucose_spike across meals ─────────────────────────────
    glucose_spike: str | None = None
    worst_spike_p = -2
    for meal in meals:
        s5 = meal.get("stage5") or {}
        spike = str(s5.get("estimated_glucose_spike", "")).lower()
        if spike and _SPIKE_PRIORITY.get(spike, -2) > worst_spike_p:
            worst_spike_p = _SPIKE_PRIORITY[spike]
            glucose_spike = spike
    if glucose_spike is None:
        glucose_spike = daily_log.get("estimated_glucose_spike")

    # ── Build flat result (preserve all top-level keys not in nested sub-dicts)
    _nested_keys = {"daily_totals", "daily_mood_summary", "daily_gut", "sleep", "digestion", "meals"}
    result = {k: v for k, v in daily_log.items() if k not in _nested_keys}

    # Override with nested values (if they exist)
    result.update({
        # Nutrition
        "fiber_g":                     _n(dt.get("fiber_g"),           "fiber_g"),
        "tryptophan_mg":               _n(dt.get("tryptophan_mg"),     "tryptophan_mg"),
        "carbohydrates_g":             _n(dt.get("carbs_g") or dt.get("carbohydrates_g"), "carbohydrates_g"),
        "fat_g":                       _n(dt.get("fat_g"),             "fat_g"),
        "calories_kcal":               _n(dt.get("calories_kcal"),     "calories_kcal"),
        # Mood
        "mood_score":                  _n(dm.get("avg_mood_score"),    "mood_score"),
        "cognitive_state":             _n(dm.get("dominant_cognitive_state"), "cognitive_state"),
        # Gut
        "microbiome_diversity_index":  _n(dg.get("microbiome_diversity_index"),  "microbiome_diversity_index"),
        "inflammation_risk_score":     _n(dg.get("inflammation_risk_score"),     "inflammation_risk_score"),
        "digestion_stability_score":   _n(dg.get("digestion_stability_score"),   "digestion_stability_score"),
        # Sleep
        "sleep_hours":                 _n(sl.get("sleep_hours"),                 "sleep_hours"),
        "sleep_quality":               _n(sl.get("sleep_quality"),               "sleep_quality"),
        "neurological_stress_proxy":   _n(sl.get("neurological_stress_proxy"),   "neurological_stress_proxy"),
        "circadian_regularity_index":  _n(sl.get("circadian_regularity_index"),  "circadian_regularity_index"),
        "cumulative_debt_7d":          _n(sl.get("cumulative_debt_7d"),          "cumulative_debt_7d"),
        "cumulative_sleep_debt":       _n(
            sl.get("cumulative_debt_7d") if sl.get("cumulative_debt_7d") is not None
            else sl.get("cumulative_sleep_debt"),
            "cumulative_sleep_debt",
        ),
        # Digestion
        "fermented_food_today":        _n(dig.get("fermented_food_today"),  "fermented_food_today"),
        "fermented_food_consumed":     _n(dig.get("fermented_food_today"),  "fermented_food_consumed"),
        # Meal-level aggregates
        "glycemic_load":               glycemic_load,
        "estimated_glucose_spike":     glucose_spike,
    })

    return result
