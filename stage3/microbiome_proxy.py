"""Stage 3: Microbiome proxy scoring for GutSense.

Given a simple nutrition dictionary, compute proxy scores that approximate
short-chain fatty acid (SCFA) production, serotonin support, inflammation,
and microbial diversity.
"""

from __future__ import annotations

import logging
from typing import Any, Dict

from schemas import MicrobiomeScores, NutritionProfile


logger = logging.getLogger(__name__)


def compute_microbiome_scores(nutrition: Dict[str, Any]) -> MicrobiomeScores:
    """
    Compute microbiome proxy scores from a nutrition profile.

    Expected keys in `nutrition`:
      - fiber
      - sugar
      - tryptophan
      - polyphenol
      - resistant_starch
      - fermented (bool)

    Missing values are treated as zero (or False for fermented).
    """
    # Treat incoming dict as NutritionProfile-like; we don't require exact type at runtime.
    profile: NutritionProfile = {
        "fiber": float(nutrition.get("fiber", 0.0) or 0.0),
        "sugar": float(nutrition.get("sugar", 0.0) or 0.0),
        "tryptophan": float(nutrition.get("tryptophan", 0.0) or 0.0),
        "polyphenol": float(nutrition.get("polyphenol", 0.0) or 0.0),
        "resistant_starch": float(nutrition.get("resistant_starch", 0.0) or 0.0),
        "fermented": bool(nutrition.get("fermented", False)),
    }

    fiber = profile["fiber"]
    sugar = profile["sugar"]
    tryptophan = profile["tryptophan"]
    polyphenol = profile["polyphenol"]
    resistant_starch = profile["resistant_starch"]
    fermented = profile["fermented"]

    scfa_score = fiber * 2.0 + resistant_starch * 2.0 - sugar
    serotonin_score = tryptophan / 50.0 + fiber * 0.5
    inflammation_score = sugar * 2.0 - polyphenol - fiber
    diversity_score = fiber + polyphenol + (5.0 if fermented else 0.0)

    scores: MicrobiomeScores = {
        "scfa_score": float(scfa_score),
        "serotonin_score": float(serotonin_score),
        "inflammation_score": float(inflammation_score),
        "diversity_score": float(diversity_score),
    }

    logger.debug(
        "Microbiome scores: scfa=%s serotonin=%s inflammation=%s diversity=%s",
        scores["scfa_score"],
        scores["serotonin_score"],
        scores["inflammation_score"],
        scores["diversity_score"],
    )

    return scores

