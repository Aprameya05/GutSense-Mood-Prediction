"""Tests for Stage 6: Sleep & Physiological Indicators."""

import pytest

from stage6.sleep import (
    _compute_cri,
    _compute_neuro_stress,
    _compute_sleep_debt,
    _compute_sleep_hours,
    _sleep_stability,
    _time_to_minutes,
    run,
)


# ─── Unit: time helpers ──────────────────────────────────────────────────────

def test_time_to_minutes():
    assert _time_to_minutes("23:30") == 1410
    assert _time_to_minutes("06:15") == 375
    assert _time_to_minutes("00:00") == 0


# ─── Unit: sleep hours ──────────────────────────────────────────────────────

def test_sleep_hours_no_crossing():
    assert _compute_sleep_hours("22:00", "06:00") == 8.0

def test_sleep_hours_midnight_crossing():
    assert _compute_sleep_hours("23:30", "06:15") == 6.75

def test_sleep_hours_late_crossing():
    assert _compute_sleep_hours("01:00", "08:00") == 7.0

def test_sleep_hours_exact_midnight():
    assert _compute_sleep_hours("00:00", "07:30") == 7.5


# ─── Unit: sleep debt ───────────────────────────────────────────────────────

def test_sleep_debt_short():
    assert _compute_sleep_debt(6.0) == 1.5

def test_sleep_debt_sufficient():
    assert _compute_sleep_debt(8.0) == 0.0

def test_sleep_debt_exact():
    assert _compute_sleep_debt(7.5) == 0.0


# ─── Unit: CRI ──────────────────────────────────────────────────────────────

def test_cri_constant_onset():
    onsets = ["23:00"] * 7
    assert _compute_cri(onsets) == pytest.approx(1.0)

def test_cri_single_onset():
    assert _compute_cri(["23:00"]) == 1.0

def test_cri_moderate_variance():
    # 30 min std → CRI = 1 - 30/120 = 0.75
    onsets = ["22:30", "23:30"] * 3 + ["23:00"]
    cri = _compute_cri(onsets)
    assert 0.4 < cri < 1.0

def test_cri_high_variance_clamps_zero():
    # Very spread out → CRI approaches 0
    onsets = ["20:00", "23:00", "02:00", "21:00", "00:30", "19:00", "03:00"]
    cri = _compute_cri(onsets)
    assert 0.0 <= cri <= 1.0

def test_cri_handles_midnight_crossing():
    # 23:30 and 00:30 should be 1 hour apart, not 23 hours
    onsets = ["23:30", "00:30", "23:00", "00:00", "23:30", "00:30", "23:00"]
    cri = _compute_cri(onsets)
    assert cri > 0.5


# ─── Unit: neurological stress ──────────────────────────────────────────────

def test_neuro_stress_baseline():
    stress = _compute_neuro_stress(0.0, 0.8, False, 30, 3.0)
    assert stress == pytest.approx(0.5)

def test_neuro_stress_sleep_debt():
    stress = _compute_neuro_stress(3.0, 0.8, False, 30, 3.0)
    assert stress == pytest.approx(0.65)

def test_neuro_stress_low_cri():
    stress = _compute_neuro_stress(0.0, 0.3, False, 30, 3.0)
    assert stress == pytest.approx(0.60)

def test_neuro_stress_caffeine():
    stress = _compute_neuro_stress(0.0, 0.8, True, 30, 3.0)
    assert stress == pytest.approx(0.55)

def test_neuro_stress_screen():
    stress = _compute_neuro_stress(0.0, 0.8, False, 90, 3.0)
    assert stress == pytest.approx(0.58)

def test_neuro_stress_meal_close():
    stress = _compute_neuro_stress(0.0, 0.8, False, 30, 1.0)
    assert stress == pytest.approx(0.57)

def test_neuro_stress_all_modifiers():
    stress = _compute_neuro_stress(3.0, 0.3, True, 90, 1.0)
    # 0.5 + 0.15 + 0.10 + 0.05 + 0.08 + 0.07 = 0.95
    assert stress == pytest.approx(0.95)


