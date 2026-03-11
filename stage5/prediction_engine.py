"""Stage 5: Prediction Engine for BioSense.

Maps NeuroState + MicrobiomeState into subjective state predictions
and a short-term timeline (6h / 12h / 24h).
"""

from __future__ import annotations

from typing import List

from schemas import (
    MicrobiomeState,
    NeuroState,
    NutritionVector,
    PredictionState,
    TimeHorizonPrediction,
)


def _clip(x: float, lo: float = 0.0, hi: float = 10.0) -> float:
    return max(lo, min(hi, x))


def predict_state(
    neuro: NeuroState, microbiome: MicrobiomeState, nutrition: NutritionVector
) -> PredictionState:
    """Return current prediction plus a simple future trajectory.

    State estimates are influenced by:
    - NeuroState (serotonin, dopamine, GABA, cortisol, melatonin)
    - MicrobiomeState (gut_balance and inflammation)
    - NutritionVector (fiber / glycaemic load as simple stabiliser vs crash proxy)

    The shapes loosely reflect the idea that post‑prandial effects peak in
    the first 2–4 hours and then decay over ~24h.

    # Based on microbiome–gut–brain axis literature.
    """
    serotonin = float(neuro["serotonin"])
    dopamine = float(neuro["dopamine"])
    gaba = float(neuro["gaba"])
    cortisol = float(neuro["cortisol"])
    melatonin = float(neuro["melatonin"])

    gut_balance = float(microbiome["gut_balance_score"])
    inflammation = float(microbiome["inflammation_score"])

    fiber = float(nutrition["fiber"])
    gly = float(nutrition["glycemic_load"])

    # Nutrition contribution: higher fiber dampens volatility, high glycaemic
    # load and sugar spikes can transiently worsen energy / mood stability.
    stability = _clip(fiber * 0.4 - gly * 0.3, -5.0, 5.0)

    # Mood and energy draw mainly on serotonin / dopamine and gut balance,
    # with inflammation and cortisol acting as headwinds.
    mood = _clip(serotonin * 0.45 + dopamine * 0.25 + gut_balance * 0.2 + stability * 0.2 - max(0.0, inflammation) * 0.25)
    energy = _clip(dopamine * 0.5 + gut_balance * 0.25 + stability * 0.2 - melatonin * 0.2)

    # Focus responds to dopamine + GABA balance, penalised by cortisol.
    focus = _clip(dopamine * 0.45 + gaba * 0.3 - cortisol * 0.35)

    # Stress is dominated by cortisol, buffered by GABA and gut balance.
    stress = _clip(cortisol * 0.75 - gaba * 0.4 - gut_balance * 0.2)

    # Sleep quality: melatonin + GABA − cortisol.
    sleep_quality = _clip(melatonin * 0.6 + gaba * 0.3 - cortisol * 0.45)
    mental_clarity = _clip(focus * 0.7 + mood * 0.3)

    # Simple timeline: assume post‑meal effects peak ~2–4h and decay.
    # 6h captures the acute window, 12h captures the tail into the next
    # half‑day, 24h approximates residual impact.
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

