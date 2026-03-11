"""Stage 4: Neurochemistry Engine for BioSense.

Combines NutritionVector and MicrobiomeState into a coarse-grained
NeuroState capturing neurotransmitters and hormones relevant to mood,
stress and sleep.
"""

from __future__ import annotations

from schemas import MicrobiomeState, NeuroState, NutritionVector


def compute_neuro_state(nutrition: NutritionVector, microbiome: MicrobiomeState) -> NeuroState:
    """Rule-based neurochemical estimates on a 0–10 scale."""
    fiber = float(nutrition["fiber"])
    tryptophan = float(nutrition["tryptophan"])
    omega3 = float(nutrition["omega3"])
    sugar = float(nutrition["sugar"])
    gly = float(nutrition["glycemic_load"])

    scfa = float(microbiome["scfa_score"])
    diversity = float(microbiome["diversity_score"])
    inflammation = float(microbiome["inflammation_score"])
    gut_balance = float(microbiome["gut_balance_score"])

    # Serotonin: tryptophan + SCFAs + fiber (gut-brain axis).
    serotonin = tryptophan / 40.0 + scfa * 0.3 + fiber * 0.2

    # Dopamine: protein proxy (tryptophan as marker) + gut balance.
    dopamine = tryptophan / 50.0 + gut_balance * 0.4

    # GABA: diversity + probiotic tone; fermented foods are indirectly captured.
    probiotic = float(microbiome["probiotic_score"])
    gaba = diversity * 0.4 + probiotic * 0.6

    # Cortisol: stress hormone driven up by glycemic volatility and inflammation,
    # buffered by omega-3s and gut balance.
    cortisol = sugar * 0.3 + gly * 0.5 + inflammation * 0.4 - omega3 * 0.7 - gut_balance * 0.3

    # Melatonin: supported by serotonin, buffered by late-day sugar spikes.
    melatonin = serotonin * 0.6 - sugar * 0.2

    def clip(x: float, lo: float = 0.0, hi: float = 10.0) -> float:
        return max(lo, min(hi, x))

    state: NeuroState = {
        "serotonin": clip(serotonin),
        "dopamine": clip(dopamine),
        "gaba": clip(gaba),
        "cortisol": clip(cortisol),
        "melatonin": clip(melatonin),
    }

    return state

