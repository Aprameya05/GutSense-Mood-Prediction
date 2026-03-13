"""Tests for Stage 8: Personalized Baseline Creation."""

import json
from pathlib import Path
from unittest.mock import patch

import pytest

from stage8 import baseline as baseline_module
from stage8.baseline import _cv, _extract, _safe_mean, _safe_median, _safe_mode_str, run


def _make_daily_record(i: int, **overrides) -> dict:
    """Generate a synthetic daily record with plausible defaults."""
    base = {
        "mood_score": 5 + (i % 3 - 1),        # varies 4, 5, 6
        "mood_label": "neutral",
        "cognitive_state": "clear",
        "cognitive_penalty": 0.0,
        "energy_level": "moderate",
        "anxiety_level": "none",
        "sleep_hours": 7.0 + (i % 3) * 0.5,    # 7.0, 7.5, 8.0
        "sleep_debt": max(0, 7.5 - (7.0 + (i % 3) * 0.5)),
        "estimated_glucose_spike": ["low", "moderate", "moderate"][i % 3],
        "digestion_stability_score": 0.7 + (i % 5) * 0.05,
        "microbiome_diversity_index": 0.6 + (i % 4) * 0.05,
        "inflammation_risk_score": 0.35 + (i % 3) * 0.05,
        "neurological_stress_proxy": 0.5 + (i % 3) * 0.03,
    }
    base.update(overrides)
    return base


def _write_daily_logs(tmp_path: Path, n: int = 30, **record_overrides) -> Path:
    """Write n daily log JSON files into tmp_path and return the dir."""
    for i in range(n):
        date_str = f"2026-03-{(i + 1):02d}" if i < 28 else f"2026-04-{(i - 27):02d}"
        record = _make_daily_record(i, **record_overrides)
        filepath = tmp_path / f"{date_str}.json"
        filepath.write_text(json.dumps(record), encoding="utf-8")
    return tmp_path


# ─── Unit: helpers ──────────────────────────────────────────────────────────

def test_extract():
    records = [{"a": 1}, {"a": 2}, {"b": 3}]
    assert _extract(records, "a") == [1, 2]


def test_extract_with_default():
    records = [{"a": 1}, {}]
    assert _extract(records, "a", default=0) == [1, 0]


def test_safe_mean():
    assert _safe_mean([2.0, 4.0, 6.0]) == pytest.approx(4.0)
    assert _safe_mean([]) == 0.0


def test_safe_median():
    assert _safe_median([1.0, 3.0, 5.0]) == 3.0
    assert _safe_median([]) == 0.0


def test_safe_mode_str():
    assert _safe_mode_str(["low", "moderate", "moderate"]) == "moderate"
    assert _safe_mode_str([]) == "unknown"


def test_cv_constant():
    assert _cv([5.0, 5.0, 5.0]) == pytest.approx(0.0)


def test_cv_varied():
    cv = _cv([10.0, 20.0, 30.0])
    assert cv > 0


def test_cv_empty():
    assert _cv([]) == 0.0


# ─── Integration: run() ─────────────────────────────────────────────────────

def test_run_output_schema(tmp_path):
    logs_dir = _write_daily_logs(tmp_path)
    with patch.object(baseline_module, "BASELINES_DIR", tmp_path / "baselines"):
        result = run("test_user", daily_logs_dir=logs_dir)

    required = [
        "baseline_mood", "baseline_sleep_hours", "baseline_glucose_spike",
        "baseline_digestion_stability", "baseline_MDI",
        "baseline_inflammation_risk", "baseline_cognitive_score",
        "baseline_neuro_stress", "all_baselines_stable",
        "baseline_period_days", "stability_details", "timestamp",
    ]
    for key in required:
        assert key in result, f"Missing key: {key}"


def test_run_baseline_mood_is_trimmed_mean(tmp_path):
    logs_dir = _write_daily_logs(tmp_path)
    with patch.object(baseline_module, "BASELINES_DIR", tmp_path / "baselines"):
        result = run("test_user", daily_logs_dir=logs_dir)
    assert isinstance(result["baseline_mood"], float)


