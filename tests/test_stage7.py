"""Tests for Stage 7: Time-Series Pattern Analysis.

Synthetic hardcoded datasets are used to verify:
  - Pearson correlation math (exact values for known inputs)
  - Lag application
  - Z-score anomaly detection threshold
  - Output schema completeness
  - Edge cases (insufficient data, all-zero variance, etc.)
"""

import math

import pytest

from stage7.patterns import (
    _apply_lag,
    _compute_correlations,
    _detect_anomalies,
    _extract,
    _linear_trend,
    _pattern_confidence,
    _pearson,
    run,
)


# ─── Shared synthetic record builder ─────────────────────────────────────────

def _base_record(i: int, **overrides) -> dict:
    """Return a minimal valid daily record for day index i."""
    base = {
        "date": f"2026-01-{i+1:02d}",
        "fiber_g": 20.0,
        "carbohydrates_g": 50.0,
        "glycemic_load": "medium",
        "tryptophan_mg": 100.0,
        "omega3_mg": 50.0,
        "microbiome_diversity_index": 0.60,
        "digestion_stability_score": 0.70,
        "inflammation_risk_score": 0.35,
        "fermented_food_consumed": False,
        "mood_score": 1.0,
        "cognitive_penalty": -0.5,
        "sleep_quality": "good",
        "sleep_hours": 7.5,
        "cumulative_sleep_debt": 0.5,
        "late_meal": False,
        "neurological_stress_proxy": 0.50,
    }
    base.update(overrides)
    return base


# ─── Unit: Pearson correlation ────────────────────────────────────────────────

def test_pearson_perfect_positive():
    x = [1.0, 2.0, 3.0, 4.0, 5.0]
    y = [2.0, 4.0, 6.0, 8.0, 10.0]
    r, p = _pearson(x, y)
    assert r == pytest.approx(1.0, abs=1e-10)
    assert p == pytest.approx(0.0, abs=1e-9)


def test_pearson_perfect_negative():
    x = [1.0, 2.0, 3.0, 4.0, 5.0]
    y = [5.0, 4.0, 3.0, 2.0, 1.0]
    r, p = _pearson(x, y)
    assert r == pytest.approx(-1.0, abs=1e-10)
    assert p == pytest.approx(0.0, abs=1e-9)


def test_pearson_zero_correlation():
    # Perfectly uncorrelated: constant y
    x = [1.0, 2.0, 3.0, 4.0, 5.0]
    y = [3.0, 3.0, 3.0, 3.0, 3.0]
    r, p = _pearson(x, y)
    assert r == pytest.approx(0.0, abs=1e-10)


def test_pearson_insufficient_samples():
    r, p = _pearson([1.0, 2.0], [1.0, 2.0])
    assert r == 0.0
    assert p == 1.0


def test_pearson_known_value():
    # Pearson r for these exact values is deterministic
    x = [2.0, 0.0, 2.0, 0.0, 2.0, 0.0, 2.0, 0.0, 2.0, 0.0]
    y = [-2.0, 2.0, -2.0, 2.0, -2.0, 2.0, -2.0, 2.0, -2.0, 2.0]
    r, p = _pearson(x, y)
    assert r == pytest.approx(-1.0, abs=1e-10)


def test_pearson_p_value_significant():
    # Strong correlation over 30 points → p should be < 0.05
    import numpy as np
    rng = list(range(30))
    r, p = _pearson(rng, rng)
    assert r == pytest.approx(1.0, abs=1e-10)
    assert p < 0.05


def test_pearson_p_value_not_significant():
    # Weak correlation (near zero) → p should be large
    x = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    y = [3, 3, 3, 3, 3, 3, 3, 3, 3, 3]  # constant
    r, p = _pearson(x, y)
    assert p == pytest.approx(1.0, abs=1e-9)  # constant y → undefined r = 0, p = 1


# ─── Unit: lag application ────────────────────────────────────────────────────

def test_apply_lag_zero():
    x = [1.0, 2.0, 3.0]
    y = [4.0, 5.0, 6.0]
    xl, yl = _apply_lag(x, y, 0)
    assert xl == x
    assert yl == y


def test_apply_lag_one():
    x = [1.0, 2.0, 3.0, 4.0, 5.0]
    y = [10.0, 20.0, 30.0, 40.0, 50.0]
    xl, yl = _apply_lag(x, y, 1)
    # x[0..3] pairs with y[1..4]
    assert xl == [1.0, 2.0, 3.0, 4.0]
    assert yl == [20.0, 30.0, 40.0, 50.0]


