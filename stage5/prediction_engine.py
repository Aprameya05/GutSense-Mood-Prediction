"""Stage 5: Prediction Engine for BioSense.

Maps NeuroState + MicrobiomeState into subjective state predictions
and a short-term timeline (6h / 12h / 24h).
"""

from __future__ import annotations

from typing import List

from schemas import (
    MicrobiomeState,
    NeuroState,
    PredictionState,
    TimeHorizonPrediction,
)


def _clip(x: float, lo: float = 0.0, hi: float = 10.0) -> float:
    return max(lo, min(hi, x))


def predict_state(neuro: NeuroState, microbiome: MicrobiomeState) -> PredictionState:
    """Return current prediction plus a simple future trajectory."""
    serotonin = float(neuro["serotonin"])
    dopamine = float(neuro["dopamine"])
    gaba = float(neuro["gaba"])
    cortisol = float(neuro["cortisol"])
    melatonin = float(neuro["melatonin"])

    gut_balance = float(microbiome["gut_balance_score"])
    inflammation = float(microbiome["inflammation_score"])

    mood = _clip(serotonin * 0.5 + dopamine * 0.3 - inflammation * 0.2)
    energy = _clip(dopamine * 0.5 + gut_balance * 0.3 - melatonin * 0.2)
    focus = _clip(dopamine * 0.5 + gaba * 0.3 - cortisol * 0.3)
    stress = _clip(cortisol * 0.7 - gaba * 0.4)
    sleep_quality = _clip(melatonin * 0.6 + gaba * 0.3 - cortisol * 0.4)
    mental_clarity = _clip(focus * 0.7 + mood * 0.3)

    # Simple timeline: assume post-meal effects peak ~2–4h and decay.
    horizons = [6, 12, 24]
    timeline: List[TimeHorizonPrediction] = []
    for h in horizons:
        decay = 0.5 if h == 6 else (0.3 if h == 12 else 0.15)
        stress_decay = 0.6 if h == 6 else (0.4 if h == 12 else 0.2)

        horizon_pred: TimeHorizonPrediction = {
            "horizon_hours": h,
            "mood": _clip(mood * decay),
            "energy": _clip(energy * decay),
            "focus": _clip(focus * decay),
            "stress": _clip(stress * stress_decay),
            "sleep_quality": _clip(sleep_quality * decay),
            "mental_clarity": _clip(mental_clarity * decay),
        }
        timeline.append(horizon_pred)

    state: PredictionState = {
        "mood": mood,
        "energy": energy,
        "focus": focus,
        "stress": stress,
        "sleep_quality": sleep_quality,
        "mental_clarity": mental_clarity,
        "timeline": timeline,
    }

    return state

