"""Stage 9: Neurological Risk Pattern Detection.

Detects persistent multi-day patterns that may indicate early
neurological/cognitive risk. All outputs are informational, never diagnostic.

Risk signals and thresholds from:
  - Ocon, 2013 (brain fog)
  - Van Dongen et al., 2003 (sleep debt)
  - Aan het Rot et al., 2012 (mood instability)
  - Blaak et al., 2012 (metabolic dysregulation)
  - Furman et al., 2019 (inflammation)
  - Phillips et al., 2017 (circadian disruption)
"""

import statistics
from datetime import datetime, timezone
from typing import TypedDict

from utils.flatten import extract_flat_record


class RiskOutput(TypedDict):
    neurological_risk_level: str
    active_flags: list[str]
    risk_count: int
    recommendation: str
    professional_consult_suggested: bool
    timestamp: str


def _count_in_window(records: list[dict], key: str, predicate, window: int) -> int:
    """Count records in the last `window` entries matching predicate."""
    sliced = records[-window:] if len(records) >= window else records
    return sum(1 for r in sliced if predicate(r.get(key)))


def _consecutive_days(records: list[dict], key: str, predicate) -> int:
    """Count max consecutive days (from end) where predicate holds."""
    count = 0
    for r in reversed(records):
        if predicate(r.get(key)):
            count += 1
        else:
            break
    return count


def _check_persistent_brain_fog(records: list[dict]) -> bool:
    """cognitive_state == brain_fog on >= 5 of last 7 days."""
    return _count_in_window(
        records, "cognitive_state",
        lambda v: v == "brain_fog", 7
    ) >= 5


def _check_chronic_sleep_debt(records: list[dict]) -> bool:
    """cumulative_debt_7d > 10 for 2+ consecutive weeks (14 days)."""
    if len(records) < 14:
        return False
    last_14 = records[-14:]
    return all(
        float(r.get("cumulative_debt_7d", 0)) > 10
        for r in last_14
    )


def _check_mood_instability(records: list[dict]) -> bool:
    """mood_score std_dev > 2.5 over 7d, sustained 14+ days."""
    if len(records) < 14:
        return False
    # Check in sliding 7-day windows across the last 14 days
    last_14 = records[-14:]
    for i in range(len(last_14) - 6):
        window = last_14[i:i + 7]
        scores = [float(r.get("mood_score", 0)) for r in window if r.get("mood_score") is not None]
        if len(scores) < 3:
            return False
        if statistics.stdev(scores) <= 2.5:
            return False
    return True


def _check_metabolic_dysregulation(records: list[dict]) -> bool:
    """glucose_spike == high >= 60% of meals over 14+ days."""
    if len(records) < 14:
        return False
    last_14 = records[-14:]
    spikes = [r.get("estimated_glucose_spike") for r in last_14]
    spikes = [s for s in spikes if s is not None]
    if not spikes:
        return False
    high_pct = sum(1 for s in spikes if s == "high") / len(spikes)
    return high_pct >= 0.60


def _check_inflammation_persistence(records: list[dict]) -> bool:
    """IRS > 0.6 for 14+ consecutive days."""
    return _consecutive_days(
        records, "inflammation_risk_score",
        lambda v: v is not None and float(v) > 0.6
    ) >= 14


def _check_circadian_disruption(records: list[dict]) -> bool:
    """CRI < 0.4 for 14+ days."""
    return _consecutive_days(
        records, "circadian_regularity_index",
        lambda v: v is not None and float(v) < 0.4
    ) >= 14


def _check_combined_neuro_stress(records: list[dict]) -> bool:
    """neuro_stress > 0.7 for 7+ consecutive days."""
    return _consecutive_days(
        records, "neurological_stress_proxy",
        lambda v: v is not None and float(v) > 0.7
    ) >= 7


def _check_b12_deficiency(records: list[dict], baselines: dict) -> bool:
    """Vegetarian + cognitive decline trend over 21+ days."""
    diet = baselines.get("diet_type", "")
    if diet != "vegetarian":
        return False
    if len(records) < 21:
        return False
    last_21 = records[-21:]
    cog_scores = [
        float(r.get("mood_score", 0)) + float(r.get("cognitive_penalty", 0))
        for r in last_21 if r.get("mood_score") is not None
    ]
    if len(cog_scores) < 10:
        return False
    first_half = cog_scores[:len(cog_scores) // 2]
    second_half = cog_scores[len(cog_scores) // 2:]
    return (sum(second_half) / len(second_half)) < (sum(first_half) / len(first_half)) - 0.5


def _risk_level(count: int) -> str:
    if count == 0:
        return "none"
    if count <= 2:
        return "mild"
    if count <= 4:
        return "moderate"
    return "elevated"


_RECOMMENDATIONS: dict[str, str] = {
    "none": "All indicators within normal ranges. Keep up the current routine.",
    "mild": "Minor patterns detected. Consider adjusting sleep schedule or diet.",
    "moderate": "Multiple risk patterns observed. Review sleep, diet, and stress factors.",
    "elevated": "Significant risk patterns detected. Professional consultation recommended.",
}


# ─── Public API ───────────────────────────────────────────────────────────────

def run(daily_records: list[dict], baselines: dict) -> RiskOutput:
    """
    Detect neurological risk patterns from accumulated daily records.

    Args:
        daily_records: List of daily log dicts (ideally 30+ days).
        baselines: User baseline dict (from Stage 8) or user profile.

    Returns:
        RiskOutput with risk level, active flags, and recommendations.
    """
    daily_records = [extract_flat_record(r) for r in daily_records]
    flags: list[str] = []

    if _check_persistent_brain_fog(daily_records):
        flags.append("persistent_brain_fog")

    if _check_chronic_sleep_debt(daily_records):
        flags.append("chronic_sleep_debt")

    if _check_mood_instability(daily_records):
        flags.append("mood_instability")

    if _check_metabolic_dysregulation(daily_records):
        flags.append("metabolic_dysregulation")

    if _check_inflammation_persistence(daily_records):
        flags.append("inflammation_persistence")

    if _check_circadian_disruption(daily_records):
        flags.append("circadian_disruption")

    if _check_combined_neuro_stress(daily_records):
        flags.append("combined_neuro_stress")

    if _check_b12_deficiency(daily_records, baselines):
        flags.append("b12_deficiency_signal")

    count = len(flags)
    level = _risk_level(count)

    return {
        "neurological_risk_level": level,
        "active_flags": flags,
        "risk_count": count,
        "recommendation": _RECOMMENDATIONS[level],
        "professional_consult_suggested": level == "elevated",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
