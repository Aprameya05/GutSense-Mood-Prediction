"""Stage 3: Gut Microbiome Proxy Modeling.

Estimates gut microbiome health using three research-backed proxy scores
derived from Stage 2 nutrition data and user digestion self-reports.

Proxies computed:
  - MDI  : Microbiome Diversity Index      [0.0 – 1.0]
  - IRS  : Inflammation Risk Score         [0.0 – 1.0]
  - DSS  : Digestion Stability Score       [0.0 – 1.0]
"""

from datetime import datetime, timezone


# ─── Constants ────────────────────────────────────────────────────────────────

# Bristol Stool Scale → base stability score (Lewis & Heaton, 1997; Rome IV)
_BRISTOL_SCORES: dict[int, float] = {
    1: 0.3,   # hard lumps
    2: 0.6,   # lumpy sausage
    3: 1.0,   # cracked sausage (optimal)
    4: 1.0,   # smooth sausage (optimal)
    5: 0.6,   # soft blobs
    6: 0.3,   # fluffy pieces
    7: 0.3,   # watery
}

_BLOATING_PENALTIES: dict[str, float] = {
    "none":     0.0,
    "mild":    -0.05,
    "moderate": -0.15,
    "severe":  -0.25,
}

_GAS_PENALTIES: dict[str, float] = {
    "none":     0.0,
    "mild":    -0.03,
    "moderate": -0.10,
    "severe":  -0.20,
}


def _clamp(value: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, value))


# ─── Proxy 1: Microbiome Diversity Index (MDI) ────────────────────────────────

def _fiber_base_score(fiber_g: float) -> float:
    """
    Map daily fiber intake to base diversity score.

    Derived from American Gut Project (McDonald et al., 2018) and
    PREDIMED trial (Garcia-Mantrana et al., 2018).
    """
    if fiber_g < 10:
        return 0.20   # low diversity risk (Sonnenburg et al., 2016)
    if fiber_g < 20:
        return 0.40   # below optimal (EFSA, 2010: min 25g/day)
    if fiber_g < 30:
        return 0.60   # adequate (American Gut Project)
    if fiber_g <= 40:
        return 0.80   # good (Tap et al., 2015)
    return 0.95       # excellent (De Filippo et al., 2010)


def _compute_mdi(
    fiber_g: float,
    fermented_food_today: bool,
    stool_quality: int,
    bloating: str,
) -> float:
    """
    Microbiome Diversity Index (MDI).

    Modifiers (Marco et al., 2017; Lewis & Heaton, 1997; Ringel-Kulka, 2015):
      +0.08 if fermented food consumed
      +0.05 if stool quality Bristol type 3 or 4 (optimal)
      -0.10 if bloating is severe (dysbiosis indicator)
    """
    score = _fiber_base_score(fiber_g)
    if fermented_food_today:
        score += 0.08
    if stool_quality in (3, 4):
        score += 0.05
    if bloating == "severe":
        score -= 0.10
    return _clamp(score)


# ─── Proxy 2: Inflammation Risk Score (IRS) ───────────────────────────────────

def _compute_irs(
    fiber_g: float,
    fat_g: float,
    carbohydrates_g: float,
    omega3_mg: float,
    fermented_food_today: bool,
    bloating: str,
) -> float:
    """
    Inflammation Risk Score (IRS).

    Based on the Dietary Inflammatory Index (DII) concept (Shivappa et al., 2014).
    Baseline is 0.5 (neutral). Weights applied:

      Pro-inflammatory:
        +0.15  fat_g > 20           (saturated fat proxy; Calder, 2006)
        +0.20  carbohydrates_g > 50 (added sugar proxy; Ma et al., 2015)
        +0.12  bloating == 'severe' (dysbiosis marker; Ringel-Kulka, 2015)

      Anti-inflammatory:
        -0.15  fiber_g > 25         (King et al., 2007)
        -0.10  omega3_mg > 0        (Grosso et al., 2014)
        -0.08  fermented_food       (Wastyk et al., 2021)
    """
    score = 0.5
    if fat_g > 20:
        score += 0.15
    if carbohydrates_g > 50:
        score += 0.20
    if bloating == "severe":
        score += 0.12
    if fiber_g > 25:
        score -= 0.15
    if omega3_mg > 0:
        score -= 0.10
    if fermented_food_today:
        score -= 0.08
    return _clamp(score)


