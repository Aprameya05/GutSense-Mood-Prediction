"""Stage 3: Microbiome Simulation Engine for BioSense.

Transforms a NutritionVector into a richer MicrobiomeState representing
SCFA production, diversity, inflammation tone, probiotic support, and
overall gut balance.
"""

from __future__ import annotations

from typing import Dict

from schemas import MicrobiomeState, NutritionVector


def compute_microbiome_state(nutrition: NutritionVector) -> MicrobiomeState:
    """Compute rule-based microbiome state from nutrition features.

    All scores are on an arbitrary 0–10 scale, designed for relative
    comparison and visualization rather than diagnosis.
    """
    fiber = float(nutrition["fiber"])
    sugar = float(nutrition["sugar"])
    polyphenol = float(nutrition["polyphenol"])
    resistant = float(nutrition["resistant_starch"])
    fermented = bool(nutrition["fermented"])
    omega3 = float(nutrition["omega3"])

    # SCFA: primarily driven by fermentable fiber + resistant starch.
    scfa = fiber * 0.8 + resistant * 0.9

    # Diversity: mix of fiber, polyphenols, and presence of fermented foods.
    diversity = fiber * 0.6 + polyphenol * 0.7 + (2.0 if fermented else 0.0)

    # Inflammation: sugar and fat load (approximated by glycemic load + sugar),
    # buffered by fiber, omega-3, and polyphenols.
    gly = float(nutrition["glycemic_load"])
    base_inflam = sugar * 0.6 + gly * 0.4
    anti_inflam = fiber * 0.4 + polyphenol * 0.5 + omega3 * 0.7
    inflammation = base_inflam - anti_inflam

    # Probiotic_score: how strongly the meal may seed/support beneficial microbes.
    probiotic = (2.5 if fermented else 0.0) + fiber * 0.4 + resistant * 0.3

    # Gut balance: combined signal flipping inflammation into a 0–10 health tone.
    raw_balance = scfa * 0.4 + diversity * 0.4 + probiotic * 0.3 - inflammation * 0.3

    def clip(x: float, lo: float = 0.0, hi: float = 10.0) -> float:
        return max(lo, min(hi, x))

    state: MicrobiomeState = {
        "scfa_score": clip(scfa),
        "diversity_score": clip(diversity),
        "inflammation_score": clip(inflammation, -10.0, 10.0),
        "probiotic_score": clip(probiotic),
        "gut_balance_score": clip(raw_balance),
    }

    return state

