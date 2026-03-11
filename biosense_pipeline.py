"""BioSense pipeline: image -> foods -> multi-layer biological state.

This extends the original GutSense flow into a richer, research-style
Bio-AI system with additional biological layers and prediction heads.
"""

from __future__ import annotations

from typing import List

from full_pipeline import analyze_meal as analyze_meal_legacy
from schemas import (
    BioSenseAnalysis,
    FoodDetection,
    HealthScore,
    MicrobiomeState,
    NeuroState,
    NutritionVector,
    PredictionState,
)
from stage2.nutrition_engine import build_nutrition_vector
from stage3.microbiome_engine import compute_microbiome_state
from stage4.neuro_engine import compute_neuro_state
from stage5.prediction_engine import predict_state
from stage6.health_score import compute_health_score
from stage7.explainer import build_explanation


def analyze_image_biosense(image_path: str) -> BioSenseAnalysis:
    """Run the full BioSense pipeline on a meal image.

    This function wraps the existing `full_pipeline.analyze_meal` for
    backwards compatibility while layering additional engines on top.
    """
    legacy = analyze_meal_legacy(image_path)
    foods: List[FoodDetection] = legacy["foods"]

    enriched_nutrition: List[NutritionVector] = []
    for food in foods:
        label = str(food.get("food_item", "")).lower()
        enriched_nutrition.append(build_nutrition_vector(label))

    # If no foods are detected, still generate a neutral placeholder vector
    # so the UI can display a stable state.
    if not enriched_nutrition:
        enriched_nutrition.append(
            build_nutrition_vector("mixed meal"),
        )

    # Aggregate nutrition across foods by simple averaging.
    def _avg(key: str) -> float:
        return float(
            sum(float(n[key]) for n in enriched_nutrition) / max(len(enriched_nutrition), 1),
        )

    avg_nutrition: NutritionVector = {
        "fiber": _avg("fiber"),
        "sugar": _avg("sugar"),
        "protein": _avg("protein"),
        "fat": _avg("fat"),
        "polyphenol": _avg("polyphenol"),
        "tryptophan": _avg("tryptophan"),
        "omega3": _avg("omega3"),
        "resistant_starch": _avg("resistant_starch"),
        "fermented": any(n["fermented"] for n in enriched_nutrition),
        "glycemic_load": _avg("glycemic_load"),
    }

    microbiome: MicrobiomeState = compute_microbiome_state(avg_nutrition)
    neuro: NeuroState = compute_neuro_state(avg_nutrition, microbiome)
    prediction: PredictionState = predict_state(neuro, microbiome)
    health: HealthScore = compute_health_score(prediction, microbiome)
    explanation = build_explanation(enriched_nutrition, microbiome, neuro, prediction, health)

    result: BioSenseAnalysis = {
        "foods": foods,
        "nutrition": enriched_nutrition,
        "microbiome": microbiome,
        "neuro": neuro,
        "prediction": prediction,
        "health": health,
        "explanation": explanation,
    }

    return result

