"""Stage 2: Nutrition Intelligence Engine for BioSense.

Takes a detected food label and upgrades the simple NutritionProfile
into a richer NutritionVector suitable for downstream biological models.

The logic is intentionally **rule-based and explainable**. It is not
clinically calibrated, but the features and directions follow themes
that repeatedly appear in nutrition and microbiome literature, e.g.:

- fiber and resistant starch → SCFA / butyrate production
- tryptophan → serotonin precursor
- polyphenols → anti‑inflammatory and diversity‑supporting
- omega‑3 fat → anti‑inflammatory and neuroprotective
- glycemic load → post‑prandial glucose / insulin excursions
- fermented foods → probiotic and diversity effects
"""

from __future__ import annotations

from typing import Dict

from .nutrition_lookup import get_nutrition
from schemas import NutritionVector


def _macro_heuristics(label: str) -> Dict[str, float]:
    """Very lightweight macros on a 0–10 style scale.

    The numbers below are simple, hand-tuned **relative** scores chosen to
    keep behaviour stable while encoding intuitive patterns from nutrition
    research (more legumes → more protein and fiber, etc.).

    They are placeholders for a future database, but shaped by concepts such
    as glycemic load, plant diversity, and fat quality.
    """
    label = (label or "").lower()

    # The presets roughly capture:
    # - protein: amino acid availability (including tryptophan)
    # - fat: total fat load
    # - omega3: long-chain omega‑3 richness (higher for dal / veg curry, lower for sweets)
    # - glycemic_load: higher for refined rice / banana, lower for dal / yogurt / veg mixes
    presets: Dict[str, Dict[str, float]] = {
        "dosa": {"protein": 4.0, "fat": 3.5, "omega3": 0.5, "glycemic_load": 7.0},
        "idli": {"protein": 3.0, "fat": 1.0, "omega3": 0.3, "glycemic_load": 6.0},
        "rice": {"protein": 2.0, "fat": 0.5, "omega3": 0.2, "glycemic_load": 8.0},
        "dal": {"protein": 7.0, "fat": 1.5, "omega3": 0.8, "glycemic_load": 4.5},
        "curd": {"protein": 5.0, "fat": 3.0, "omega3": 0.4, "glycemic_load": 3.0},
        "chapati": {"protein": 4.5, "fat": 1.5, "omega3": 0.6, "glycemic_load": 5.5},
        "banana": {"protein": 1.0, "fat": 0.2, "omega3": 0.1, "glycemic_load": 7.5},
        "vegetable curry": {
            "protein": 3.0,
            "fat": 2.5,
            "omega3": 0.7,
            "glycemic_load": 4.0,
        },
    }

    for key, values in presets.items():
        if key in label:
            return values

    # Generic mixed-meal fallback.
    return {"protein": 4.0, "fat": 3.0, "omega3": 0.5, "glycemic_load": 5.5}


def build_nutrition_vector(food_label: str) -> NutritionVector:
    """Return an enriched NutritionVector for a given food label.

    The output is a compact feature set used by later stages. It tries to
    encode several mechanisms that the literature associates with the
    microbiome–gut–brain axis:

    - ``fiber`` and ``resistant_starch`` → SCFA / butyrate production
    - ``polyphenol`` → microbiome diversity and anti‑oxidant tone
    - ``tryptophan`` → serotonin and kynurenine pathways
    - ``omega3`` → anti‑inflammatory and neuroprotective effects
    - ``glycemic_load`` → post‑prandial insulin and inflammatory spikes
    - ``fermented`` → probiotic exposure and diversity support
    """
    base = get_nutrition(food_label)
    macros = _macro_heuristics(food_label)

    vector: NutritionVector = {
        "fiber": float(base["fiber"]),
        "sugar": float(base["sugar"]),
        "protein": float(macros["protein"]),
        "fat": float(macros["fat"]),
        "polyphenol": float(base["polyphenol"]),
        "tryptophan": float(base["tryptophan"]),
        "omega3": float(macros["omega3"]),
        "resistant_starch": float(base["resistant_starch"]),
        "fermented": bool(base["fermented"]),
        "glycemic_load": float(macros["glycemic_load"]),
    }

    return vector

