"""Tests for the modal CLI in run_pipeline.py.

Each mode is tested with mocked stage functions to avoid external dependencies
(Groq, model loading, USDA API, etc.).
"""

import json
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

import run_pipeline


# ─── Shared mock returns ─────────────────────────────────────────────────────

_STAGE0 = {
    "user_id": "test_001",
    "age": 28,
    "sex": "male",
    "height_cm": 170,
    "weight_kg": 70,
    "diet_type": "vegetarian",
    "activity_level": "moderate",
    "bmr_kcal": 1650.0,
    "tdee_kcal": 2560.0,
}

_STAGE1 = {
    "food_items": ["masala dosa", "sambar"],
    "en_pred": "fried_rice",
    "confidence": 0.3,
    "source": "stub",
}

_STAGE2 = {
    "items": [],
    "totals": {
        "calories_kcal": 500.0,
        "carbs_g": 65.0,
        "protein_g": 14.0,
        "fat_g": 12.0,
        "fiber_g": 7.0,
        "glycemic_load": "medium",
        "tryptophan_mg": 55.0,
        "omega3_mg": 15.0,
        "iron_mg": 3.5,
        "magnesium_mg": 42.0,
        "b6_mg": 0.4,
        "b12_mcg": 0.1,
        "zinc_mg": 2.0,
    },
}

_STAGE4 = {
    "mood_score": 1,
    "mood_label": "slightly_positive",
    "cognitive_state": "clear",
    "cognitive_penalty": 0.0,
    "energy_level": "moderate",
    "anxiety_level": "none",
    "emoji_used": "\U0001f610",
    "tryptophan_context_mg": 55.0,
    "hours_since_meal": 0.0,
    "timestamp": "2026-03-13T12:00:00+00:00",
}

_STAGE5 = {
    "estimated_glucose_spike": "moderate",
    "spike_delta_mg_dl": 35.0,
    "fiber_attenuation_factor": 0.85,
    "energy_crash_probability": 0.25,
    "late_meal_penalty_applied": False,
    "insulin_demand_proxy": "moderate",
    "timestamp": "2026-03-13T12:00:00+00:00",
}

_STAGE6 = {
    "sleep_hours": 7.0,
    "sleep_debt": 0.5,
    "cumulative_debt_7d": 2.0,
    "circadian_regularity_index": 0.85,
    "neurological_stress_proxy": 0.3,
    "sleep_stability": "moderate",
    "sleep_quality": "good",
    "sleep_onset": "23:30",
    "wake_time": "06:30",
    "night_awakenings": 1,
    "caffeine_after_14h": False,
    "screen_before_bed_min": 30,
    "timestamp": "2026-03-13T12:00:00+00:00",
}

_STAGE3 = {
    "microbiome_diversity_index": 0.6,
    "inflammation_risk_score": 0.35,
    "inflammation_risk_level": "low",
    "digestion_stability_score": 0.75,
    "scfa_production_proxy": "moderate",
    "fiber_intake_today_g": 7.0,
    "fermented_food_consumed": False,
    "timestamp": "2026-03-13T12:00:00+00:00",
}

_STAGE10 = {
    "insights": ["Eat more fiber", "Sleep earlier"],
    "neurological_risk_flag": "none",
    "disclaimer": "Informational only.",
    "diet_mood_correlation": "moderate",
    "gut_health_proxy": "good",
    "metabolic_stability": "moderate",
    "sleep_stability": "moderate",
    "top_insight": "Eat more fiber",
    "insights_count": 2,
    "generated_by": "stub",
    "timestamp": "2026-03-13T12:00:00+00:00",
}


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _seed_profile(tmp_path: Path, user_id: str = "test_001"):
    """Write a minimal user profile JSON for stage0.load to find."""
    profiles_dir = tmp_path / "data" / "user_profiles"
    profiles_dir.mkdir(parents=True, exist_ok=True)
    (profiles_dir / f"{user_id}.json").write_text(json.dumps(_STAGE0), encoding="utf-8")


# ─── Meal mode ───────────────────────────────────────────────────────────────