# ─── Unit: sleep stability ──────────────────────────────────────────────────

def test_stability_high():
    assert _sleep_stability(0.5, 0.8) == "high"

def test_stability_low_debt():
    assert _sleep_stability(3.0, 0.6) == "low"

def test_stability_low_cri():
    assert _sleep_stability(0.5, 0.3) == "low"

def test_stability_moderate():
    assert _sleep_stability(1.5, 0.6) == "moderate"


# ─── Integration: run() ─────────────────────────────────────────────────────

_SLEEP_INPUT = {
    "sleep_onset": "23:30",
    "wake_time": "06:15",
    "sleep_quality": "fair",
    "night_awakenings": 2,
    "caffeine_after_14h": True,
    "screen_before_bed_min": 45,
    "last_meal_to_bed_hours": 1.5,
}


def test_run_output_schema():
    result = run(_SLEEP_INPUT)
    required = [
        "sleep_hours", "sleep_debt", "cumulative_debt_7d",
        "circadian_regularity_index", "neurological_stress_proxy",
        "sleep_stability", "timestamp",
    ]
    for key in required:
        assert key in result, f"Missing key: {key}"


def test_run_sleep_hours():
    result = run(_SLEEP_INPUT)
    assert result["sleep_hours"] == pytest.approx(6.75)


def test_run_sleep_debt():
    result = run(_SLEEP_INPUT)
    assert result["sleep_debt"] == pytest.approx(0.75)


def test_run_cumulative_no_history():
    result = run(_SLEEP_INPUT)
    assert result["cumulative_debt_7d"] == result["sleep_debt"]


def test_run_cumulative_with_history():
    history = [
        {"sleep_onset": "23:00", "wake_time": "06:00", "sleep_debt": 1.5},
        {"sleep_onset": "00:00", "wake_time": "06:30", "sleep_debt": 1.0},
    ]
    result = run(_SLEEP_INPUT, sleep_history_7d=history)
    # 1.5 + 1.0 + 0.75 = 3.25
    assert result["cumulative_debt_7d"] == pytest.approx(3.25)


def test_run_cri_with_history():
    history = [{"sleep_onset": "23:30"} for _ in range(6)]
    result = run(_SLEEP_INPUT, sleep_history_7d=history)
    # All same onset → CRI = 1.0
    assert result["circadian_regularity_index"] == pytest.approx(1.0)


def test_run_neuro_stress_reflects_inputs():
    # caffeine=True, meal<2h → stress > baseline
    result = run(_SLEEP_INPUT)
    assert result["neurological_stress_proxy"] > 0.5


def test_run_good_sleep():
    good = {
        "sleep_onset": "22:30",
        "wake_time": "06:30",
        "sleep_quality": "good",
        "night_awakenings": 0,
        "caffeine_after_14h": False,
        "screen_before_bed_min": 20,
        "last_meal_to_bed_hours": 3.0,
    }
    result = run(good)
    assert result["sleep_debt"] == 0.0
    assert result["neurological_stress_proxy"] == pytest.approx(0.5)
    assert result["sleep_stability"] == "high"


# ─── Validation ──────────────────────────────────────────────────────────────

def test_run_missing_onset():
    bad = {k: v for k, v in _SLEEP_INPUT.items() if k != "sleep_onset"}
    with pytest.raises(ValueError, match="Invalid Stage 6"):
        run(bad)

def test_run_missing_wake():
    bad = {k: v for k, v in _SLEEP_INPUT.items() if k != "wake_time"}
    with pytest.raises(ValueError, match="Invalid Stage 6"):
        run(bad)

def test_run_invalid_sleep_quality():
    bad = {**_SLEEP_INPUT, "sleep_quality": "terrible"}
    with pytest.raises(ValueError, match="Invalid Stage 6"):
        run(bad)
