"""Tests for Stage 2: Nutritional Calibration."""

from unittest.mock import MagicMock, patch

import pytest

import stage2.nutrition as nutrition_module
from stage2.nutrition import (
    NUTRIENT_KEYS,
    _fuzzy_match,
    _levenshtein,
    _token_overlap,
    _aggregate_totals,
    _lookup_item,
    run,
)


# ─── Unit: fuzzy matching ─────────────────────────────────────────────────────

def test_token_overlap_exact():
    assert _token_overlap("masala dosa", "masala dosa") == pytest.approx(1.0)


def test_token_overlap_partial():
    score = _token_overlap("dosa", "masala dosa")
    assert 0.4 <= score <= 1.0


def test_token_overlap_no_match():
    assert _token_overlap("pizza", "idli") == pytest.approx(0.0)


def test_levenshtein_same():
    assert _levenshtein("dosa", "dosa") == 0


def test_levenshtein_one_edit():
    assert _levenshtein("dosa", "rosa") == 1


def test_levenshtein_empty():
    assert _levenshtein("abc", "") == 3


def test_fuzzy_match_alias():
    assert _fuzzy_match("dosa", "masala dosa") is True


def test_fuzzy_match_typo():
    assert _fuzzy_match("idly", "idli") is True


def test_fuzzy_match_no_match():
    assert _fuzzy_match("pizza", "sambar") is False


# ─── Unit: IFCT local DB lookup ───────────────────────────────────────────────

def test_lookup_ifct_masala_dosa():
    record = _lookup_item("masala dosa", 250.0)
    assert record["source_db"] == "IFCT_2017"
    assert record["food_item"] == "masala dosa"
    assert record["portion_g"] == 250.0
    # Scaled from 133 kcal/100g → 250g
    assert record["calories_kcal"] == pytest.approx(133 * 2.5, abs=1.0)
    assert record["glycemic_load"] in ("low", "medium", "high")


def test_lookup_ifct_idli():
    record = _lookup_item("idli", 100.0)
    assert record["source_db"] == "IFCT_2017"
    assert record["calories_kcal"] == pytest.approx(130.0, abs=1.0)


def test_lookup_ifct_alias_dosa():
    """'dosa' should match 'masala dosa' via alias."""
    record = _lookup_item("dosa", 200.0)
    assert record["source_db"] == "IFCT_2017"


def test_lookup_ifct_dal_variants():
    for query in ("dal", "toor dal", "dal tadka"):
        record = _lookup_item(query, 200.0)
        assert record["source_db"] == "IFCT_2017"


def test_lookup_all_nutrient_keys_present():
    record = _lookup_item("rice", 150.0)
    for key in NUTRIENT_KEYS:
        assert key in record, f"Missing key: {key}"


# ─── Unit: INDB fallback lookup ───────────────────────────────────────────────

def test_lookup_indb_uttapam():
    """uttapam is in INDB but not IFCT; USDA skipped if no key."""
    with patch.object(nutrition_module, "FDC_API_KEY", ""):
        record = _lookup_item("uttapam", 200.0)
    assert record["source_db"] == "INDB"
    assert record["calories_kcal"] > 0


# ─── Unit: Groq fallback ──────────────────────────────────────────────────────

def test_lookup_groq_fallback_unknown_food():
    """An unknown food should fall through to Groq."""
    mock_response = (
        '{"calories_kcal": 300, "carbohydrates_g": 40, "protein_g": 10, '
        '"fat_g": 8, "fiber_g": 5, "glycemic_load": "medium", '
        '"tryptophan_mg": 50, "omega3_mg": 30, "iron_mg": 2.0, '
        '"magnesium_mg": 30, "vitamin_b6_mg": 0.1, "vitamin_b12_ug": 0.0, "zinc_mg": 1.0}'
    )
    with patch.object(nutrition_module, "FDC_API_KEY", ""):
        with patch("stage2.nutrition.chat", return_value=mock_response):
            record = _lookup_item("utterly unknown dish xyz123", 250.0)

    assert record["source_db"] == "groq_estimate"
    assert record["calories_kcal"] == pytest.approx(300.0)
    assert record["glycemic_load"] == "medium"


