"""Tests for Stage 0: User Baseline Profiling."""

import json
import os
import tempfile
from pathlib import Path
from unittest.mock import patch

import pytest

import stage0.profile as profile_module
from stage0.profile import _calculate_bmr, run, load, ACTIVITY_MULTIPLIERS


# ─── Unit: BMR formula ────────────────────────────────────────────────────────

def test_bmr_male():
    # Male: (10*76) + (6.25*170) - (5*20) + 5 = 760 + 1062.5 - 100 + 5 = 1727.5
    assert _calculate_bmr(76.0, 170.0, 20, "male") == pytest.approx(1727.5)


def test_bmr_female():
    # Female: (10*60) + (6.25*165) - (5*25) - 161 = 600 + 1031.25 - 125 - 161 = 1345.25
    assert _calculate_bmr(60.0, 165.0, 25, "female") == pytest.approx(1345.25)


def test_tdee_multipliers():
    assert ACTIVITY_MULTIPLIERS["sedentary"] == 1.2
    assert ACTIVITY_MULTIPLIERS["light"] == 1.375
    assert ACTIVITY_MULTIPLIERS["moderate"] == 1.55
    assert ACTIVITY_MULTIPLIERS["heavy"] == 1.725


# ─── Integration: run() ───────────────────────────────────────────────────────

SAMPLE_PROFILE = {
    "age": 20,
    "sex": "male",
    "height_cm": 170.0,
    "weight_kg": 76.0,
    "diet_type": "vegetarian",
    "activity_level": "heavy",
    "sleep_schedule": "23:00-06:30",
    "known_conditions": ["lactose_intolerant"],
    "supplements": ["creatine", "magnesium", "B-complex"],
    "medications": [],
}


def test_run_output_schema(tmp_path):
    with patch.object(profile_module, "USER_PROFILES_DIR", tmp_path):
        result = run("balaji_001", SAMPLE_PROFILE)

    assert result["user_id"] == "balaji_001"
    assert result["baseline_established"] is True
    assert result["bmr_kcal"] > 0
    assert result["tdee_kcal"] > result["bmr_kcal"]
    assert result["activity_multiplier"] == 1.725
    assert "timestamp" in result


def test_run_bmr_tdee_values(tmp_path):
    with patch.object(profile_module, "USER_PROFILES_DIR", tmp_path):
        result = run("balaji_001", SAMPLE_PROFILE)

    expected_bmr = _calculate_bmr(76.0, 170.0, 20, "male")
    assert result["bmr_kcal"] == pytest.approx(expected_bmr, abs=0.5)
    assert result["tdee_kcal"] == pytest.approx(expected_bmr * 1.725, abs=1.0)


def test_run_persists_to_disk(tmp_path):
    with patch.object(profile_module, "USER_PROFILES_DIR", tmp_path):
        run("balaji_001", SAMPLE_PROFILE)
        saved = load.__wrapped__("balaji_001") if hasattr(load, "__wrapped__") else None

    persisted_path = tmp_path / "balaji_001.json"
    assert persisted_path.exists()
    data = json.loads(persisted_path.read_text())
    assert data["user_id"] == "balaji_001"
    assert data["diet_type"] == "vegetarian"
    assert data["supplements"] == ["creatine", "magnesium", "B-complex"]


def test_run_optional_fields_default(tmp_path):
    minimal = {k: v for k, v in SAMPLE_PROFILE.items()
               if k in ("age", "sex", "height_cm", "weight_kg", "diet_type", "activity_level", "sleep_schedule")}
    with patch.object(profile_module, "USER_PROFILES_DIR", tmp_path):
        result = run("minimal_user", minimal)

    assert result["known_conditions"] == []
    assert result["supplements"] == []
    assert result["medications"] == []


# ─── Validation: bad inputs ───────────────────────────────────────────────────

def test_run_missing_required_field(tmp_path):
    bad = dict(SAMPLE_PROFILE)
    del bad["age"]
    with patch.object(profile_module, "USER_PROFILES_DIR", tmp_path):
        with pytest.raises(ValueError, match="age"):
            run("x", bad)


def test_run_invalid_sex(tmp_path):
    bad = dict(SAMPLE_PROFILE)
    bad["sex"] = "other"
    with patch.object(profile_module, "USER_PROFILES_DIR", tmp_path):
        with pytest.raises(ValueError, match="sex"):
            run("x", bad)


def test_run_invalid_activity_level(tmp_path):
    bad = dict(SAMPLE_PROFILE)
    bad["activity_level"] = "extreme"
    with patch.object(profile_module, "USER_PROFILES_DIR", tmp_path):
        with pytest.raises(ValueError, match="activity_level"):
            run("x", bad)


def test_run_invalid_diet_type(tmp_path):
    bad = dict(SAMPLE_PROFILE)
    bad["diet_type"] = "carnivore"
    with patch.object(profile_module, "USER_PROFILES_DIR", tmp_path):
        with pytest.raises(ValueError, match="diet_type"):
            run("x", bad)


# ─── load() ───────────────────────────────────────────────────────────────────

def test_load_returns_none_for_missing(tmp_path):
    with patch.object(profile_module, "USER_PROFILES_DIR", tmp_path):
        result = profile_module.load("nonexistent_user")
    assert result is None


def test_load_roundtrip(tmp_path):
    with patch.object(profile_module, "USER_PROFILES_DIR", tmp_path):
        written = run("balaji_001", SAMPLE_PROFILE)
        # Patch again for load
        import utils.config as cfg_module
        with patch.object(cfg_module, "USER_PROFILES_DIR", tmp_path):
            from utils.storage import read_json
            loaded = read_json(tmp_path / "balaji_001.json")
    assert loaded["bmr_kcal"] == written["bmr_kcal"]
