"""Tests for Stage 3: Gut Microbiome Proxy Modeling."""

import pytest

from stage3.gut_proxy import (
    _clamp,
    _compute_dss,
    _compute_irs,
    _compute_mdi,
    _fiber_base_score,
    _irs_level,
    _scfa_proxy,
    run,
)


# ─── Unit: clamp ──────────────────────────────────────────────────────────────

def test_clamp_within():
    assert _clamp(0.5) == 0.5

def test_clamp_above():
    assert _clamp(1.5) == 1.0

def test_clamp_below():
    assert _clamp(-0.3) == 0.0


# ─── Unit: fiber base scores ──────────────────────────────────────────────────

@pytest.mark.parametrize("fiber,expected", [
    (5.0,  0.20),
    (9.9,  0.20),
    (10.0, 0.40),
    (15.0, 0.40),
    (19.9, 0.40),
    (20.0, 0.60),
    (25.0, 0.60),
    (29.9, 0.60),
    (30.0, 0.80),
    (40.0, 0.80),
    (40.1, 0.95),
    (60.0, 0.95),
])
def test_fiber_base_score(fiber, expected):
    assert _fiber_base_score(fiber) == pytest.approx(expected)


# ─── Unit: MDI ────────────────────────────────────────────────────────────────

def test_mdi_no_modifiers():
    # fiber=22g → base=0.6, no modifiers
    mdi = _compute_mdi(22.0, fermented_food_today=False, stool_quality=1, bloating="none")
    assert mdi == pytest.approx(0.60)

def test_mdi_fermented_food_bonus():
    # fiber=22g → base=0.6, +0.08 fermented
    mdi = _compute_mdi(22.0, fermented_food_today=True, stool_quality=1, bloating="none")
    assert mdi == pytest.approx(0.68)

def test_mdi_optimal_stool_bonus():
    # fiber=22g → 0.6, stool type 3 → +0.05
    mdi = _compute_mdi(22.0, fermented_food_today=False, stool_quality=3, bloating="none")
    assert mdi == pytest.approx(0.65)

def test_mdi_stool_type4_bonus():
    # Type 4 also optimal
    mdi = _compute_mdi(22.0, fermented_food_today=False, stool_quality=4, bloating="none")
    assert mdi == pytest.approx(0.65)

def test_mdi_no_bonus_for_non_optimal_stool():
    for t in (1, 2, 5, 6, 7):
        mdi = _compute_mdi(22.0, False, t, "none")
        assert mdi == pytest.approx(0.60), f"stool type {t} should give no bonus"

def test_mdi_severe_bloating_penalty():
    # fiber=22g → 0.6, severe bloating → -0.10
    mdi = _compute_mdi(22.0, fermented_food_today=False, stool_quality=4, bloating="severe")
    assert mdi == pytest.approx(0.55)

def test_mdi_all_positive_modifiers():
    # fiber=22g → 0.6, +0.08 fermented, +0.05 stool type 3 = 0.73
    mdi = _compute_mdi(22.0, fermented_food_today=True, stool_quality=3, bloating="none")
    assert mdi == pytest.approx(0.73)

def test_mdi_clamps_to_one():
    # fiber=50g → 0.95, +0.08 fermented, +0.05 stool = 1.08 → clamp to 1.0
    mdi = _compute_mdi(50.0, fermented_food_today=True, stool_quality=3, bloating="none")
    assert mdi == pytest.approx(1.0)

def test_mdi_clamps_to_zero():
    # fiber=5g → 0.2, severe bloating -0.10 = 0.10, still > 0
    mdi_low = _compute_mdi(5.0, False, 7, "severe")
    assert 0.0 <= mdi_low <= 1.0


# ─── Unit: IRS ────────────────────────────────────────────────────────────────

def test_irs_baseline():
    # No triggers → IRS = 0.5
    irs = _compute_irs(10.0, fat_g=15.0, carbohydrates_g=30.0, omega3_mg=0.0,
                       fermented_food_today=False, bloating="none")
    assert irs == pytest.approx(0.5)

def test_irs_high_fat():
    irs = _compute_irs(10.0, fat_g=25.0, carbohydrates_g=30.0, omega3_mg=0.0,
                       fermented_food_today=False, bloating="none")
    assert irs == pytest.approx(0.65)