def test_apply_lag_preserves_pairing():
    """x[i] should be paired with y[i + lag]."""
    x = list(range(10))
    y = [v * 2 for v in range(10)]
    xl, yl = _apply_lag(x, y, 2)
    # x[0]=0 should pair with y[2]=4
    assert xl[0] == 0 and yl[0] == 4
    assert len(xl) == len(yl) == 8


# ─── Unit: extract ────────────────────────────────────────────────────────────

def test_extract_basic():
    records = [{"a": 1.0}, {"a": 2.0}, {"a": 3.0}]
    assert _extract(records, "a") == [1.0, 2.0, 3.0]


def test_extract_missing_is_nan():
    records = [{"a": 1.0}, {}, {"a": 3.0}]
    result = _extract(records, "a")
    assert result[0] == 1.0
    assert math.isnan(result[1])
    assert result[2] == 3.0


def test_extract_with_converter():
    records = [{"gl": "low"}, {"gl": "high"}, {"gl": "medium"}]
    from stage7.patterns import _GL_NUMERIC
    result = _extract(records, "gl", lambda v: _GL_NUMERIC.get(v, 1.0))
    assert result == [0.0, 2.0, 1.0]


# ─── Correlation: perfect anti-correlation (GL ↔ mood) ───────────────────────

def _make_gl_mood_anticorrelated(n: int = 30) -> list[dict]:
    """
    Alternate high/low GL with matching bad/good mood.
    GL numeric: even days = 2 (high), odd = 0 (low).
    Mood:       even days = -2, odd = +2.
    Expected Pearson r = -1.0 exactly.
    """
    records = []
    for i in range(n):
        gl = "high" if i % 2 == 0 else "low"
        mood = -2.0 if i % 2 == 0 else 2.0
        records.append(_base_record(i, glycemic_load=gl, mood_score=mood))
    return records


def test_correlation_gl_mood_perfect_negative():
    records = _make_gl_mood_anticorrelated(30)
    correlations = _compute_correlations(records)
    gl_mood = next(c for c in correlations if "glycemic_load" in c["pair"])
    assert gl_mood["r"] == pytest.approx(-1.0, abs=1e-9)
    assert gl_mood["p"] == pytest.approx(0.0, abs=1e-9)
    assert gl_mood["significant"] is True
    assert gl_mood["lag_days"] == 0


# ─── Correlation: perfect lag-1 (fiber ↔ MDI) ────────────────────────────────

def _make_fiber_mdi_lag1(n: int = 30) -> list[dict]:
    """
    Fiber changes at day 15; MDI follows 1 day later (day 16).
    After applying lag=1:
      x = fiber[0:29]: first 15 = 10g, next 14 = 35g
      y = mdi[1:30]:   first 15 = 0.4, next 14 = 0.8
    → perfect positive correlation r = 1.0.
    """
    records = []
    for i in range(n):
        if i < 15:
            fiber, mdi = 10.0, 0.4
        elif i == 15:
            fiber, mdi = 35.0, 0.4   # transition day: fiber jumped, MDI not yet
        else:
            fiber, mdi = 35.0, 0.8
        records.append(_base_record(i, fiber_g=fiber, microbiome_diversity_index=mdi))
    return records


def test_correlation_fiber_mdi_lag1_perfect_positive():
    records = _make_fiber_mdi_lag1(30)
    correlations = _compute_correlations(records)
    fm = next(c for c in correlations if "fiber_intake" in c["pair"])
    assert fm["r"] == pytest.approx(1.0, abs=1e-9)
    assert fm["p"] == pytest.approx(0.0, abs=1e-9)
    assert fm["lag_days"] == 1
    assert fm["significant"] is True


# ─── Correlation: fermented food ↔ digestion stability ───────────────────────

def _make_fermented_dss_correlated(n: int = 30) -> list[dict]:
    """
    Alternating: fermented days → DSS 0.9, non-fermented → DSS 0.4.
    Expected r ≈ +1.0 (strong positive).
    """
    records = []
    for i in range(n):
        fermented = (i % 2 == 0)
        dss = 0.9 if fermented else 0.4
        records.append(_base_record(i, fermented_food_consumed=fermented,
                                    digestion_stability_score=dss))
    return records


def test_correlation_fermented_dss_positive():
    records = _make_fermented_dss_correlated(30)
    correlations = _compute_correlations(records)
    fc = next(c for c in correlations if "fermented_food" in c["pair"])
    assert fc["r"] == pytest.approx(1.0, abs=1e-9)
    assert fc["significant"] is True


