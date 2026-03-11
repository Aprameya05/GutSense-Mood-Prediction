"""Lightweight text snippets for biological reasoning.

These are **not** formal citations, but short phrases inspired by
commonly reported mechanisms in the microbiome–gut–brain literature.
They are used by the explanation engine to keep language consistent
and research-flavoured without claiming specific papers.
"""

from __future__ import annotations

from typing import Dict, List


MECHANISM_SNIPPETS: Dict[str, str] = {
    # Nutrition → microbiome
    "fiber_scfa": "Higher fermentable fiber and resistant starch are associated with greater short-chain fatty acid (SCFA) production.",
    "fiber_diversity": "Dietary fiber intake is repeatedly linked to increased microbiome diversity in observational studies.",
    "polyphenol_diversity": "Polyphenol-rich plant foods tend to favour diverse, beneficial microbial communities.",
    "sugar_inflammation": "High free-sugar and refined carbohydrate loads are associated with pro-inflammatory microbiome shifts.",
    "fermented_probiotic": "Fermented foods can introduce or support lactic-acid and probiotic species that modulate SCFA profiles.",
    "omega3_antiinflammatory": "Omega-3 fatty acids are often reported to have anti-inflammatory and pro-resolving effects.",
    # Microbiome → brain
    "scfa_serotonin": "SCFAs such as butyrate are reported to influence intestinal serotonin production and vagal signalling.",
    "diversity_resilience": "Greater microbiome diversity is frequently associated with metabolic and psychological resilience.",
    # Tryptophan / kynurenine
    "tryptophan_serotonin": "Tryptophan is the primary dietary precursor for serotonin synthesis.",
    "inflammation_kynurenine": "Inflammatory signalling can shunt tryptophan into the kynurenine pathway, potentially reducing serotonin availability.",
}


def snippet_keys() -> List[str]:
    return sorted(MECHANISM_SNIPPETS.keys())

