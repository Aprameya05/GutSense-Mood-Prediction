"""Stage 6: Health Score Engine for BioSense.

Collapses multi-dimensional predictions into interpretable health scores
for brain, gut, metabolism and burnout / inflammation risk.
"""

from __future__ import annotations

from schemas import HealthScore, MicrobiomeState, PredictionState


def _clip(x: float, lo: float = 0.0, hi: float = 100.0) -> float:
    return max(lo, min(hi, x))


def compute_health_score(pred: PredictionState, microbiome: MicrobiomeState) -> HealthScore:
    """Aggregate prediction + microbiome into health scores on 0–100 scale."""
    mood = float(pred["mood"])
    energy = float(pred["energy"])
    focus = float(pred["focus"])
    stress = float(pred["stress"])
    sleep_quality = float(pred["sleep_quality"])
    mental_clarity = float(pred["mental_clarity"])

    gut_balance = float(microbiome["gut_balance_score"])
    inflammation = float(microbiome["inflammation_score"])
    diversity = float(microbiome["diversity_score"])

    brain = (mood * 0.3 + focus * 0.3 + mental_clarity * 0.2 + sleep_quality * 0.2) * 8.0
    gut = (gut_balance * 0.6 + diversity * 0.3 - max(0.0, inflammation) * 0.2) * 8.0
    metabolism = (energy * 0.6 - max(0.0, stress) * 0.3) * 8.0

    inflammation_risk = _clip((max(0.0, inflammation) * 0.7 + stress * 0.3) * 6.0)
    burnout_risk = _clip((stress * 0.6 + (10.0 - sleep_quality) * 0.4) * 6.0)

    overall = _clip((brain * 0.4 + gut * 0.3 + metabolism * 0.3) / 1.0)

    scores: HealthScore = {
        "overall_score": _clip(overall),
        "brain_score": _clip(brain),
        "gut_score": _clip(gut),
        "metabolism_score": _clip(metabolism),
        "inflammation_risk": inflammation_risk,
        "burnout_risk": burnout_risk,
    }

    return scores

