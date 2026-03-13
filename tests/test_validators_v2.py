"""Tests for the multi-meal / nested-schema validators added in v2."""

import pytest

from utils.daily_log_schema import empty_daily_log
from utils.validators import (
    validate_daily_log,
    validate_digestion_input,
    validate_meal_entry,
    validate_sleep_input,
)


# ─── Fixtures ────────────────────────────────────────────────────────────────

def _valid_meal() -> dict:
    return {
        "meal_id": "lunch",
        "meal_time": "12:30",
        "stage1": {
            "food_items": ["rice", "dal"],
            "en_pred": "fried_rice",
            "confidence": 0.4,
            "source": "groq",
            "timestamp": "2026-03-13T12:30:00+00:00",
        },
        "stage2": {
            "items": [],
            "totals": {
                "calories_kcal": 450.0,
                "carbs_g": 60.0,
                "protein_g": 12.0,
                "fat_g": 10.0,
                "fiber_g": 5.0,
                "glycemic_load": "medium",
                "tryptophan_mg": 50.0,
                "omega3_mg": 10.0,
                "iron_mg": 3.0,
                "magnesium_mg": 40.0,
                "b6_mg": 0.5,
                "b12_mcg": 0.0,
                "zinc_mg": 2.0,
            },
        },
    }


def _valid_daily_log() -> dict:
    log = empty_daily_log("2026-03-13")
    log["meals"].append(_valid_meal())
    return log


def _valid_sleep() -> dict:
    return {
        "sleep_onset": "23:00",
        "wake_time": "06:30",
        "sleep_quality": "good",
    }


def _valid_digestion() -> dict:
    return {
        "bloating": "none",
        "stool_quality": 4,
        "gas_discomfort": "none",
        "fermented_food_today": False,
    }


# ─── validate_daily_log ─────────────────────────────────────────────────────

class TestValidateDailyLog:
    def test_valid_empty(self):
        log = empty_daily_log("2026-03-13")
        assert validate_daily_log(log) == []

    def test_valid_with_meal(self):
        assert validate_daily_log(_valid_daily_log()) == []

    def test_not_dict(self):
        errors = validate_daily_log("nope")
        assert errors == ["daily_log must be a dict"]

    def test_missing_top_keys(self):
        errors = validate_daily_log({})
        assert any("Missing top-level key: date" in e for e in errors)
        assert any("Missing top-level key: meals" in e for e in errors)

    def test_wrong_type_for_meals(self):
        log = empty_daily_log("2026-03-13")
        log["meals"] = "bad"
        errors = validate_daily_log(log)
        assert any("'meals' must be list" in e for e in errors)

    def test_bad_diet_type(self):
        log = empty_daily_log("2026-03-13")
        log["diet_type"] = "carnivore"
        errors = validate_daily_log(log)
        assert any("diet_type" in e for e in errors)

    def test_missing_daily_totals_key(self):
        log = empty_daily_log("2026-03-13")
        del log["daily_totals"]["fiber_g"]
        errors = validate_daily_log(log)
        assert any("daily_totals missing key: fiber_g" in e for e in errors)

    def test_missing_daily_gut_key(self):
        log = empty_daily_log("2026-03-13")
        del log["daily_gut"]["microbiome_diversity_index"]
        errors = validate_daily_log(log)
        assert any("daily_gut missing key: microbiome_diversity_index" in e for e in errors)

    def test_missing_daily_mood_key(self):
        log = empty_daily_log("2026-03-13")
        del log["daily_mood_summary"]["avg_mood_score"]
        errors = validate_daily_log(log)
        assert any("daily_mood_summary missing key: avg_mood_score" in e for e in errors)

    def test_invalid_meal_inside_log(self):
        log = empty_daily_log("2026-03-13")
        log["meals"].append({"meal_id": "lunch"})  # missing stage1/stage2
        errors = validate_daily_log(log)
        assert any("meals[0]" in e for e in errors)


# ─── validate_meal_entry ─────────────────────────────────────────────────────

class TestValidateMealEntry:
    def test_valid(self):
        assert validate_meal_entry(_valid_meal()) == []

    def test_valid_without_optional_stages(self):
        meal = _valid_meal()
        meal.pop("stage4", None)
        meal.pop("stage5", None)
        assert validate_meal_entry(meal) == []

    def test_not_dict(self):
        assert validate_meal_entry(42) == ["meal entry must be a dict"]

    def test_missing_meal_id(self):
        meal = _valid_meal()
        del meal["meal_id"]
        errors = validate_meal_entry(meal)
        assert any("meal_id" in e for e in errors)

    def test_meal_id_wrong_type(self):
        meal = _valid_meal()
        meal["meal_id"] = 123
        errors = validate_meal_entry(meal)
        assert any("meal_id must be a string" in e for e in errors)

    def test_missing_stage1(self):
        meal = _valid_meal()
        del meal["stage1"]
        errors = validate_meal_entry(meal)
        assert any("Missing required field: stage1" in e for e in errors)

    def test_stage1_missing_food_items(self):
        meal = _valid_meal()
        del meal["stage1"]["food_items"]
        errors = validate_meal_entry(meal)
        assert any("food_items" in e for e in errors)

    def test_stage1_missing_timestamp(self):
        meal = _valid_meal()
        del meal["stage1"]["timestamp"]
        errors = validate_meal_entry(meal)
        assert any("timestamp" in e for e in errors)

    def test_missing_stage2(self):
        meal = _valid_meal()
        del meal["stage2"]
        errors = validate_meal_entry(meal)
        assert any("Missing required field: stage2" in e for e in errors)

    def test_stage2_missing_totals(self):
        meal = _valid_meal()
        del meal["stage2"]["totals"]
        errors = validate_meal_entry(meal)
        assert any("totals" in e for e in errors)


