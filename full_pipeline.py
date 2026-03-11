"""Full GutSense pipeline: image -> food -> nutrition -> microbiome -> mood."""

from __future__ import annotations

import logging
from typing import Any, Dict, List

from stage1 import analyze_food_image
from stage2.nutrition_lookup import get_nutrition
from stage3.microbiome_proxy import compute_microbiome_scores
from stage4.mood_predictor import predict_mood
from schemas import MealAnalysis, MicrobiomeScores


logger = logging.getLogger(__name__)


def analyze_meal(image_path: str) -> MealAnalysis:
    """
    Run the full GutSense pipeline on a meal image.

    Flow:
      1. Detect and classify foods in the image
      2. For each food, look up nutrition
      3. Compute microbiome proxy scores and combine across foods
      4. Predict mood / energy impact

    Returns:
        Dict with:
          - foods: list of detection/classification dicts
          - nutrition: list of nutrition dicts, one per food (includes food_item)
          - microbiome: combined microbiome scores dict
          - prediction: mood prediction dict
    """
    logger.info("Analyzing meal image: %s", image_path)

    foods: List[Dict[str, Any]] = analyze_food_image(image_path)

    nutrition_list: List[Dict[str, Any]] = []
    per_food_microbiome: List[MicrobiomeScores] = []

    # Accumulate microbiome scores across foods, weighted by detection confidence.
    total_weight = 0.0
    agg_scores: MicrobiomeScores = {
        "scfa_score": 0.0,
        "serotonin_score": 0.0,
        "inflammation_score": 0.0,
        "diversity_score": 0.0,
    }

    for food in foods:
        label = str(food.get("food_item", "") or "").lower()
        confidence = float(food.get("confidence", 1.0) or 1.0)

        nutrition = get_nutrition(label)
        nutrition_with_label: Dict[str, Any] = {"food_item": label}
        nutrition_with_label.update(nutrition)
        nutrition_list.append(nutrition_with_label)

        micro_scores = compute_microbiome_scores(nutrition)
        per_food_microbiome.append(micro_scores)

        total_weight += confidence
        for key in agg_scores:
            agg_scores[key] += micro_scores.get(key, 0.0) * confidence

    if total_weight > 0:
        combined_microbiome: MicrobiomeScores = {
            key: float(value / total_weight) for key, value in agg_scores.items()
        }  # type: ignore[assignment]
    else:
        combined_microbiome = {key: 0.0 for key in agg_scores}  # type: ignore[assignment]

    prediction = predict_mood(combined_microbiome)

    result: MealAnalysis = {
        "foods": foods,
        "nutrition": nutrition_list,  # type: ignore[assignment]
        "microbiome": combined_microbiome,
        "prediction": prediction,
    }

    logger.info(
        "Meal analysis complete: %d foods, mood=%.2f, energy=%.2f",
        len(foods),
        prediction["mood"],
        prediction["energy"],
    )

    return result

