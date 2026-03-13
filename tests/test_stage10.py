"""Tests for Stage 10: Final Insight Generation."""

import json
from unittest.mock import patch

import pytest

from stage10.insights import _build_user_prompt, _parse_insights, run


# ─── Unit: prompt building ──────────────────────────────────────────────────

def test_build_prompt_with_baselines():
    summary = {"baselines": {"baseline_mood": 6.2}}
    prompt = _build_user_prompt(summary)
    assert "Baselines" in prompt
    assert "6.2" in prompt


def test_build_prompt_with_risk():
    summary = {"risk": {"neurological_risk_level": "mild"}}
    prompt = _build_user_prompt(summary)
    assert "Risk Assessment" in prompt


def test_build_prompt_flat_baselines():
    summary = {"baseline_mood": 6.2}
    prompt = _build_user_prompt(summary)
    assert "6.2" in prompt


# ─── Unit: response parsing ────────────────────────────────────────────────

def test_parse_json_array():
    resp = '["insight one", "insight two", "insight three"]'
    result = _parse_insights(resp)
    assert len(result) == 3
    assert result[0] == "insight one"


def test_parse_numbered_lines():
    resp = "1. First insight\n2. Second insight\n3. Third insight"
    result = _parse_insights(resp)
    assert len(result) == 3
    assert result[0] == "First insight"


def test_parse_bullet_lines():
    resp = "- Insight A\n- Insight B"
    result = _parse_insights(resp)
    assert len(result) == 2
    assert result[0] == "Insight A"


def test_parse_caps_at_5():
    resp = json.dumps([f"insight {i}" for i in range(10)])
    result = _parse_insights(resp)
    assert len(result) <= 5


def test_parse_plain_text():
    resp = "A single insight without formatting."
    result = _parse_insights(resp)
    assert len(result) >= 1


# ─── Integration: run() with skip_groq ──────────────────────────────────────

_SUMMARY = {
    "baselines": {"baseline_mood": 6.2, "baseline_sleep_hours": 7.0},
    "correlations": [{"pair": "fiber→mood", "r": 0.45}],
    "risk": {"neurological_risk_level": "mild", "active_flags": ["persistent_brain_fog"]},
    "gut": {"inflammation_risk_level": "moderate"},
    "sleep": {"sleep_stability": "low"},
    "metabolic": {"estimated_glucose_spike": "moderate"},
}


def test_run_skip_groq_output_schema():
    result = run(_SUMMARY, skip_groq=True)
    required = [
        "diet_mood_correlation", "gut_health_proxy", "metabolic_stability",
        "sleep_stability", "neurological_risk_flag", "top_insight",
        "insights_count", "insights", "disclaimer", "generated_by", "timestamp",
    ]
    for key in required:
        assert key in result, f"Missing key: {key}"


def test_run_skip_groq_disclaimer():
    result = run(_SUMMARY, skip_groq=True)
    assert result["disclaimer"] == "Informational only. Not medical advice."


def test_run_skip_groq_has_insights():
    result = run(_SUMMARY, skip_groq=True)
    assert result["insights_count"] >= 3
    assert len(result["insights"]) >= 3


def test_run_skip_groq_top_insight():
    result = run(_SUMMARY, skip_groq=True)
    assert result["top_insight"] == result["insights"][0]


def test_run_skip_groq_summary_labels():
    result = run(_SUMMARY, skip_groq=True)
    assert result["neurological_risk_flag"] == "mild"
    assert result["gut_health_proxy"] == "moderate"
    assert result["sleep_stability"] == "low"


def test_run_skip_groq_generated_by():
    result = run(_SUMMARY, skip_groq=True)
    assert "groq" in result["generated_by"]


# ─── Integration: run() with mocked Groq ────────────────────────────────────

def test_run_with_mocked_groq():
    mock_response = '["Eat more fiber", "Sleep earlier", "Reduce sugar"]'
    with patch("stage10.insights.chat", return_value=mock_response):
        result = run(_SUMMARY, skip_groq=False)
    assert result["insights_count"] == 3
    assert result["insights"][0] == "Eat more fiber"
    assert result["disclaimer"] == "Informational only. Not medical advice."


def test_run_mocked_groq_non_json():
    mock_response = "1. Eat more fiber\n2. Sleep earlier"
    with patch("stage10.insights.chat", return_value=mock_response):
        result = run(_SUMMARY, skip_groq=False)
    assert result["insights_count"] == 2
    assert result["insights"][0] == "Eat more fiber"


# ─── Edge cases ──────────────────────────────────────────────────────────────

def test_run_empty_summary_skip_groq():
    result = run({}, skip_groq=True)
    assert result["disclaimer"] == "Informational only. Not medical advice."
    assert result["insights_count"] >= 1