# ─── validate_sleep_input ────────────────────────────────────────────────────

class TestValidateSleepInput:
    def test_valid_minimal(self):
        assert validate_sleep_input(_valid_sleep()) == []

    def test_valid_with_optionals(self):
        data = {
            **_valid_sleep(),
            "night_awakenings": 1,
            "caffeine_after_14h": True,
            "screen_before_bed_min": 45,
        }
        assert validate_sleep_input(data) == []

    def test_not_dict(self):
        assert validate_sleep_input([1, 2]) == ["sleep input must be a dict"]

    def test_missing_sleep_onset(self):
        data = _valid_sleep()
        del data["sleep_onset"]
        errors = validate_sleep_input(data)
        assert any("sleep_onset" in e for e in errors)

    def test_missing_wake_time(self):
        data = _valid_sleep()
        del data["wake_time"]
        errors = validate_sleep_input(data)
        assert any("wake_time" in e for e in errors)

    def test_missing_sleep_quality(self):
        data = _valid_sleep()
        del data["sleep_quality"]
        errors = validate_sleep_input(data)
        assert any("sleep_quality" in e for e in errors)

    def test_bad_sleep_quality(self):
        data = _valid_sleep()
        data["sleep_quality"] = "amazing"
        errors = validate_sleep_input(data)
        assert any("sleep_quality" in e for e in errors)

    def test_negative_awakenings(self):
        data = {**_valid_sleep(), "night_awakenings": -1}
        errors = validate_sleep_input(data)
        assert any("night_awakenings" in e for e in errors)

    def test_bad_caffeine_type(self):
        data = {**_valid_sleep(), "caffeine_after_14h": "yes"}
        errors = validate_sleep_input(data)
        assert any("caffeine_after_14h" in e for e in errors)

    def test_negative_screen(self):
        data = {**_valid_sleep(), "screen_before_bed_min": -10}
        errors = validate_sleep_input(data)
        assert any("screen_before_bed_min" in e for e in errors)


# ─── validate_digestion_input ────────────────────────────────────────────────

class TestValidateDigestionInput:
    def test_valid(self):
        assert validate_digestion_input(_valid_digestion()) == []

    def test_not_dict(self):
        assert validate_digestion_input(None) == ["digestion input must be a dict"]

    def test_missing_bloating(self):
        data = _valid_digestion()
        del data["bloating"]
        errors = validate_digestion_input(data)
        assert any("bloating" in e for e in errors)

    def test_bad_bloating(self):
        data = _valid_digestion()
        data["bloating"] = "extreme"
        errors = validate_digestion_input(data)
        assert any("bloating" in e for e in errors)

    def test_missing_stool_quality(self):
        data = _valid_digestion()
        del data["stool_quality"]
        errors = validate_digestion_input(data)
        assert any("stool_quality" in e for e in errors)

    def test_stool_out_of_range(self):
        data = _valid_digestion()
        data["stool_quality"] = 8
        errors = validate_digestion_input(data)
        assert any("stool_quality must be between 1 and 7" in e for e in errors)

    def test_stool_zero(self):
        data = _valid_digestion()
        data["stool_quality"] = 0
        errors = validate_digestion_input(data)
        assert any("stool_quality must be between 1 and 7" in e for e in errors)

    def test_missing_gas(self):
        data = _valid_digestion()
        del data["gas_discomfort"]
        errors = validate_digestion_input(data)
        assert any("gas_discomfort" in e for e in errors)

    def test_bad_gas(self):
        data = _valid_digestion()
        data["gas_discomfort"] = "terrible"
        errors = validate_digestion_input(data)
        assert any("gas_discomfort" in e for e in errors)

    def test_missing_fermented(self):
        data = _valid_digestion()
        del data["fermented_food_today"]
        errors = validate_digestion_input(data)
        assert any("fermented_food_today" in e for e in errors)

    def test_bad_fermented_type(self):
        data = _valid_digestion()
        data["fermented_food_today"] = "yes"
        errors = validate_digestion_input(data)
        assert any("fermented_food_today must be a boolean" in e for e in errors)
