"""Tests for Stage 4: Mood & Cognitive State Logging."""

import pytest

from stage4.mood import (
    COGNITIVE_PENALTIES,
    EMOJI_MAP,
    _hours_between,
    _parse_timestamp,
    run,
)


# ─── Unit: emoji mapping ────────────────────────────────────────────────────

@pytest.mark.parametrize("emoji,expected_score,expected_label", [
    ("\U0001f604", 2, "very_happy"),
    ("\U0001f642", 1, "happy"),
    ("\U0001f610", 0, "neutral"),
    ("\U0001f61f", -1, "worried"),
    ("\U0001f614", -2, "sad"),
    ("\U0001f634", -1, "sleepy"),
    ("\U0001f92f", -2, "overwhelmed"),
])
def test_emoji_map(emoji, expected_score, expected_label):
    score, label = EMOJI_MAP[emoji]
    assert score == expected_score
    assert label == expected_label


# ─── Unit: cognitive penalties ───────────────────────────────────────────────

@pytest.mark.parametrize("state,expected", [
    ("sharp", 0.0),
    ("clear", 0.0),
    ("mild_fog", -0.5),
    ("brain_fog", -1.5),
    ("drowsy", -1.0),
])
def test_cognitive_penalties(state, expected):
    assert COGNITIVE_PENALTIES[state] == expected


# ─── Unit: hours_since_meal ──────────────────────────────────────────────────

def test_hours_between_basic():
    hours = _hours_between("2026-03-13T12:00:00Z", "2026-03-13T14:30:00Z")
    assert hours == pytest.approx(2.5)


def test_hours_between_same_time():
    hours = _hours_between("2026-03-13T12:00:00Z", "2026-03-13T12:00:00Z")
    assert hours == 0.0


def test_hours_between_meal_after_mood_clamps_zero():
    hours = _hours_between("2026-03-13T15:00:00Z", "2026-03-13T12:00:00Z")
    assert hours == 0.0


def test_hours_between_cross_day():
    hours = _hours_between("2026-03-13T22:00:00Z", "2026-03-14T01:00:00Z")
    assert hours == pytest.approx(3.0)


def test_parse_timestamp_z_suffix():
    dt = _parse_timestamp("2026-03-13T12:00:00Z")
    assert dt.year == 2026


def test_parse_timestamp_offset():
    dt = _parse_timestamp("2026-03-13T12:00:00+05:30")
    assert dt.year == 2026


# ─── Integration: run() ─────────────────────────────────────────────────────

_MOOD_INPUT = {
    "mood_emoji": "\U0001f61f",
    "mood_rating": 4,
    "cognitive_state": "brain_fog",
    "energy_level": "low",
    "anxiety_level": "mild",
    "timestamp": "2026-03-13T15:35:00Z",
}

_STAGE2_OUTPUT = {
    "totals": {
        "tryptophan_mg": 68.0,
        "fiber_g": 22.0,
    }
}

_MEAL_TS = "2026-03-13T13:00:00Z"


def test_run_output_schema():
    result = run(_MOOD_INPUT, _STAGE2_OUTPUT, _MEAL_TS)
    required = [
        "mood_score", "mood_label", "cognitive_state", "cognitive_penalty",
        "energy_level", "anxiety_level", "tryptophan_context_mg",
        "hours_since_meal", "timestamp",
    ]
    for key in required:
        assert key in result, f"Missing key: {key}"


def test_run_emoji_scoring():
    result = run(_MOOD_INPUT, _STAGE2_OUTPUT, _MEAL_TS)
    assert result["mood_score"] == -1
    assert result["mood_label"] == "worried"


def test_run_cognitive_penalty():
    result = run(_MOOD_INPUT, _STAGE2_OUTPUT, _MEAL_TS)
    assert result["cognitive_penalty"] == -1.5


def test_run_tryptophan_context():
    result = run(_MOOD_INPUT, _STAGE2_OUTPUT, _MEAL_TS)
    assert result["tryptophan_context_mg"] == 68.0


def test_run_hours_since_meal():
    result = run(_MOOD_INPUT, _STAGE2_OUTPUT, _MEAL_TS)
    assert result["hours_since_meal"] == pytest.approx(2.58, abs=0.02)


def test_run_passthrough_fields():
    result = run(_MOOD_INPUT, _STAGE2_OUTPUT, _MEAL_TS)
    assert result["energy_level"] == "low"
    assert result["anxiety_level"] == "mild"


def test_run_happy_emoji():
    inp = {**_MOOD_INPUT, "mood_emoji": "\U0001f604", "cognitive_state": "sharp"}
    result = run(inp, _STAGE2_OUTPUT, _MEAL_TS)
    assert result["mood_score"] == 2
    assert result["mood_label"] == "very_happy"
    assert result["cognitive_penalty"] == 0.0


def test_run_flat_stage2():
    flat = {"tryptophan_mg": 50.0}
    result = run(_MOOD_INPUT, flat, _MEAL_TS)
    assert result["tryptophan_context_mg"] == 50.0


def test_run_missing_tryptophan_defaults():
    result = run(_MOOD_INPUT, {"totals": {}}, _MEAL_TS)
    assert result["tryptophan_context_mg"] == 0.0


# ─── Validation ──────────────────────────────────────────────────────────────

def test_run_invalid_emoji():
    bad = {**_MOOD_INPUT, "mood_emoji": "X"}
    with pytest.raises(ValueError, match="Invalid Stage 4"):
        run(bad, _STAGE2_OUTPUT, _MEAL_TS)


def test_run_missing_required_field():
    bad = {k: v for k, v in _MOOD_INPUT.items() if k != "mood_emoji"}
    with pytest.raises(ValueError, match="Missing required field"):
        run(bad, _STAGE2_OUTPUT, _MEAL_TS)


def test_run_invalid_mood_rating():
    bad = {**_MOOD_INPUT, "mood_rating": 11}
    with pytest.raises(ValueError, match="Invalid Stage 4"):
        run(bad, _STAGE2_OUTPUT, _MEAL_TS)


def test_run_invalid_cognitive_state():
    bad = {**_MOOD_INPUT, "cognitive_state": "confused"}
    with pytest.raises(ValueError, match="Invalid Stage 4"):
        run(bad, _STAGE2_OUTPUT, _MEAL_TS)
