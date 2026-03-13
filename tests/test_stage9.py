"""Tests for Stage 9: Neurological Risk Pattern Detection."""

import pytest

from stage9.risk import (
    _check_b12_deficiency,
    _check_chronic_sleep_debt,
    _check_circadian_disruption,
    _check_combined_neuro_stress,
    _check_inflammation_persistence,
    _check_metabolic_dysregulation,
    _check_mood_instability,
    _check_persistent_brain_fog,
    _risk_level,
    run,
)


def _base_record(**overrides) -> dict:
    base = {
        "cognitive_state": "clear",
        "cumulative_debt_7d": 3.0,
        "mood_score": 5,
        "cognitive_penalty": 0.0,
        "estimated_glucose_spike": "moderate",
        "inflammation_risk_score": 0.35,
        "circadian_regularity_index": 0.7,
        "neurological_stress_proxy": 0.5,
        "sleep_hours": 7.5,
    }
    base.update(overrides)
    return base


# ─── Unit: individual risk signals ──────────────────────────────────────────

def test_brain_fog_triggered():
    records = [_base_record(cognitive_state="brain_fog") for _ in range(7)]
    assert _check_persistent_brain_fog(records) is True


def test_brain_fog_not_triggered():
    records = [_base_record(cognitive_state="brain_fog") for _ in range(4)]
    records += [_base_record(cognitive_state="clear") for _ in range(3)]
    assert _check_persistent_brain_fog(records) is False


def test_brain_fog_exactly_5():
    records = [_base_record(cognitive_state="clear") for _ in range(2)]
    records += [_base_record(cognitive_state="brain_fog") for _ in range(5)]
    assert _check_persistent_brain_fog(records) is True


def test_chronic_sleep_debt_triggered():
    records = [_base_record(cumulative_debt_7d=12.0) for _ in range(14)]
    assert _check_chronic_sleep_debt(records) is True


def test_chronic_sleep_debt_not_triggered():
    records = [_base_record(cumulative_debt_7d=8.0) for _ in range(14)]
    assert _check_chronic_sleep_debt(records) is False


def test_chronic_sleep_debt_too_few_days():
    records = [_base_record(cumulative_debt_7d=12.0) for _ in range(10)]
    assert _check_chronic_sleep_debt(records) is False


def test_mood_instability_triggered():
    # Alternating extreme scores across 14 days
    records = [_base_record(mood_score=(-5 if i % 2 == 0 else 5)) for i in range(14)]
    assert _check_mood_instability(records) is True


def test_mood_instability_not_triggered():
    records = [_base_record(mood_score=5) for _ in range(14)]
    assert _check_mood_instability(records) is False


def test_metabolic_dysregulation_triggered():
    records = [_base_record(estimated_glucose_spike="high") for _ in range(14)]
    assert _check_metabolic_dysregulation(records) is True


def test_metabolic_dysregulation_at_60_percent():
    high = [_base_record(estimated_glucose_spike="high") for _ in range(9)]
    low = [_base_record(estimated_glucose_spike="low") for _ in range(5)]
    # 9/14 ≈ 64% → triggered
    records = low + high  # last 14 = all
    assert _check_metabolic_dysregulation(records) is True


def test_metabolic_dysregulation_below_threshold():
    high = [_base_record(estimated_glucose_spike="high") for _ in range(7)]
    low = [_base_record(estimated_glucose_spike="low") for _ in range(7)]
    records = low + high  # 7/14 = 50% < 60%
    assert _check_metabolic_dysregulation(records) is False


def test_inflammation_persistence_triggered():
    records = [_base_record(inflammation_risk_score=0.7) for _ in range(14)]
    assert _check_inflammation_persistence(records) is True


def test_inflammation_persistence_broken():
    records = [_base_record(inflammation_risk_score=0.7) for _ in range(13)]
    records.append(_base_record(inflammation_risk_score=0.3))
    # Break is at the end, so consecutive from end = 0
    assert _check_inflammation_persistence(records) is False


def test_circadian_disruption_triggered():
    records = [_base_record(circadian_regularity_index=0.2) for _ in range(14)]
    assert _check_circadian_disruption(records) is True


def test_circadian_disruption_not_triggered():
    records = [_base_record(circadian_regularity_index=0.6) for _ in range(14)]
    assert _check_circadian_disruption(records) is False


def test_neuro_stress_triggered():
    records = [_base_record(neurological_stress_proxy=0.8) for _ in range(7)]
    assert _check_combined_neuro_stress(records) is True


def test_neuro_stress_not_triggered():
    records = [_base_record(neurological_stress_proxy=0.8) for _ in range(6)]
    assert _check_combined_neuro_stress(records) is False


def test_b12_triggered():
    # Vegetarian with declining cognitive scores over 21 days
    records = []
    for i in range(21):
        cog = 6.0 if i < 10 else 3.0  # clear decline
        records.append(_base_record(mood_score=cog, cognitive_penalty=0.0))
    baselines = {"diet_type": "vegetarian"}
    assert _check_b12_deficiency(records, baselines) is True


def test_b12_not_vegetarian():
    records = [_base_record(mood_score=3.0) for _ in range(21)]
    baselines = {"diet_type": "non-vegetarian"}
    assert _check_b12_deficiency(records, baselines) is False


def test_b12_no_decline():
    records = [_base_record(mood_score=6.0) for _ in range(21)]
    baselines = {"diet_type": "vegetarian"}
    assert _check_b12_deficiency(records, baselines) is False


# ─── Unit: risk level ───────────────────────────────────────────────────────

def test_risk_level_none():
    assert _risk_level(0) == "none"

def test_risk_level_mild():
    assert _risk_level(1) == "mild"
    assert _risk_level(2) == "mild"

def test_risk_level_moderate():
    assert _risk_level(3) == "moderate"
    assert _risk_level(4) == "moderate"

def test_risk_level_elevated():
    assert _risk_level(5) == "elevated"
    assert _risk_level(8) == "elevated"


# ─── Integration: run() ─────────────────────────────────────────────────────

def test_run_no_flags():
    records = [_base_record() for _ in range(30)]
    result = run(records, {})
    assert result["neurological_risk_level"] == "none"
    assert result["risk_count"] == 0
    assert result["active_flags"] == []
    assert result["professional_consult_suggested"] is False


def test_run_output_schema():
    records = [_base_record() for _ in range(30)]
    result = run(records, {})
    required = [
        "neurological_risk_level", "active_flags", "risk_count",
        "recommendation", "professional_consult_suggested", "timestamp",
    ]
    for key in required:
        assert key in result, f"Missing key: {key}"


def test_run_mild():
    records = [_base_record(cognitive_state="brain_fog") for _ in range(7)]
    result = run(records, {})
    assert result["neurological_risk_level"] == "mild"
    assert "persistent_brain_fog" in result["active_flags"]


def test_run_elevated_suggests_consult():
    records = [
        _base_record(
            cognitive_state="brain_fog",
            cumulative_debt_7d=12.0,
            mood_score=(-5 if i % 2 == 0 else 5),
            estimated_glucose_spike="high",
            inflammation_risk_score=0.7,
            circadian_regularity_index=0.2,
            neurological_stress_proxy=0.8,
        )
        for i in range(21)
    ]
    baselines = {"diet_type": "vegetarian"}
    result = run(records, baselines)
    assert result["neurological_risk_level"] == "elevated"
    assert result["professional_consult_suggested"] is True
    assert result["risk_count"] >= 5


def test_run_empty_records():
    result = run([], {})
    assert result["neurological_risk_level"] == "none"
    assert result["risk_count"] == 0