def test_lookup_groq_fallback_on_groq_error():
    """If Groq also fails, return zeros rather than crashing."""
    with patch.object(nutrition_module, "FDC_API_KEY", ""):
        with patch("stage2.nutrition.chat", side_effect=Exception("network error")):
            record = _lookup_item("mystery_food_9999", 250.0)

    assert record["source_db"] == "groq_estimate"
    assert record["calories_kcal"] == 0.0


# ─── Unit: aggregation ────────────────────────────────────────────────────────

def test_aggregate_totals_sums_nutrients():
    items = [
        {k: (10.0 if k != "glycemic_load" else "low") for k in NUTRIENT_KEYS},
        {k: (20.0 if k != "glycemic_load" else "high") for k in NUTRIENT_KEYS},
    ]
    totals = _aggregate_totals(items)
    assert totals["calories_kcal"] == pytest.approx(30.0)
    assert totals["fiber_g"] == pytest.approx(30.0)
    assert totals["glycemic_load"] == "high"  # max of low and high


def test_aggregate_totals_glycemic_load_max():
    items = [
        {k: (0.0 if k != "glycemic_load" else "low") for k in NUTRIENT_KEYS},
        {k: (0.0 if k != "glycemic_load" else "medium") for k in NUTRIENT_KEYS},
    ]
    totals = _aggregate_totals(items)
    assert totals["glycemic_load"] == "medium"


# ─── Integration: run() ───────────────────────────────────────────────────────

STAGE1_OUTPUT = {
    "food_items": ["masala dosa", "sambar", "coconut chutney"],
    "en_pred": "fried_rice",
    "confidence": 0.28,
    "source": "groq",
}


def test_run_output_schema():
    result = run(STAGE1_OUTPUT)

    assert "items" in result
    assert "totals" in result
    assert "timestamp" in result
    assert len(result["items"]) == 3


def test_run_items_have_all_keys():
    result = run(STAGE1_OUTPUT)
    for item in result["items"]:
        for key in NUTRIENT_KEYS:
            assert key in item, f"Missing key '{key}' in item {item['food_item']}"


def test_run_totals_are_summed():
    result = run(STAGE1_OUTPUT)
    totals = result["totals"]
    items = result["items"]
    expected_calories = sum(i["calories_kcal"] for i in items)
    assert totals["calories_kcal"] == pytest.approx(expected_calories, abs=0.1)


def test_run_plausible_calorie_range():
    """Masala dosa + sambar + chutney at 250g each should be in a sane range."""
    result = run(STAGE1_OUTPUT)
    cal = result["totals"]["calories_kcal"]
    # 250g each of three items → expect 500-3000 kcal total (wide range for safety)
    assert 200 < cal < 5000


def test_run_custom_portion():
    result = run(STAGE1_OUTPUT, portion_g=100.0)
    # At 100g, dosa should be ~133 kcal
    dosa_item = next(i for i in result["items"] if "dosa" in i["food_item"])
    assert dosa_item["calories_kcal"] == pytest.approx(133.0, abs=2.0)


def test_run_per_item_portion_dict():
    result = run(STAGE1_OUTPUT, portion_g={"masala dosa": 150.0, "sambar": 200.0, "coconut chutney": 50.0})
    assert result["items"][0]["portion_g"] == 150.0
    assert result["items"][1]["portion_g"] == 200.0
    assert result["items"][2]["portion_g"] == 50.0


def test_run_single_item():
    result = run({"food_items": ["rice"]})
    assert len(result["items"]) == 1
    assert result["items"][0]["food_item"] == "rice"


# ─── Validation: bad inputs ───────────────────────────────────────────────────

def test_run_missing_food_items():
    with pytest.raises(ValueError, match="food_items"):
        run({})


def test_run_empty_food_items():
    with pytest.raises(ValueError, match="food_items"):
        run({"food_items": []})
