"""Stage 3: Microbiome Simulation Engine for BioSense.

Transforms a NutritionVector into a richer MicrobiomeState representing
SCFA production, diversity, inflammation tone, probiotic support, and
overall gut balance.

The rules are inspired by patterns that appear repeatedly in the
microbiome–gut–brain literature, but remain heuristic and scaled to a
0–10 range for visualisation rather than diagnosis.
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
    fat = float(nutrition["fat"])

    # Based on SCFA literature: fermentable fiber + resistant starch are
    # the main substrates for butyrate- and propionate‑producing taxa.
    scfa = fiber * 0.7 + resistant * 1.0

    # Based on microbiome diversity studies: fiber, polyphenols and fermented
    # foods are each associated with greater alpha‑diversity.
    diversity = fiber * 0.5 + polyphenol * 0.6 + (2.5 if fermented else 0.0)

    # Based on sugar/fat–inflammation work: higher free sugar, high glycaemic
    # load and saturated‑fat‑rich meals tend to increase inflammatory tone,
    # whereas fiber, omega‑3 and polyphenols are repeatedly reported as
    # buffering factors.
    gly = float(nutrition["glycemic_load"])
    base_inflam = sugar * 0.5 + gly * 0.4 + fat * 0.3
    anti_inflam = fiber * 0.4 + polyphenol * 0.5 + omega3 * 0.8
    inflammation = base_inflam - anti_inflam

    # Probiotic_score: rough measure of how much the meal behaves like a
    # fermented / prebiotic input (yogurt, idli, dosa, etc.).
    # Based on microbiome‑gut‑brain axis literature pointing to fermented
    # foods + prebiotic fibers supporting lactobacilli and bifidobacteria.
    probiotic = (3.0 if fermented else 0.0) + fiber * 0.3 + resistant * 0.4

    # Gut balance: integrates SCFA, diversity and probiotic support while
    # penalising inflammation. This acts as a single "gut tone" proxy used
    # by downstream neuro and prediction stages.
    raw_balance = scfa * 0.35 + diversity * 0.4 + probiotic * 0.35 - inflammation * 0.25

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

