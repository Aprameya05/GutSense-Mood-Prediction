"""Stage 6: Sleep & Physiological Indicators.

Quantifies sleep quality, circadian regularity, and neurological stress
proxies based on Pittsburgh Sleep Quality Index (Buysse et al., 1989)
and glymphatic clearance research (Xie et al., 2013).
"""

import math
from datetime import datetime, timezone
from typing import TypedDict

from utils.validators import validate_stage6_input


class SleepOutput(TypedDict):
    sleep_hours: float
    sleep_debt: float
    cumulative_debt_7d: float
    circadian_regularity_index: float
    neurological_stress_proxy: float
    sleep_stability: str
    timestamp: str


def _parse_time(t: str) -> tuple[int, int]:
    """Parse HH:MM or HH:MM:SS string to (hour, minute)."""
    parts = t.strip().split(":")
    return int(parts[0]), int(parts[1])


def _time_to_minutes(t: str) -> int:
    """Convert HH:MM to minutes since midnight."""
    h, m = _parse_time(t)
    return h * 60 + m


def _compute_sleep_hours(onset: str, wake: str) -> float:
    """Compute sleep duration handling midnight crossing."""
    onset_min = _time_to_minutes(onset)
    wake_min = _time_to_minutes(wake)
    if wake_min <= onset_min:
        # Crossed midnight
        diff = (1440 - onset_min) + wake_min
    else:
        diff = wake_min - onset_min
    return round(diff / 60.0, 2)


def _compute_sleep_debt(sleep_hours: float) -> float:
    """Sleep debt relative to 7.5h midpoint."""
    return round(max(0.0, 7.5 - sleep_hours), 2)


def _compute_cri(onset_times: list[str]) -> float:
    """
    Circadian Regularity Index.

    CRI = 1.0 - (std_dev(onset_minutes) / 120)
    Normalized to 2-hour window, clamped [0, 1].
    """
    if len(onset_times) < 2:
        return 1.0

    minutes = []
    for t in onset_times:
        m = _time_to_minutes(t)
        # Normalize late-night times: treat 0:00-05:59 as 24:00-29:59
        # so that e.g. 23:30 and 00:30 are seen as 1h apart, not 23h
        if m < 360:
            m += 1440
        minutes.append(m)

    mean = sum(minutes) / len(minutes)
    variance = sum((x - mean) ** 2 for x in minutes) / len(minutes)
    std = math.sqrt(variance)

    cri = 1.0 - (std / 120.0)
    return round(max(0.0, min(1.0, cri)), 4)


def _compute_neuro_stress(
    sleep_debt: float,
    cri: float,
    caffeine_after_14h: bool,
    screen_before_bed_min: int,
    last_meal_to_bed_hours: float,
) -> float:
    """
    Neurological stress proxy (composite score).

    Base 0.5 with additive modifiers from sleep research:
      +0.15 if sleep_debt > 2    (Krause et al., 2017)
      +0.10 if CRI < 0.5         (Phillips et al., 2017)
      +0.05 if caffeine after 14h (Drake et al., 2013)
      +0.08 if screen > 60 min   (Chang et al., 2015)
      +0.07 if meal-to-bed < 2h  (Crispim et al., 2011)
    """
    stress = 0.5
    if sleep_debt > 2:
        stress += 0.15
    if cri < 0.5:
        stress += 0.10
    if caffeine_after_14h:
        stress += 0.05
    if screen_before_bed_min > 60:
        stress += 0.08
    if last_meal_to_bed_hours < 2:
        stress += 0.07
    return round(max(0.0, min(1.0, stress)), 4)


def _sleep_stability(sleep_debt: float, cri: float) -> str:
    if sleep_debt < 1 and cri > 0.7:
        return "high"
    if sleep_debt > 2 or cri < 0.5:
        return "low"
    return "moderate"


# ─── Public API ───────────────────────────────────────────────────────────────

def run(sleep_input: dict, sleep_history_7d: list[dict] | None = None) -> SleepOutput:
    """
    Process sleep self-report into physiological indicators.

    Args:
        sleep_input: Dict with sleep_onset, wake_time, sleep_quality,
                     night_awakenings, caffeine_after_14h,
                     screen_before_bed_min, last_meal_to_bed_hours.
        sleep_history_7d: Optional list of past 7 days' sleep records
                          (each containing at least sleep_onset and sleep_debt).

    Returns:
        SleepOutput dict with sleep metrics and neurological stress proxy.

    Raises:
        ValueError: If sleep_input fails validation.
    """
    errors = validate_stage6_input(sleep_input)
    if errors:
        raise ValueError(f"Invalid Stage 6 input: {errors}")

    onset = sleep_input["sleep_onset"]
    wake = sleep_input["wake_time"]

    hours = _compute_sleep_hours(onset, wake)
    debt = _compute_sleep_debt(hours)

    history = sleep_history_7d or []

    # Cumulative debt: sum of debts from history + today
    past_debts = []
    for rec in history:
        if "sleep_debt" in rec:
            past_debts.append(float(rec["sleep_debt"]))
        elif "sleep_onset" in rec and "wake_time" in rec:
            h = _compute_sleep_hours(rec["sleep_onset"], rec["wake_time"])
            past_debts.append(_compute_sleep_debt(h))
    all_debts = past_debts + [debt]
    # Keep only last 7 days
    cumulative = round(sum(all_debts[-7:]), 2)

    # CRI: collect onset times from history + today
    onset_times = [rec["sleep_onset"] for rec in history if "sleep_onset" in rec]
    onset_times.append(onset)
    # Use last 7 entries
    cri = _compute_cri(onset_times[-7:])

    caffeine = bool(sleep_input.get("caffeine_after_14h", False))
    screen = int(sleep_input.get("screen_before_bed_min", 0))
    meal_to_bed = float(sleep_input.get("last_meal_to_bed_hours", 3.0))

    neuro = _compute_neuro_stress(debt, cri, caffeine, screen, meal_to_bed)
    stability = _sleep_stability(debt, cri)

    return {
        "sleep_hours": hours,
        "sleep_debt": debt,
        "cumulative_debt_7d": cumulative,
        "circadian_regularity_index": cri,
        "neurological_stress_proxy": neuro,
        "sleep_stability": stability,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