def test_irs_high_carbs():
    irs = _compute_irs(10.0, fat_g=10.0, carbohydrates_g=60.0, omega3_mg=0.0,
                       fermented_food_today=False, bloating="none")
    assert irs == pytest.approx(0.70)

def test_irs_high_fiber_reduces():
    irs = _compute_irs(30.0, fat_g=10.0, carbohydrates_g=30.0, omega3_mg=0.0,
                       fermented_food_today=False, bloating="none")
    assert irs == pytest.approx(0.35)

def test_irs_omega3_reduces():
    irs = _compute_irs(10.0, fat_g=10.0, carbohydrates_g=30.0, omega3_mg=100.0,
                       fermented_food_today=False, bloating="none")
    assert irs == pytest.approx(0.40)

def test_irs_fermented_reduces():
    irs = _compute_irs(10.0, fat_g=10.0, carbohydrates_g=30.0, omega3_mg=0.0,
                       fermented_food_today=True, bloating="none")
    assert irs == pytest.approx(0.42)

def test_irs_severe_bloating_increases():
    irs = _compute_irs(10.0, fat_g=10.0, carbohydrates_g=30.0, omega3_mg=0.0,
                       fermented_food_today=False, bloating="severe")
    assert irs == pytest.approx(0.62)

def test_irs_all_anti_inflammatory():
    # high fiber + omega3 + fermented → maximum reduction
    irs = _compute_irs(30.0, fat_g=5.0, carbohydrates_g=20.0, omega3_mg=200.0,
                       fermented_food_today=True, bloating="none")
    # 0.5 - 0.15 - 0.10 - 0.08 = 0.17 → clamp to 0.17
    assert irs == pytest.approx(0.17)

def test_irs_clamps_to_one():
    irs = _compute_irs(0.0, fat_g=30.0, carbohydrates_g=80.0, omega3_mg=0.0,
                       fermented_food_today=False, bloating="severe")
    # 0.5 + 0.15 + 0.20 + 0.12 = 0.97 < 1.0 → no clamp needed here
    assert irs <= 1.0

def test_irs_level_low():
    assert _irs_level(0.2) == "low"
    assert _irs_level(0.29) == "low"

def test_irs_level_moderate():
    assert _irs_level(0.3) == "moderate"
    assert _irs_level(0.5) == "moderate"
    assert _irs_level(0.6) == "moderate"

def test_irs_level_high():
    assert _irs_level(0.61) == "high"
    assert _irs_level(1.0) == "high"


# ─── Unit: DSS ────────────────────────────────────────────────────────────────

@pytest.mark.parametrize("stool,expected_base", [
    (3, 1.0), (4, 1.0),       # optimal
    (2, 0.6), (5, 0.6),       # acceptable
    (1, 0.3), (6, 0.3), (7, 0.3),  # poor
])
def test_dss_bristol_base(stool, expected_base):
    dss = _compute_dss(stool, bloating="none", gas_discomfort="none")
    assert dss == pytest.approx(expected_base)

def test_dss_mild_bloating():
    dss = _compute_dss(4, bloating="mild", gas_discomfort="none")
    assert dss == pytest.approx(0.95)

def test_dss_moderate_bloating():
    dss = _compute_dss(4, bloating="moderate", gas_discomfort="none")
    assert dss == pytest.approx(0.85)

def test_dss_severe_bloating():
    dss = _compute_dss(4, bloating="severe", gas_discomfort="none")
    assert dss == pytest.approx(0.75)

def test_dss_mild_gas():
    dss = _compute_dss(4, bloating="none", gas_discomfort="mild")
    assert dss == pytest.approx(0.97)

def test_dss_combined_penalties():
    # stool=4: 1.0, severe bloating: -0.25, severe gas: -0.20 = 0.55
    dss = _compute_dss(4, bloating="severe", gas_discomfort="severe")
    assert dss == pytest.approx(0.55)

def test_dss_clamps_to_zero():
    # stool=1 (0.3) + severe bloating (-0.25) + severe gas (-0.20) = -0.15 → 0.0
    dss = _compute_dss(1, bloating="severe", gas_discomfort="severe")
    assert dss == pytest.approx(0.0)


# ─── Unit: SCFA proxy ─────────────────────────────────────────────────────────

