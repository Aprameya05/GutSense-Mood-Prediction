"""Stage 2: Nutrition Intelligence Engine for BioSense.

Takes a detected food label and upgrades the simple NutritionProfile
into a richer NutritionVector suitable for downstream biological models.
"""

from __future__ import annotations

from typing import Dict

from .nutrition_lookup import get_nutrition
from schemas import NutritionVector


def _macro_heuristics(label: str) -> Dict[str, float]:
    """Very lightweight macros on a 0–10 research-style scale.

    These are deterministic heuristics chosen for interpretability, not
    clinical accuracy. They can be swapped with a proper database later.
    """
    label = (label or "").lower()

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
    """Return an enriched NutritionVector for a given food label."""
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

