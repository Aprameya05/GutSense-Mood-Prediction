"""Stage 6: Health Score Engine for BioSense.

Collapses multi-dimensional predictions into interpretable health scores
for brain, gut, metabolism and burnout / inflammation risk.
"""

from __future__ import annotations

from schemas import HealthScore, MicrobiomeState, PredictionState


def _clip(x: float, lo: float = 0.0, hi: float = 100.0) -> float:
    return max(lo, min(hi, x))


def compute_health_score(pred: PredictionState, microbiome: MicrobiomeState) -> HealthScore:
    """Aggregate prediction + microbiome into health scores on 0–100 scale.

    The intention is to surface **interpretable system-level metrics** rather
    than precise risk estimates. Directions and weights are inspired by:

    - brain_score: mood, focus, clarity, and sleep quality
    - gut_score: gut_balance and diversity, penalised by inflammation
    - metabolism_score: energy vs. chronic stress load
    - inflammation_risk: inflammation + stress as simple load index
    - burnout_risk: stress + poor sleep as a combined recovery deficit
    """
    mood = float(pred["mood"])
    energy = float(pred["energy"])
    focus = float(pred["focus"])
    stress = float(pred["stress"])
    sleep_quality = float(pred["sleep_quality"])
    mental_clarity = float(pred["mental_clarity"])

    gut_balance = float(microbiome["gut_balance_score"])
    inflammation = float(microbiome["inflammation_score"])
    diversity = float(microbiome["diversity_score"])

    # Brain score: based on cognitive / affective domains.
    brain = (mood * 0.3 + focus * 0.3 + mental_clarity * 0.2 + sleep_quality * 0.2) * 8.0

    # Gut score: stable gut_balance and diversity are favourable, high
    # inflammation detracts.
    gut = (gut_balance * 0.6 + diversity * 0.3 - max(0.0, inflammation) * 0.25) * 8.0

    # Metabolism: energy with a penalty for chronic stress.
    metabolism = (energy * 0.6 - max(0.0, stress) * 0.35) * 8.0

    # Inflammation risk: simple load index combining microbiome‑derived
    # inflammation and stress tone.
    inflammation_risk = _clip((max(0.0, inflammation) * 0.7 + max(0.0, stress) * 0.4) * 6.0)

    # Burnout risk: high stress + chronically poor sleep.
    burnout_risk = _clip((max(0.0, stress) * 0.6 + (10.0 - sleep_quality) * 0.4) * 6.0)

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

