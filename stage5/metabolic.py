"""Stage 5: Metabolic Response Approximation.

Estimates post-meal metabolic impact using Glycemic Load framework
(Jenkins et al., 1981), fiber attenuation, and late-meal penalties
(Garaulet et al., 2013).
"""

from datetime import datetime, timezone
from typing import TypedDict

from utils.validators import validate_stage5_input


# ─── GL → spike mapping ──────────────────────────────────────────────────────

_GL_SPIKE: dict[str, tuple[str, int]] = {
    "low":    ("mild", 25),
    "medium": ("moderate", 45),
    "high":   ("high", 75),
}

_GL_INSULIN: dict[str, str] = {
    "low": "low",
    "medium": "moderate",
    "high": "high",
}


class MetabolicOutput(TypedDict):
    estimated_glucose_spike: str
    spike_delta_mg_dl: float
    fiber_attenuation_factor: float
    energy_crash_probability: float
    late_meal_penalty_applied: bool
    insulin_demand_proxy: str
    timestamp: str


def _classify_gl(gl_value) -> str:
    """Classify a glycemic load value into low/medium/high category."""
    if isinstance(gl_value, str):
        val = gl_value.lower().strip()
        if val in ("low", "medium", "high"):
            return val
    gl_num = float(gl_value)
    if gl_num <= 10:
        return "low"
    if gl_num <= 19:
        return "medium"
    return "high"


def _fiber_attenuation(fiber_g: float) -> float:
    """Fiber attenuation factor: max 30% reduction (floor 0.7)."""
    return max(0.7, 1.0 - (fiber_g / 40.0) * 0.3)


def _energy_crash(gl_category: str, fiber_g: float) -> float:
    if gl_category == "high" and fiber_g < 5:
        return 0.75
    if gl_category == "medium" and fiber_g < 10:
        return 0.45
    return 0.15


def _is_late_meal(meal_timestamp: str) -> bool:
    """Return True if meal is after 21:00 local time (parsed from timestamp)."""
    ts = meal_timestamp.strip()
    try:
        dt = datetime.fromisoformat(ts)
    except ValueError:
        if ts.endswith("Z"):
            dt = datetime.fromisoformat(ts[:-1] + "+00:00")
        else:
            raise
    return dt.hour >= 21


# ─── Public API ───────────────────────────────────────────────────────────────

def run(stage2_output: dict, meal_timestamp: str, stage0_output: dict) -> MetabolicOutput:
    """
    Estimate post-meal metabolic response from nutrition and timing.

    Args:
        stage2_output: Stage 2 output dict with totals containing
                       glycemic_load, fiber_g, carbohydrates_g, fat_g.
        meal_timestamp: ISO-8601 timestamp of the meal.
        stage0_output: Stage 0 user profile (for baseline context).

    Returns:
        MetabolicOutput dict with glucose spike estimate, fiber attenuation,
        energy crash probability, and late-meal penalty info.

    Raises:
        ValueError: If stage2_output is missing required nutrition fields.
    """
    errors = validate_stage5_input(stage2_output)
    if errors:
        raise ValueError(f"Invalid Stage 5 input: {errors}")

    totals = stage2_output.get("totals", stage2_output)

    gl_raw = totals["glycemic_load"]
    gl_category = _classify_gl(gl_raw)
    fiber_g = float(totals.get("fiber_g", 0.0))

    spike_label, base_delta = _GL_SPIKE[gl_category]
    attenuation = _fiber_attenuation(fiber_g)
    adjusted_delta = round(base_delta * attenuation, 1)

    crash = _energy_crash(gl_category, fiber_g)

    late = _is_late_meal(meal_timestamp)
    if late:
        adjusted_delta = round(adjusted_delta * 1.20, 1)
        crash = min(1.0, crash + 0.10)

    return {
        "estimated_glucose_spike": spike_label,
        "spike_delta_mg_dl": adjusted_delta,
        "fiber_attenuation_factor": round(attenuation, 4),
        "energy_crash_probability": round(crash, 2),
        "late_meal_penalty_applied": late,
        "insulin_demand_proxy": _GL_INSULIN[gl_category],
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