@pytest.mark.parametrize("fiber,expected", [
    (5.0,  "low"),
    (9.9,  "low"),
    (10.0, "moderate"),
    (20.0, "moderate"),
    (25.0, "moderate"),
    (25.1, "high"),
    (40.0, "high"),
])
def test_scfa_proxy(fiber, expected):
    assert _scfa_proxy(fiber) == expected


# ─── Integration: run() ───────────────────────────────────────────────────────

_STAGE2_GOOD = {
    "totals": {
        "fiber_g": 28.0,
        "fat_g": 14.0,
        "carbohydrates_g": 45.0,
        "omega3_mg": 120.0,
    }
}

_DIGESTION_GOOD = {
    "bloating": "none",
    "stool_quality": 4,
    "digestion_quality": "good",
    "fermented_food_today": True,
    "gas_discomfort": "none",
}

_DIGESTION_BAD = {
    "bloating": "severe",
    "stool_quality": 7,
    "digestion_quality": "poor",
    "fermented_food_today": False,
    "gas_discomfort": "severe",
}


def test_run_output_schema():
    result = run(_STAGE2_GOOD, _DIGESTION_GOOD)
    required_keys = [
        "microbiome_diversity_index",
        "inflammation_risk_score",
        "inflammation_risk_level",
        "digestion_stability_score",
        "scfa_production_proxy",
        "fiber_intake_today_g",
        "fermented_food_consumed",
        "timestamp",
    ]
    for key in required_keys:
        assert key in result, f"Missing key: {key}"


def test_run_values_in_range():
    result = run(_STAGE2_GOOD, _DIGESTION_GOOD)
    assert 0.0 <= result["microbiome_diversity_index"] <= 1.0
    assert 0.0 <= result["inflammation_risk_score"] <= 1.0
    assert 0.0 <= result["digestion_stability_score"] <= 1.0


def test_run_good_diet_better_than_bad():
    good = run(_STAGE2_GOOD, _DIGESTION_GOOD)
    bad = run(
        {"totals": {"fiber_g": 5.0, "fat_g": 30.0, "carbohydrates_g": 80.0, "omega3_mg": 0.0}},
        _DIGESTION_BAD,
    )
    assert good["microbiome_diversity_index"] > bad["microbiome_diversity_index"]
    assert good["digestion_stability_score"] > bad["digestion_stability_score"]
    assert good["inflammation_risk_score"] < bad["inflammation_risk_score"]


def test_run_irs_level_matches_score():
    result = run(_STAGE2_GOOD, _DIGESTION_GOOD)
    irs = result["inflammation_risk_score"]
    level = result["inflammation_risk_level"]
    if irs < 0.3:
        assert level == "low"
    elif irs <= 0.6:
        assert level == "moderate"
    else:
        assert level == "high"


def test_run_accepts_flat_totals():
    """Stage 2 output can be passed as a flat dict (direct totals)."""
    flat = {"fiber_g": 20.0, "fat_g": 10.0, "carbohydrates_g": 40.0, "omega3_mg": 50.0}
    result = run(flat, _DIGESTION_GOOD)
    assert "microbiome_diversity_index" in result


def test_run_missing_nutrition_defaults_to_zero():
    result = run({}, _DIGESTION_GOOD)
    assert result["fiber_intake_today_g"] == 0.0
    assert result["scfa_production_proxy"] == "low"


def test_run_fermented_food_flag():
    result = run(_STAGE2_GOOD, _DIGESTION_GOOD)
    assert result["fermented_food_consumed"] is True

    result2 = run(_STAGE2_GOOD, {**_DIGESTION_GOOD, "fermented_food_today": False})
    assert result2["fermented_food_consumed"] is False


def test_run_spec_example():
    """
    Replicate the SPEC example (fiber=22g, fermented=True, good stool, no bloating).
    Expected MDI ≈ 0.68 (0.60 + 0.08 fermented).
    """
    stage2 = {"totals": {"fiber_g": 22.0, "fat_g": 10.0, "carbohydrates_g": 45.0, "omega3_mg": 80.0}}
    digestion = {
        "bloating": "none",
        "stool_quality": 4,
        "digestion_quality": "good",
        "fermented_food_today": True,
        "gas_discomfort": "none",
    }
    result = run(stage2, digestion)
    # 0.60 (fiber 22g) + 0.08 (fermented) + 0.05 (stool type 4) = 0.73
    assert result["microbiome_diversity_index"] == pytest.approx(0.73)
    assert result["scfa_production_proxy"] == "moderate"
