"""Stage 7: Explanation Engine for BioSense.

Generates scientific-style narratives that connect nutrition,
microbiome and neurochemistry to predicted mood and health scores.
"""

from __future__ import annotations

from typing import List

from schemas import Explanation, HealthScore, MicrobiomeState, NeuroState, NutritionVector, PredictionState


def _statement(condition: bool, text: str) -> str | None:
    return text if condition else None


def build_explanation(
    nutrition: List[NutritionVector],
    microbiome: MicrobiomeState,
    neuro: NeuroState,
    prediction: PredictionState,
    health: HealthScore,
) -> Explanation:
    """Create a compact scientific explanation for the current meal."""
    avg_fiber = sum(n["fiber"] for n in nutrition) / max(len(nutrition), 1)
    avg_sugar = sum(n["sugar"] for n in nutrition) / max(len(nutrition), 1)
    any_fermented = any(n["fermented"] for n in nutrition)

    bullets: List[str] = []

    bullets.append(
        f"Fiber and resistant starch inputs are estimated at ~{avg_fiber:.1f} units per food, "
        f"supporting an SCFA score of {microbiome['scfa_score']:.1f} and gut balance of {microbiome['gut_balance_score']:.1f}."
    )

    maybe = [
        _statement(
            any_fermented,
            "Presence of fermented foods contributes to a higher probiotic and diversity score, "
            "which may enhance butyrate-producing microbes.",
        ),
        _statement(
            avg_sugar > 6.0,
            "Elevated sugar and glycemic load may transiently increase post-prandial inflammation and cortisol.",
        ),
        _statement(
            neuro["serotonin"] > 5.0,
            "Tryptophan availability combined with microbiome support yields a strong serotonin signal.",
        ),
        _statement(
            neuro["melatonin"] > 5.0,
            "Serotonin-to-melatonin conversion potential suggests this meal may support evening sleep architecture.",
        ),
        _statement(
            prediction["focus"] > 5.0,
            "Dopamine and GABA balance are compatible with sustained cognitive focus in the next few hours.",
        ),
        _statement(
            health["inflammation_risk"] > 60.0,
            "Inflammation risk is non-trivial; balancing this meal with colorful plants or omega-3 sources could help.",
        ),
    ]

    bullets.extend([m for m in maybe if m])

    summary = (
        "Based on nutrition, microbiome proxies, and neurochemical heuristics, "
        "this meal is projected to modulate gut–brain signaling with a composite health score of "
        f"{health['overall_score']:.0f}/100 and brain score of {health['brain_score']:.0f}/100."
    )

    return {"summary": summary, "bullets": bullets}