# ─── Correlation: tryptophan ↔ next-day mood (lag=1) ─────────────────────────

def _make_tryp_mood_lag1(n: int = 30) -> list[dict]:
    """
    Tryptophan changes at day 15; next-day mood follows.
    After lag=1: perfect positive correlation.
    """
    records = []
    for i in range(n):
        if i < 15:
            tryp, mood = 50.0, 0.0
        elif i == 15:
            tryp, mood = 200.0, 0.0  # transition
        else:
            tryp, mood = 200.0, 2.0
        records.append(_base_record(i, tryptophan_mg=tryp, mood_score=mood))
    return records


def test_correlation_tryptophan_mood_lag1_positive():
    records = _make_tryp_mood_lag1(30)
    correlations = _compute_correlations(records)
    tc = next(c for c in correlations if "tryptophan" in c["pair"])
    assert tc["r"] == pytest.approx(1.0, abs=1e-9)
    assert tc["lag_days"] == 1


# ─── Z-score anomaly detection ───────────────────────────────────────────────

def _make_anomaly_records(n: int = 30, anomaly_day: int = 25,
                           anomaly_mood: float = 10.0) -> list[dict]:
    """
    Nearly constant mood_score (~0.5 ± 0.1 variation), with one clear spike.
    The 7-day rolling std will be ~0.08; z-score at anomaly_day >> 2.0.
    """
    records = []
    for i in range(n):
        # Small cyclic variation to give non-zero std: 0.4, 0.5, 0.6, 0.4, ...
        mood = 0.4 + 0.1 * (i % 3)
        if i == anomaly_day:
            mood = anomaly_mood
        records.append(_base_record(i, mood_score=mood))
    return records


def test_anomaly_detected_above_threshold():
    records = _make_anomaly_records(30, anomaly_day=25, anomaly_mood=10.0)
    anomalies = _detect_anomalies(records)
    mood_anomalies = [a for a in anomalies if a["metric"] == "mood_score"]
    assert len(mood_anomalies) >= 1
    flagged_day = next(a for a in mood_anomalies if a["value"] == 10.0)
    assert abs(flagged_day["z_score"]) > 2.0


def test_anomaly_not_triggered_within_2sigma():
    """Normal variation should not trigger any anomalies."""
    # All mood values are identical (std = 0) → skipped
    records = [_base_record(i, mood_score=1.0) for i in range(30)]
    anomalies = _detect_anomalies(records)
    mood_anomalies = [a for a in anomalies if a["metric"] == "mood_score"]
    assert len(mood_anomalies) == 0


def test_anomaly_z_score_direction():
    """A below-mean spike gives a negative z-score."""
    records = _make_anomaly_records(30, anomaly_day=25, anomaly_mood=-10.0)
    anomalies = _detect_anomalies(records)
    mood_anomalies = [a for a in anomalies if a["metric"] == "mood_score" and a["value"] == -10.0]
    assert len(mood_anomalies) >= 1
    assert mood_anomalies[0]["z_score"] < -2.0


def test_anomaly_requires_window_records():
    """First 7 days cannot be anomalies (no prior window)."""
    records = _make_anomaly_records(30, anomaly_day=3, anomaly_mood=99.0)
    anomalies = _detect_anomalies(records)
    # Day index 3 is within the first window (< 7) → should NOT be flagged
    early_flags = [a for a in anomalies if a["metric"] == "mood_score"
                   and a["date"] == records[3]["date"]]
    assert len(early_flags) == 0


# ─── Linear trend ─────────────────────────────────────────────────────────────

def test_linear_trend_increasing():
    records = [_base_record(i, fiber_g=float(i)) for i in range(30)]
    trend = _linear_trend(records, "fiber_g")
    assert trend["direction"] == "increasing"
    assert trend["slope"] > 0.0


def test_linear_trend_decreasing():
    records = [_base_record(i, fiber_g=float(30 - i)) for i in range(30)]
    trend = _linear_trend(records, "fiber_g")
    assert trend["direction"] == "decreasing"
    assert trend["slope"] < 0.0


def test_linear_trend_flat():
    records = [_base_record(i, fiber_g=20.0) for i in range(30)]
    trend = _linear_trend(records, "fiber_g")
    assert trend["direction"] == "flat"
    assert abs(trend["slope"]) < 0.001