class TestMealMode:
    @patch("run_pipeline.append_meal")
    @patch("stage5.metabolic.run", return_value=_STAGE5)
    @patch("stage4.mood.run", return_value=_STAGE4)
    @patch("stage2.nutrition.run", return_value=_STAGE2)
    @patch("pipeline.analyze_food_image", return_value=dict(_STAGE1))
    @patch("stage0.profile.load", return_value=_STAGE0)
    def test_meal_mode_calls_stages(
        self, mock_s0, mock_s1, mock_s2, mock_s4, mock_s5, mock_append
    ):
        from utils.daily_log_schema import empty_daily_log
        mock_append.return_value = empty_daily_log("2026-03-13")

        result = run_pipeline.main([
            "--mode", "meal", "--image", "test.jpg", "--user", "test_001",
        ])

        mock_s0.assert_called_once_with("test_001")
        mock_s1.assert_called_once_with("test.jpg")
        mock_s2.assert_called_once()
        mock_s4.assert_called_once()
        mock_s5.assert_called_once()
        mock_append.assert_called_once()

    @patch("run_pipeline.append_meal")
    @patch("stage5.metabolic.run", return_value=_STAGE5)
    @patch("stage4.mood.run", return_value=_STAGE4)
    @patch("stage2.nutrition.run", return_value=_STAGE2)
    @patch("pipeline.analyze_food_image", return_value=dict(_STAGE1))
    @patch("stage0.profile.load", return_value=_STAGE0)
    def test_meal_data_has_stage5(
        self, mock_s0, mock_s1, mock_s2, mock_s4, mock_s5, mock_append
    ):
        from utils.daily_log_schema import empty_daily_log
        mock_append.return_value = empty_daily_log("2026-03-13")

        run_pipeline.main([
            "--mode", "meal", "--image", "test.jpg", "--user", "test_001",
        ])

        meal_data = mock_append.call_args[0][1]
        assert "stage5" in meal_data
        assert meal_data["stage5"]["estimated_glucose_spike"] == "moderate"
        assert "stage1" in meal_data
        assert "stage2" in meal_data
        assert "stage4" in meal_data

    @patch("stage0.profile.load", return_value=None)
    def test_meal_mode_exits_without_profile(self, mock_s0):
        with pytest.raises(SystemExit):
            run_pipeline.main(["--mode", "meal", "--image", "test.jpg", "--user", "nobody"])

    def test_meal_mode_requires_image(self):
        with pytest.raises(SystemExit):
            run_pipeline.main(["--mode", "meal", "--user", "test_001"])


# ─── Sleep mode ──────────────────────────────────────────────────────────────

class TestSleepMode:
    @patch("run_pipeline.update_sleep")
    @patch("run_pipeline._load_sleep_history_7d", return_value=[])
    @patch("stage6.sleep.run", return_value=_STAGE6)
    def test_sleep_mode_calls_stage6(self, mock_s6, mock_hist, mock_update):
        mock_update.return_value = {}

        result = run_pipeline.main([
            "--mode", "sleep", "--user", "test_001",
            "--sleep-onset", "23:30", "--wake-time", "06:30",
            "--sleep-quality", "good",
        ])

        mock_s6.assert_called_once()
        mock_update.assert_called_once()
        assert result["sleep_hours"] == 7.0

    def test_sleep_mode_requires_times(self):
        with pytest.raises(SystemExit):
            run_pipeline.main(["--mode", "sleep", "--user", "test_001"])


# ─── Digestion mode ──────────────────────────────────────────────────────────

