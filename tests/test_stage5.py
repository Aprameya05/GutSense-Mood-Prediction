"""Tests for Stage 5: Metabolic Response Approximation."""

import pytest

from stage5.metabolic import (
    _classify_gl,
    _energy_crash,
    _fiber_attenuation,
    _is_late_meal,
    run,
)


# ─── Unit: GL classification ────────────────────────────────────────────────

@pytest.mark.parametrize("gl_input,expected", [
    ("low", "low"),
    ("medium", "medium"),
    ("high", "high"),
    ("Low", "low"),
    (5, "low"),
    (10, "low"),
    (11, "medium"),
    (15, "medium"),
    (19, "medium"),
    (20, "high"),
    (35, "high"),
])
def test_classify_gl(gl_input, expected):
    assert _classify_gl(gl_input) == expected


# ─── Unit: fiber attenuation ────────────────────────────────────────────────

@pytest.mark.parametrize("fiber,expected", [
    (0.0, 1.0),
    (10.0, 0.925),
    (20.0, 0.85),
    (40.0, 0.7),
    (60.0, 0.7),   # floor at 0.7
])
def test_fiber_attenuation(fiber, expected):
    assert _fiber_attenuation(fiber) == pytest.approx(expected)


# ─── Unit: energy crash ─────────────────────────────────────────────────────

def test_energy_crash_high_gl_low_fiber():
    assert _energy_crash("high", 3.0) == 0.75

def test_energy_crash_high_gl_sufficient_fiber():
    assert _energy_crash("high", 10.0) == 0.15

def test_energy_crash_medium_gl_low_fiber():
    assert _energy_crash("medium", 8.0) == 0.45

def test_energy_crash_medium_gl_sufficient_fiber():
    assert _energy_crash("medium", 15.0) == 0.15

def test_energy_crash_low_gl():
    assert _energy_crash("low", 2.0) == 0.15


# ─── Unit: late meal detection ───────────────────────────────────────────────

def test_late_meal_at_21():
    assert _is_late_meal("2026-03-13T21:00:00Z") is True

def test_late_meal_at_2059():
    assert _is_late_meal("2026-03-13T20:59:00Z") is False

def test_late_meal_at_23():
    assert _is_late_meal("2026-03-13T23:30:00Z") is True

def test_not_late_meal():
    assert _is_late_meal("2026-03-13T13:00:00Z") is False


# ─── Integration: run() ─────────────────────────────────────────────────────

_STAGE2_LOW = {"totals": {"glycemic_load": "low", "fiber_g": 15.0, "carbohydrates_g": 30.0, "fat_g": 10.0}}
_STAGE2_MEDIUM = {"totals": {"glycemic_load": "medium", "fiber_g": 8.0, "carbohydrates_g": 50.0, "fat_g": 15.0}}
_STAGE2_HIGH = {"totals": {"glycemic_load": "high", "fiber_g": 3.0, "carbohydrates_g": 70.0, "fat_g": 20.0}}
_STAGE0 = {"bmr_kcal": 1500.0, "tdee_kcal": 2000.0, "activity_level": "moderate"}
_MEAL_TS = "2026-03-13T13:00:00Z"
_LATE_TS = "2026-03-13T22:00:00Z"


def test_run_output_schema():
    result = run(_STAGE2_LOW, _MEAL_TS, _STAGE0)
    required = [
        "estimated_glucose_spike", "spike_delta_mg_dl",
        "fiber_attenuation_factor", "energy_crash_probability",
        "late_meal_penalty_applied", "insulin_demand_proxy", "timestamp",
    ]
    for key in required:
        assert key in result, f"Missing key: {key}"


def test_run_low_gl():
    result = run(_STAGE2_LOW, _MEAL_TS, _STAGE0)
    assert result["estimated_glucose_spike"] == "mild"
    assert result["insulin_demand_proxy"] == "low"
    assert result["late_meal_penalty_applied"] is False


def test_run_medium_gl():
    result = run(_STAGE2_MEDIUM, _MEAL_TS, _STAGE0)
    assert result["estimated_glucose_spike"] == "moderate"
    assert result["insulin_demand_proxy"] == "moderate"


def test_run_high_gl():
    result = run(_STAGE2_HIGH, _MEAL_TS, _STAGE0)
    assert result["estimated_glucose_spike"] == "high"
    assert result["energy_crash_probability"] == 0.75
    assert result["insulin_demand_proxy"] == "high"


def test_run_fiber_attenuation_applied():
    result = run(_STAGE2_LOW, _MEAL_TS, _STAGE0)
    # fiber=15 → attenuation = 1.0 - (15/40)*0.3 = 0.8875
    assert result["fiber_attenuation_factor"] == pytest.approx(0.8875)
    # base delta=25 * 0.8875 = 22.1875 → rounded to 22.2
    assert result["spike_delta_mg_dl"] == pytest.approx(22.2, abs=0.1)


def test_run_late_meal_penalty():
    result = run(_STAGE2_MEDIUM, _LATE_TS, _STAGE0)
    assert result["late_meal_penalty_applied"] is True
    # Energy crash for medium GL + fiber<10: 0.45 + 0.10 = 0.55
    assert result["energy_crash_probability"] == pytest.approx(0.55)


def test_run_late_meal_spike_amplified():
    normal = run(_STAGE2_HIGH, _MEAL_TS, _STAGE0)
    late = run(_STAGE2_HIGH, _LATE_TS, _STAGE0)
    assert late["spike_delta_mg_dl"] > normal["spike_delta_mg_dl"]


def test_run_numeric_gl():
    stage2 = {"totals": {"glycemic_load": 15, "fiber_g": 12.0}}
    result = run(stage2, _MEAL_TS, _STAGE0)
    assert result["estimated_glucose_spike"] == "moderate"


# ─── Validation ──────────────────────────────────────────────────────────────

def test_run_missing_gl():
    with pytest.raises(ValueError, match="Invalid Stage 5"):
        run({"totals": {"fiber_g": 10.0}}, _MEAL_TS, _STAGE0)

def test_run_missing_fiber():
    with pytest.raises(ValueError, match="Invalid Stage 5"):
        run({"totals": {"glycemic_load": "low"}}, _MEAL_TS, _STAGE0)
