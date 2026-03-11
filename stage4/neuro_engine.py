"""Stage 4: Neurochemistry Engine for BioSense.

Combines NutritionVector and MicrobiomeState into a coarse-grained
NeuroState capturing neurotransmitters and hormones relevant to mood,
stress and sleep.

Directions and weights are inspired by themes in the
microbiome–gut–brain axis literature, for example:

- tryptophan as a precursor for serotonin
- SCFA / butyrate modulation of enterochromaffin serotonin release
- inflammation shifting tryptophan into the kynurenine pathway
- omega‑3 supporting dopamine signalling and anti‑inflammatory tone
- cortisol as a proxy for HPA‑axis stress activation
"""

from __future__ import annotations

from schemas import MicrobiomeState, NeuroState, NutritionVector


def compute_neuro_state(nutrition: NutritionVector, microbiome: MicrobiomeState) -> NeuroState:
    """Rule-based neurochemical estimates on a 0–10 scale.

    This is an interpretability‑first model: it exposes how changes in
    nutrition and microbiome state move high‑level neurochemical surrogates.
    """
    fiber = float(nutrition["fiber"])
    tryptophan = float(nutrition["tryptophan"])
    omega3 = float(nutrition["omega3"])
    sugar = float(nutrition["sugar"])
    gly = float(nutrition["glycemic_load"])

    scfa = float(microbiome["scfa_score"])
    diversity = float(microbiome["diversity_score"])
    inflammation = float(microbiome["inflammation_score"])
    gut_balance = float(microbiome["gut_balance_score"])

    # Based on tryptophan–serotonin and SCFA work:
    # more tryptophan, SCFAs and fiber → higher serotonin support, while
    # inflammation can divert tryptophan down the kynurenine pathway.
    serotonin = tryptophan / 40.0 + scfa * 0.35 + fiber * 0.15 - max(0.0, inflammation) * 0.15

    # Based on omega‑3 + dopamine literature and gut balance:
    # dopamine tone is nudged up by omega‑3 and a stable gut environment.
    dopamine = tryptophan / 55.0 + gut_balance * 0.4 + omega3 * 0.2

    # GABA: diversity + probiotic tone; fermented foods are indirectly captured
    # via the MicrobiomeState probiotic score.
    probiotic = float(microbiome["probiotic_score"])
    gaba = diversity * 0.4 + probiotic * 0.6

    # Cortisol: stress hormone driven up by glycaemic volatility and systemic
    # inflammation, buffered by omega‑3 intake and gut balance.
    # Based on stress / HPA‑axis literature.
    cortisol = sugar * 0.25 + gly * 0.45 + max(0.0, inflammation) * 0.4 - omega3 * 0.6 - gut_balance * 0.25

    # Melatonin: downstream of serotonin and sensitive to late‑day sugar spikes.
    # Here we treat it as a night‑time readiness / sleep pressure proxy.
    melatonin = serotonin * 0.65 - sugar * 0.2

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