def _irs_level(irs: float) -> str:
    if irs < 0.3:
        return "low"
    if irs <= 0.6:
        return "moderate"
    return "high"


# ─── Proxy 3: Digestion Stability Score (DSS) ─────────────────────────────────

def _compute_dss(stool_quality: int, bloating: str, gas_discomfort: str) -> float:
    """
    Digestion Stability Score (DSS).

    Based on Rome IV criteria for functional GI disorders (Drossman, 2016).
    Bristol Stool Scale types 3-4 = optimal (1.0 base).
    Penalties applied for bloating and gas discomfort.
    """
    bristol = _BRISTOL_SCORES.get(stool_quality, 0.3)
    bloating_penalty = _BLOATING_PENALTIES.get(bloating, 0.0)
    gas_penalty = _GAS_PENALTIES.get(gas_discomfort, 0.0)
    return _clamp(bristol + bloating_penalty + gas_penalty)


# ─── SCFA production proxy ────────────────────────────────────────────────────

def _scfa_proxy(fiber_g: float) -> str:
    """
    Short-chain fatty acid production proxy from fiber intake.

    SCFAs are produced by microbial fermentation of dietary fiber
    (Cryan & Dinan, 2012; Sonnenburg & Sonnenburg, 2014).
    """
    if fiber_g < 10:
        return "low"
    if fiber_g <= 25:
        return "moderate"
    return "high"


# ─── Public API ───────────────────────────────────────────────────────────────

def run(stage2_output: dict, digestion_report: dict) -> dict:
    """
    Compute gut microbiome proxies (MDI, IRS, DSS) from nutrition + digestion data.

    Args:
        stage2_output: Stage 2 output dict. Must contain a 'totals' sub-dict with
                       at minimum: fiber_g, fat_g, carbohydrates_g, omega3_mg.
                       Also accepts a raw totals dict directly.
        digestion_report: User digestion self-report with keys:
            bloating         (str): none / mild / moderate / severe
            stool_quality    (int): 1–7 (Bristol Stool Scale)
            digestion_quality (str): poor / fair / good / excellent
            fermented_food_today (bool)
            gas_discomfort   (str): none / mild / moderate / severe

    Returns:
        Stage 3 output dict with MDI, IRS, DSS, SCFA proxy, and metadata.
    """
    # Accept both {"totals": {...}} and a flat dict
    totals = stage2_output.get("totals", stage2_output)

    fiber_g = float(totals.get("fiber_g", 0.0))
    fat_g = float(totals.get("fat_g", 0.0))
    carbs_g = float(totals.get("carbohydrates_g", 0.0))
    omega3_mg = float(totals.get("omega3_mg", 0.0))

    bloating = str(digestion_report.get("bloating", "none")).lower()
    stool_quality = int(digestion_report.get("stool_quality", 4))
    gas_discomfort = str(digestion_report.get("gas_discomfort", "none")).lower()
    fermented_food = bool(digestion_report.get("fermented_food_today", False))

    mdi = _compute_mdi(fiber_g, fermented_food, stool_quality, bloating)
    irs = _compute_irs(fiber_g, fat_g, carbs_g, omega3_mg, fermented_food, bloating)
    dss = _compute_dss(stool_quality, bloating, gas_discomfort)

    return {
        "microbiome_diversity_index": round(mdi, 4),
        "inflammation_risk_score": round(irs, 4),
        "inflammation_risk_level": _irs_level(irs),
        "digestion_stability_score": round(dss, 4),
        "scfa_production_proxy": _scfa_proxy(fiber_g),
        "fiber_intake_today_g": round(fiber_g, 2),
        "fermented_food_consumed": fermented_food,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
