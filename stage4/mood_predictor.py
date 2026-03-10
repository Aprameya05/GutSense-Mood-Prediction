"""Stage 4: Simple mood and energy prediction for GutSense."""

from __future__ import annotations

import logging
from typing import Dict, Any

from schemas import MicrobiomeScores, MoodPrediction


logger = logging.getLogger(__name__)


def _build_explanation(microbiome_scores: MicrobiomeScores, mood: float, energy: float) -> str:
    """Generate a human-readable explanation for the mood prediction."""
    scfa = microbiome_scores.get("scfa_score", 0.0)
    serotonin = microbiome_scores.get("serotonin_score", 0.0)
    inflammation = microbiome_scores.get("inflammation_score", 0.0)
    diversity = microbiome_scores.get("diversity_score", 0.0)

    parts = []

    if scfa > 5:
        parts.append("High fermentable fiber and resistant starch may support gut SCFA production.")
    elif scfa < 0:
        parts.append("Low SCFA score suggests limited fermentable fiber or higher sugar intake.")

    if serotonin > 5:
        parts.append("Good tryptophan and fiber levels may support serotonin pathways.")
    elif serotonin < 2:
        parts.append("Lower serotonin support score could limit feel-good neurotransmitter production.")

    if inflammation > 0:
        parts.append("Sugar appears relatively high compared to fiber and polyphenols, raising inflammation risk.")
    else:
        parts.append("Fiber and polyphenols likely help buffer inflammatory effects of this meal.")

    if diversity > 8:
        parts.append("Overall diversity score is strong, suggesting good variety and/or fermented foods.")
    elif diversity < 4:
        parts.append("Diversity score is low, indicating room to add more colorful plants or fermented foods.")

    parts.append(f"Estimated mood impact is {mood:.2f} and energy impact is {energy:.2f} on a relative scale.")

    return " ".join(parts)


def predict_mood(microbiome_scores: Dict[str, float]) -> MoodPrediction:
    """
    Predict simple mood and energy scores from microbiome proxy scores.

    Args:
        microbiome_scores: Dict with keys:
            - scfa_score
            - serotonin_score
            - inflammation_score
            - diversity_score

    Returns:
        Dict with:
            - mood: float
            - energy: float
            - confidence: float
            - explanation: str
    """
    scores: MicrobiomeScores = {
        "scfa_score": float(microbiome_scores.get("scfa_score", 0.0) or 0.0),
        "serotonin_score": float(microbiome_scores.get("serotonin_score", 0.0) or 0.0),
        "inflammation_score": float(microbiome_scores.get("inflammation_score", 0.0) or 0.0),
        "diversity_score": float(microbiome_scores.get("diversity_score", 0.0) or 0.0),
    }

    scfa = scores["scfa_score"]
    serotonin = scores["serotonin_score"]
    inflammation = scores["inflammation_score"]
    diversity = scores["diversity_score"]

    mood = scfa * 0.4 + serotonin * 0.4 - inflammation * 0.2
    energy = scfa * 0.5 + diversity * 0.5
    confidence = min(1.0, (diversity + scfa) / 20.0)

    explanation = _build_explanation(scores, mood, energy)

    prediction: MoodPrediction = {
        "mood": float(mood),
        "energy": float(energy),
        "confidence": float(confidence),
        "explanation": explanation,
    }

    logger.debug(
        "Mood prediction: mood=%s energy=%s confidence=%s",
        prediction["mood"],
        prediction["energy"],
        prediction["confidence"],
    )

    return prediction