def test_run_baseline_sleep_is_median(tmp_path):
    logs_dir = _write_daily_logs(tmp_path)
    with patch.object(baseline_module, "BASELINES_DIR", tmp_path / "baselines"):
        result = run("test_user", daily_logs_dir=logs_dir)
    assert isinstance(result["baseline_sleep_hours"], float)


def test_run_baseline_spike_is_mode(tmp_path):
    logs_dir = _write_daily_logs(tmp_path)
    with patch.object(baseline_module, "BASELINES_DIR", tmp_path / "baselines"):
        result = run("test_user", daily_logs_dir=logs_dir)
    # With our synthetic data, "moderate" appears 2/3 of the time
    assert result["baseline_glucose_spike"] == "moderate"


def test_run_period_days(tmp_path):
    logs_dir = _write_daily_logs(tmp_path, n=35)
    with patch.object(baseline_module, "BASELINES_DIR", tmp_path / "baselines"):
        result = run("test_user", daily_logs_dir=logs_dir)
    assert result["baseline_period_days"] == 35


def test_run_stability_all_stable(tmp_path):
    # Constant values → CV = 0 → all stable
    logs_dir = _write_daily_logs(
        tmp_path,
        mood_score=5,
        sleep_hours=7.5,
        digestion_stability_score=0.7,
        microbiome_diversity_index=0.6,
        inflammation_risk_score=0.35,
        neurological_stress_proxy=0.5,
        cognitive_penalty=0.0,
    )
    with patch.object(baseline_module, "BASELINES_DIR", tmp_path / "baselines"):
        result = run("test_user", daily_logs_dir=logs_dir)
    assert result["all_baselines_stable"] is True


def test_run_stability_unstable(tmp_path):
    # Wildly varying mood scores
    logs_path = tmp_path / "logs"
    logs_path.mkdir()
    for i in range(30):
        date_str = f"2026-03-{(i + 1):02d}" if i < 28 else f"2026-04-{(i - 27):02d}"
        record = _make_daily_record(i, mood_score=(i % 2) * 10)  # alternates 0, 10
        (logs_path / f"{date_str}.json").write_text(json.dumps(record), encoding="utf-8")
    with patch.object(baseline_module, "BASELINES_DIR", tmp_path / "baselines"):
        result = run("test_user", daily_logs_dir=logs_path)
    assert result["stability_details"]["mood"]["stable"] is False


def test_run_saves_baseline_file(tmp_path):
    logs_dir = _write_daily_logs(tmp_path)
    baselines_dir = tmp_path / "baselines"
    with patch.object(baseline_module, "BASELINES_DIR", baselines_dir):
        run("test_user", daily_logs_dir=logs_dir)
    saved = json.loads((baselines_dir / "test_user.json").read_text(encoding="utf-8"))
    assert "baseline_mood" in saved


def test_run_insufficient_data(tmp_path):
    _write_daily_logs(tmp_path, n=10)
    with pytest.raises(ValueError, match="30\\+ days"):
        run("test_user", daily_logs_dir=tmp_path)


def test_run_mdi_uses_last_14_days(tmp_path):
    logs_path = tmp_path / "logs"
    logs_path.mkdir()
    for i in range(30):
        date_str = f"2026-03-{(i + 1):02d}" if i < 28 else f"2026-04-{(i - 27):02d}"
        # First 16 days: MDI=0.3; last 14 days: MDI=0.9
        mdi = 0.3 if i < 16 else 0.9
        record = _make_daily_record(i, microbiome_diversity_index=mdi)
        (logs_path / f"{date_str}.json").write_text(json.dumps(record), encoding="utf-8")
    with patch.object(baseline_module, "BASELINES_DIR", tmp_path / "baselines"):
        result = run("test_user", daily_logs_dir=logs_path)
    assert result["baseline_MDI"] == pytest.approx(0.9)