class TestDigestionMode:
    @patch("run_pipeline.write_json")
    @patch("run_pipeline.ensure_dir")
    @patch("run_pipeline.load_daily_log")
    @patch("run_pipeline.update_digestion")
    @patch("stage3.gut_proxy.run", return_value=_STAGE3)
    def test_digestion_mode_uses_daily_totals(
        self, mock_s3, mock_upd, mock_load, mock_ensure, mock_write
    ):
        from utils.daily_log_schema import empty_daily_log
        log = empty_daily_log("2026-03-13")
        log["daily_totals"]["fiber_g"] = 20.0
        mock_load.return_value = log
        mock_upd.return_value = log

        result = run_pipeline.main([
            "--mode", "digestion", "--user", "test_001",
            "--bloating", "none", "--stool-quality", "4",
        ])

        # stage3 received daily_totals wrapped as {"totals": ...}
        s3_call_args = mock_s3.call_args[0]
        nutrition_arg = s3_call_args[0]
        assert "totals" in nutrition_arg
        assert nutrition_arg["totals"]["fiber_g"] == 20.0

        assert result["microbiome_diversity_index"] == 0.6

    @patch("run_pipeline.write_json")
    @patch("run_pipeline.ensure_dir")
    @patch("run_pipeline.load_daily_log")
    @patch("run_pipeline.update_digestion")
    @patch("stage3.gut_proxy.run", return_value=_STAGE3)
    def test_digestion_saves_daily_gut(
        self, mock_s3, mock_upd, mock_load, mock_ensure, mock_write
    ):
        from utils.daily_log_schema import empty_daily_log
        log = empty_daily_log("2026-03-13")
        mock_load.return_value = log
        mock_upd.return_value = log

        run_pipeline.main([
            "--mode", "digestion", "--user", "test_001",
        ])

        written_log = mock_write.call_args[0][1]
        assert written_log["daily_gut"]["microbiome_diversity_index"] == 0.6


# ─── Daily-summary mode ─────────────────────────────────────────────────────

class TestDailySummaryMode:
    @patch("stage10.insights.run", return_value=_STAGE10)
    @patch("run_pipeline._load_daily_log_count", return_value=5)
    @patch("run_pipeline._load_flat_records", return_value=[])
    @patch("run_pipeline.load_daily_log")
    @patch("stage0.profile.load", return_value=_STAGE0)
    def test_summary_skips_stages_7_8_under_30_days(
        self, mock_s0, mock_load_log, mock_flat, mock_count, mock_s10
    ):
        from utils.daily_log_schema import empty_daily_log
        mock_load_log.return_value = empty_daily_log("2026-03-13")

        result = run_pipeline.main([
            "--mode", "daily-summary", "--user", "test_001", "--skip-groq",
        ])

        mock_s10.assert_called_once()
        assert result["neurological_risk_flag"] == "none"

    @patch("stage10.insights.run", return_value=_STAGE10)
    @patch("stage9.risk.run", return_value={"neurological_risk_level": "none", "active_flags": [], "risk_count": 0})
    @patch("stage8.baseline.run", return_value={"all_baselines_stable": True, "baseline_mood": 1.0})
    @patch("stage7.patterns.run", return_value={"significant_correlations": [], "anomalies_detected": 0})
    @patch("run_pipeline._load_daily_log_count", return_value=35)
    @patch("run_pipeline._load_flat_records", return_value=[{"date": f"2026-02-{d:02d}"} for d in range(1, 36)])
    @patch("run_pipeline.load_daily_log")
    @patch("stage0.profile.load", return_value=_STAGE0)
    def test_summary_runs_all_stages_with_30_days(
        self, mock_s0, mock_load_log, mock_flat, mock_count,
        mock_s7, mock_s8, mock_s9, mock_s10
    ):
        from utils.daily_log_schema import empty_daily_log
        mock_load_log.return_value = empty_daily_log("2026-03-13")

        result = run_pipeline.main([
            "--mode", "daily-summary", "--user", "test_001", "--skip-groq",
        ])

        mock_s7.assert_called_once()
        mock_s8.assert_called_once()
        mock_s9.assert_called_once()
        mock_s10.assert_called_once()


# ─── skip-groq passthrough ───────────────────────────────────────────────────

class TestSkipGroq:
    @patch("stage10.insights.run", return_value=_STAGE10)
    @patch("run_pipeline._load_daily_log_count", return_value=5)
    @patch("run_pipeline._load_flat_records", return_value=[])
    @patch("run_pipeline.load_daily_log")
    @patch("stage0.profile.load", return_value=_STAGE0)
    def test_skip_groq_passed_to_stage10(
        self, mock_s0, mock_load_log, mock_flat, mock_count, mock_s10
    ):
        from utils.daily_log_schema import empty_daily_log
        mock_load_log.return_value = empty_daily_log("2026-03-13")

        run_pipeline.main([
            "--mode", "daily-summary", "--user", "test_001", "--skip-groq",
        ])

        _, kwargs = mock_s10.call_args
        assert kwargs.get("skip_groq") is True