def test_linear_trend_missing_key():
    records = [_base_record(i) for i in range(10)]
    trend = _linear_trend(records, "nonexistent_key")
    assert trend["direction"] == "flat"
    assert trend["slope"] == 0.0


# ─── Pattern confidence ───────────────────────────────────────────────────────

def test_pattern_confidence_high():
    corrs = [{"significant": True}] * 3
    assert _pattern_confidence(corrs) == "high"

def test_pattern_confidence_moderate():
    corrs = [{"significant": True}, {"significant": False}, {"significant": False}]
    assert _pattern_confidence(corrs) == "moderate"

def test_pattern_confidence_low():
    corrs = [{"significant": False}] * 5
    assert _pattern_confidence(corrs) == "low"


# ─── Integration: run() ───────────────────────────────────────────────────────

def _make_standard_records(n: int = 30) -> list[dict]:
    return [_base_record(i) for i in range(n)]


def test_run_output_schema():
    records = _make_standard_records(30)
    result = run(records, skip_groq=True)

    required = [
        "correlations", "significant_correlations", "anomalies",
        "anomalies_detected", "fiber_trend", "mdi_trend",
        "groq_summary", "pattern_confidence", "days_analyzed", "timestamp",
    ]
    for key in required:
        assert key in result, f"Missing key: {key}"


def test_run_seven_correlation_pairs():
    records = _make_standard_records(30)
    result = run(records, skip_groq=True)
    assert len(result["correlations"]) == 7


def test_run_correlation_pairs_have_required_fields():
    records = _make_standard_records(30)
    result = run(records, skip_groq=True)
    for c in result["correlations"]:
        for field in ("pair", "r", "p", "lag_days", "significant", "expected_direction"):
            assert field in c, f"Correlation missing field: {field}"


def test_run_r_values_in_range():
    records = _make_standard_records(30)
    result = run(records, skip_groq=True)
    for c in result["correlations"]:
        assert -1.0 <= c["r"] <= 1.0
        assert 0.0 <= c["p"] <= 1.0


def test_run_days_analyzed():
    records = _make_standard_records(15)
    result = run(records, skip_groq=True)
    assert result["days_analyzed"] == 15


def test_run_skip_groq():
    records = _make_standard_records(30)
    result = run(records, skip_groq=True)
    assert result["groq_summary"].startswith("Groq summarization skipped.")


def test_run_detects_strong_gl_mood_correlation():
    """With perfectly anti-correlated GL and mood, run() should flag it significant."""
    records = _make_gl_mood_anticorrelated(30)
    result = run(records, skip_groq=True)
    sig = result["significant_correlations"]
    gl_mood_sig = [c for c in sig if "glycemic_load" in c["pair"]]
    assert len(gl_mood_sig) == 1
    assert gl_mood_sig[0]["r"] == pytest.approx(-1.0, abs=1e-9)


def test_run_detects_anomaly_in_output():
    records = _make_anomaly_records(30, anomaly_day=25, anomaly_mood=10.0)
    result = run(records, skip_groq=True)
    assert result["anomalies_detected"] >= 1


def test_run_significant_correlations_subset_of_all():
    records = _make_standard_records(30)
    result = run(records, skip_groq=True)
    sig_pairs = {c["pair"] for c in result["significant_correlations"]}
    all_pairs = {c["pair"] for c in result["correlations"]}
    assert sig_pairs.issubset(all_pairs)


def test_run_fiber_trend_present():
    records = [_base_record(i, fiber_g=float(i)) for i in range(30)]
    result = run(records, skip_groq=True)
    assert result["fiber_trend"]["direction"] == "increasing"
    assert result["mdi_trend"]["direction"] in ("increasing", "flat", "decreasing")


# ─── Edge cases ───────────────────────────────────────────────────────────────

def test_run_raises_if_too_few_records():
    records = _make_standard_records(6)
    with pytest.raises(ValueError, match="7"):
        run(records, skip_groq=True)


def test_run_minimum_7_records():
    records = _make_standard_records(7)
    result = run(records, skip_groq=True)
    assert result["days_analyzed"] == 7


def test_run_handles_missing_fields_gracefully():
    """Records with missing fields should not raise — NaN pairs are skipped."""
    records = []
    for i in range(20):
        r = {"date": f"2026-01-{i+1:02d}"}  # almost empty record
        records.append(r)
    # Should not raise
    result = run(records, skip_groq=True)
    # All r values should be 0.0 (no data to correlate)
    for c in result["correlations"]:
        assert c["r"] == 0.0
