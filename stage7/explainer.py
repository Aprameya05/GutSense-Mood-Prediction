"""Stage 7: Explanation Engine for BioSense.

Generates scientific-style narratives that connect nutrition,
microbiome and neurochemistry to predicted mood and health scores.
"""

from __future__ import annotations

from typing import List

from schemas import (
    Explanation,
    HealthScore,
    MicrobiomeState,
    NeuroState,
    NutritionVector,
    PredictionState,
)
from references import MECHANISM_SNIPPETS


def _statement(condition: bool, text: str) -> str | None:
    return text if condition else None


def build_explanation(
    nutrition: List[NutritionVector],
    microbiome: MicrobiomeState,
    neuro: NeuroState,
    prediction: PredictionState,
    health: HealthScore,
) -> Explanation:
    """Create a compact scientific explanation for the current meal.

    The language is intentionally "literature style" and mechanisms are
    drawn from recurring themes in:

    - microbiome–gut–brain axis research
    - SCFA and butyrate literature
    - tryptophan / serotonin / kynurenine pathways
    - nutrition and inflammation work

    It does **not** cite specific papers and should be treated as an
    educational narrative, not a clinical report.
    """
    avg_fiber = sum(n["fiber"] for n in nutrition) / max(len(nutrition), 1)
    avg_sugar = sum(n["sugar"] for n in nutrition) / max(len(nutrition), 1)
    any_fermented = any(n["fermented"] for n in nutrition)

    bullets: List[str] = []

    bullets.append(
        f"Estimated fiber and resistant starch are ~{avg_fiber:.1f} units per detected food, "
        f"supporting an SCFA score of {microbiome['scfa_score']:.1f} and gut balance of {microbiome['gut_balance_score']:.1f}. "
        + MECHANISM_SNIPPETS.get("fiber_scfa", "")
    )

    maybe = [
        _statement(
            any_fermented,
            "Fermented elements push the probiotic score upward, which is consistent with reports that fermented foods support lactic-acid and butyrate-producing microbes.",
        ),
        _statement(
            avg_sugar > 6.0,
            "Elevated sugar and glycemic load suggest a stronger post-prandial insulin and inflammation response, which may transiently increase cortisol tone.",
        ),
        _statement(
            neuro["serotonin"] > 5.0,
            "Tryptophan availability combined with SCFA support yields a strong serotonin signal, in line with research suggesting SCFAs can influence enterochromaffin serotonin release.",
        ),
        _statement(
            neuro["melatonin"] > 5.0,
            "Serotonin-to-melatonin conversion potential appears favourable, suggesting this meal may support evening sleep architecture if timed appropriately.",
        ),
        _statement(
            prediction["focus"] > 5.0,
            "The combination of dopamine tone and GABA support is compatible with sustained cognitive focus over the next few hours.",
        ),
        _statement(
            health["inflammation_risk"] > 60.0,
            "Inflammation load is non-trivial; literature suggests that adding colourful plants and omega‑3 sources could help rebalance this over time.",
        ),
    ]

    bullets.extend([m for m in maybe if m])

    summary = (
        "Based on nutrition vectors, microbiome proxies, and neurochemical heuristics, "
        "this meal is simulated to modulate the microbiome–gut–brain axis with a composite health score of "
        f"{health['overall_score']:.0f}/100 and brain score of {health['brain_score']:.0f}/100. "
        "These values are derived from rule-based models grounded in themes repeatedly reported in gut–brain and nutrition literature, "
        "and are meant for exploratory analysis rather than diagnosis."
    )

    return {"summary": summary, "bullets": bullets}

