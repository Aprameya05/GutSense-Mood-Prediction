"""Stage 8: Personalized Baseline Creation.

Computes stable per-user baselines after 30 days of accumulated data
for future deviation comparison. Uses trimmed means (Watson et al., 1988),
medians, and coefficient of variation for stability assessment.
"""

import statistics
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import TypedDict

from scipy.stats import trim_mean

from utils.config import BASELINES_DIR, DAILY_LOGS_DIR
from utils.flatten import extract_flat_record
from utils.storage import read_json, write_json


class BaselineOutput(TypedDict):
    baseline_mood: float
    baseline_sleep_hours: float
    baseline_glucose_spike: str
    baseline_digestion_stability: float
    baseline_MDI: float
    baseline_inflammation_risk: float
    baseline_cognitive_score: float
    baseline_neuro_stress: float
    all_baselines_stable: bool
    baseline_period_days: int
    stability_details: dict
    timestamp: str


def _extract(records: list[dict], key: str, default=None) -> list:
    """Extract non-None values for a key across records."""
    vals = []
    for r in records:
        v = r.get(key, default)
        if v is not None:
            vals.append(v)
    return vals


def _safe_mean(values: list[float]) -> float:
    if not values:
        return 0.0
    return sum(values) / len(values)


def _safe_median(values: list[float]) -> float:
    if not values:
        return 0.0
    return float(statistics.median(values))


def _safe_mode_str(values: list[str]) -> str:
    if not values:
        return "unknown"
    counter = Counter(values)
    return counter.most_common(1)[0][0]


def _cv(values: list[float]) -> float:
    """Coefficient of variation as percentage. Returns 0 if mean is zero."""
    if len(values) < 2:
        return 0.0
    m = _safe_mean(values)
    if abs(m) < 1e-9:
        return 0.0
    sd = statistics.stdev(values)
    return (sd / abs(m)) * 100.0


def _load_daily_logs(logs_dir: Path) -> list[dict]:
    """Load all JSON daily logs, sorted by filename (date)."""
    logs_dir = Path(logs_dir)
    if not logs_dir.exists():
        return []
    files = sorted(logs_dir.glob("*.json"))
    records = []
    for f in files:
        data = read_json(f)
        if data is not None:
            records.append(data)
    return records


# ─── Public API ───────────────────────────────────────────────────────────────

def run(user_id: str, records: list[dict] = None, daily_logs_dir: Path | None = None) -> BaselineOutput:
    """
    Compute personalized baselines from 30+ days of daily logs.

    Args:
        user_id: User identifier for saving baseline file.
        records: Pre-loaded daily log dictionaries (e.g. from MongoDB).
        daily_logs_dir: Override path to daily logs directory (used if records is None).

    Returns:
        BaselineOutput dict with 8 baseline metrics, stability assessment,
        and metadata.

    Raises:
        ValueError: If fewer than 30 days of data are available.
    """
    if records is None:
        logs_path = Path(daily_logs_dir) if daily_logs_dir else DAILY_LOGS_DIR
        records = _load_daily_logs(logs_path)

    if len(records) < 30:
        raise ValueError(
            f"Baseline requires 30+ days of data, got {len(records)}"
        )

    records = [extract_flat_record(r) for r in records]
    last_14 = records[-14:]

    # --- Baseline metrics ---
    mood_scores = _extract(records, "mood_score")
    mood_scores_f = [float(x) for x in mood_scores]
    baseline_mood = round(trim_mean(mood_scores_f, 0.1), 2) if mood_scores_f else 0.0

    sleep_hours = [float(x) for x in _extract(records, "sleep_hours")]
    baseline_sleep = round(_safe_median(sleep_hours), 2)

    spike_cats = _extract(records, "estimated_glucose_spike")
    baseline_spike = _safe_mode_str(spike_cats)

    dss_vals = [float(x) for x in _extract(records, "digestion_stability_score")]
    baseline_dss = round(_safe_mean(dss_vals), 4)

    mdi_14 = [float(x) for x in _extract(last_14, "microbiome_diversity_index")]
    baseline_mdi = round(_safe_mean(mdi_14), 4)

    irs_vals = [float(x) for x in _extract(records, "inflammation_risk_score")]
    baseline_irs = round(_safe_mean(irs_vals), 4)

    cog_scores = []
    for r in records:
        ms = r.get("mood_score")
        cp = r.get("cognitive_penalty", 0)
        if ms is not None:
            cog_scores.append(float(ms) + float(cp))
    baseline_cog = round(_safe_mean(cog_scores), 2)

    neuro_vals = [float(x) for x in _extract(records, "neurological_stress_proxy")]
    baseline_neuro = round(_safe_mean(neuro_vals), 4)

    # --- Stability (CV < 15% over last 14 days) ---
    stability = {}
    stable_all = True

    metrics_14d = {
        "mood": [float(x) for x in _extract(last_14, "mood_score")],
        "sleep_hours": [float(x) for x in _extract(last_14, "sleep_hours")],
        "digestion_stability": [float(x) for x in _extract(last_14, "digestion_stability_score")],
        "MDI": [float(x) for x in _extract(last_14, "microbiome_diversity_index")],
        "inflammation": [float(x) for x in _extract(last_14, "inflammation_risk_score")],
        "cognitive_score": [
            float(r.get("mood_score", 0)) + float(r.get("cognitive_penalty", 0))
            for r in last_14 if r.get("mood_score") is not None
        ],
        "neuro_stress": [float(x) for x in _extract(last_14, "neurological_stress_proxy")],
    }

    for name, vals in metrics_14d.items():
        cv_val = round(_cv(vals), 2)
        is_stable = cv_val < 15.0
        stability[name] = {"cv_percent": cv_val, "stable": is_stable}
        if not is_stable:
            stable_all = False

    result: BaselineOutput = {
        "baseline_mood": baseline_mood,
        "baseline_sleep_hours": baseline_sleep,
        "baseline_glucose_spike": baseline_spike,
        "baseline_digestion_stability": baseline_dss,
        "baseline_MDI": baseline_mdi,
        "baseline_inflammation_risk": baseline_irs,
        "baseline_cognitive_score": baseline_cog,
        "baseline_neuro_stress": baseline_neuro,
        "all_baselines_stable": stable_all,
        "baseline_period_days": len(records),
        "stability_details": stability,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    save_path = BASELINES_DIR / f"{user_id}.json"
    write_json(save_path, result)

    return result
