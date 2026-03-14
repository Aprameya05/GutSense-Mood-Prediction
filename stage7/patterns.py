"""Stage 7: Time-Series Pattern Analysis.

Analyzes 30 days of accumulated stage data using sliding-window correlation
analysis, z-score anomaly detection, and Groq-powered natural-language
summarization.

Analysis windows (SPEC §7):
  Acute       (2-4h post-meal)  → same-day GL vs mood_score
  Short-term  (same-day)        → lag-1 day sleep / tryptophan effects
  Medium-term (7-day rolling)   → z-score anomaly detection
  Long-term   (30-day)          → linear regression fiber trend vs MDI trend

Seven correlation pairs computed:
  1. glycemic_load        ↔ mood_score              (lag=0, expected: negative)
  2. fiber_intake         ↔ MDI                     (lag=1, expected: positive)
  3. late_meal            ↔ sleep_quality            (lag=0, expected: negative)
  4. tryptophan_intake    ↔ next_day_mood            (lag=1, expected: positive)
  5. cumulative_sleep_debt↔ cognitive_penalty        (lag=0, expected: positive)
  6. fermented_food       ↔ digestion_stability      (lag=0, expected: positive)
  7. sugar_intake         ↔ inflammation_risk        (lag=0, expected: positive)
"""

import math
from datetime import datetime, timezone
from typing import Optional

import numpy as np

from utils.groq_client import chat


# ─── Categorical converters ───────────────────────────────────────────────────

_GL_NUMERIC: dict[str, float] = {"low": 0.0, "medium": 1.0, "high": 2.0, "unknown": 1.0}
_SQ_NUMERIC: dict[str, float] = {"poor": 1.0, "fair": 2.0, "good": 3.0, "excellent": 4.0}


# ─── Math helpers ─────────────────────────────────────────────────────────────

def _clamp(v: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, v))


def _normal_cdf(x: float) -> float:
    """Standard normal CDF via complementary error function."""
    return 0.5 * math.erfc(-x / math.sqrt(2))


def _pearson(x: list[float], y: list[float]) -> tuple[float, float]:
    """
    Compute Pearson r and two-tailed p-value.

    Returns (0.0, 1.0) if fewer than 3 non-NaN paired samples.
    P-value uses normal approximation via t-statistic (adequate for n ≥ 10).
    """
    xa = np.array(x, dtype=float)
    ya = np.array(y, dtype=float)

    # Drop pairs where either value is NaN
    mask = ~(np.isnan(xa) | np.isnan(ya))
    xa, ya = xa[mask], ya[mask]
    n = len(xa)

    if n < 3:
        return 0.0, 1.0

    with np.errstate(invalid="ignore"):
        r_mat = np.corrcoef(xa, ya)
    r = float(r_mat[0, 1])

    if math.isnan(r):
        return 0.0, 1.0

    r = _clamp(r, -1.0, 1.0)

    # Perfect correlation: p = 0 by definition
    if abs(r) >= 1.0 - 1e-10:
        return r, 0.0

    # t-statistic (Student, 1908) with n-2 degrees of freedom
    t = r * math.sqrt(n - 2) / math.sqrt(1.0 - r * r)
    p = 2.0 * (1.0 - _normal_cdf(abs(t)))
    return r, _clamp(p, 0.0, 1.0)


def _extract(records: list[dict], key: str, converter=None) -> list[float]:
    """Extract one field from all records as a float list. NaN for missing/invalid."""
    out: list[float] = []
    for rec in records:
        v = rec.get(key)
        if v is None:
            out.append(float("nan"))
            continue
        try:
            out.append(float(converter(v)) if converter else float(v))
        except (ValueError, TypeError):
            out.append(float("nan"))
    return out


def _apply_lag(x: list[float], y: list[float], lag: int) -> tuple[list[float], list[float]]:
    """
    Shift y forward by `lag` positions so that x[i] pairs with y[i+lag].
    Returns (x[:-lag], y[lag:]) for lag > 0.
    """
    if lag <= 0 or lag >= len(x):
        return x, y
    return x[:-lag], y[lag:]


# ─── Correlation definitions ──────────────────────────────────────────────────
# Each tuple: (pair_label, x_key, y_key, lag_days, x_conv, y_conv, expected_direction)

_CORRELATION_PAIRS = [
    (
        "glycemic_load <-> mood_score",
        "glycemic_load", "mood_score",
        0,
        lambda v: _GL_NUMERIC.get(str(v).lower(), 1.0),
        None,
        "negative",
    ),
    (
        "fiber_intake <-> MDI",
        "fiber_g", "microbiome_diversity_index",
        1,
        None, None,
        "positive",
    ),
    (
        "late_meal <-> sleep_quality",
        "late_meal", "sleep_quality",
        0,
        lambda v: 1.0 if v else 0.0,
        lambda v: _SQ_NUMERIC.get(str(v).lower(), 2.0),
        "negative",
    ),
    (
        "tryptophan_intake <-> next_day_mood",
        "tryptophan_mg", "mood_score",
        1,
        None, None,
        "positive",
    ),
    (
        "cumulative_sleep_debt <-> cognitive_penalty",
        "cumulative_sleep_debt", "cognitive_penalty",
        0,
        None, None,
        "positive",
    ),
    (
        "fermented_food <-> digestion_stability",
        "fermented_food_consumed", "digestion_stability_score",
        0,
        lambda v: 1.0 if v else 0.0,
        None,
        "positive",
    ),
    (
        "sugar_intake <-> inflammation_risk",
        "carbohydrates_g", "inflammation_risk_score",
        0,
        None, None,
        "positive",
    ),
]


def _compute_correlations(records: list[dict]) -> list[dict]:
    results = []
    for label, xk, yk, lag, xconv, yconv, direction in _CORRELATION_PAIRS:
        xs = _extract(records, xk, xconv)
        ys = _extract(records, yk, yconv)
        xl, yl = _apply_lag(xs, ys, lag)
        r, p = _pearson(xl, yl)
        results.append({
            "pair": label,
            "r": round(r, 4),
            "p": round(p, 4),
            "lag_days": lag,
            "n": len([v for v in xl if not math.isnan(v)]),
            "expected_direction": direction,
            "significant": abs(r) > 0.3 and p < 0.05,
        })
    return results


# ─── Z-score anomaly detection ────────────────────────────────────────────────

_ANOMALY_METRICS = [
    "mood_score",
    "fiber_g",
    "digestion_stability_score",
    "inflammation_risk_score",
    "sleep_hours",
    "cognitive_penalty",
    "neurological_stress_proxy",
]


def _detect_anomalies(records: list[dict], window: int = 7) -> list[dict]:
    """
    Flag values deviating > 2σ from the rolling 7-day mean.

    z_score = (value - rolling_mean) / rolling_std
    if |z_score| > 2.0: flag as anomaly (SPEC §7 threshold)
    """
    n = len(records)
    anomalies: list[dict] = []

    for metric in _ANOMALY_METRICS:
        values = _extract(records, metric)

        for i in range(window, n):
            window_vals = [v for v in values[i - window:i] if not math.isnan(v)]
            if len(window_vals) < 3:
                continue

            current = values[i]
            if math.isnan(current):
                continue

            mean = sum(window_vals) / len(window_vals)
            variance = sum((v - mean) ** 2 for v in window_vals) / len(window_vals)
            std = math.sqrt(variance)

            if std < 1e-9:
                continue

            z = (current - mean) / std
            if abs(z) > 2.0:
                anomalies.append({
                    "date": records[i].get("date", f"day_{i}"),
                    "metric": metric,
                    "z_score": round(z, 3),
                    "value": current,
                    "rolling_mean": round(mean, 4),
                    "rolling_std": round(std, 4),
                })

    return anomalies


# ─── Linear trend (long-term window) ─────────────────────────────────────────

def _linear_trend(records: list[dict], key: str) -> dict:
    """
    Fit a linear trend (y ~ time) for a single metric over all records.
    Returns slope and direction label.
    """
    ys = _extract(records, key)
    xs = list(range(len(ys)))

    # Keep only non-NaN pairs
    pairs = [(xi, yi) for xi, yi in zip(xs, ys) if not math.isnan(yi)]
    if len(pairs) < 2:
        return {"slope": 0.0, "direction": "flat"}

    xs_c, ys_c = zip(*pairs)
    slope = float(np.polyfit(xs_c, ys_c, 1)[0])

    direction = "flat"
    if slope > 0.001:
        direction = "increasing"
    elif slope < -0.001:
        direction = "decreasing"

    return {"slope": round(slope, 6), "direction": direction}


# ─── Pattern confidence ───────────────────────────────────────────────────────

def _pattern_confidence(correlations: list[dict]) -> str:
    sig = sum(1 for c in correlations if c["significant"])
    if sig >= 3:
        return "high"
    if sig >= 1:
        return "moderate"
    return "low"


# ─── Groq summarization ───────────────────────────────────────────────────────

def _groq_summary(correlations: list[dict], anomaly_count: int) -> str:
    significant = [c for c in correlations if c["significant"]]

    if not significant and anomaly_count == 0:
        return "No significant diet-health patterns detected in this data window."

    corr_lines = "\n".join(
        f"  - {c['pair']}: r={c['r']:.2f}, p={c['p']:.3f}, lag={c['lag_days']}d"
        for c in significant[:5]
    )
    if not corr_lines:
        corr_lines = "  (none reached significance threshold)"

    messages = [
        {
            "role": "system",
            "content": (
                "You are a health informatics assistant. "
                "NEVER diagnose or make clinical claims. "
                "Summarize dietary pattern data in plain, informational English."
            ),
        },
        {
            "role": "user",
            "content": (
                "Given these 30-day correlations and anomaly flags, "
                "summarize the top 3 diet-health patterns in plain English. "
                "Be specific about which dietary factors and which outcomes.\n\n"
                f"Significant correlations:\n{corr_lines}\n\n"
                f"Anomalies detected: {anomaly_count}\n\n"
                "Format: exactly 3 bullet points starting with '•'. "
                "End with: 'These are informational observations, not medical advice.'"
            ),
        },
    ]

    try:
        return chat(messages, max_tokens=350, temperature=0.3, use_cache=False)
    except Exception as exc:
        return f"Pattern summary unavailable ({exc})"


# ─── Public API ───────────────────────────────────────────────────────────────

def run(daily_records: list[dict], skip_groq: bool = False) -> dict:
    """
    Analyze accumulated daily stage data for repeating food-mood-sleep-gut patterns.

    Args:
        daily_records: List of per-day dicts. Each dict should contain fields from
                       Stage 2 totals, Stage 3, Stage 4, Stage 6, and derived flags
                       (late_meal). Minimum 7 records required; 30 recommended.
        skip_groq: If True, skip the Groq summarization call (useful for tests/CI).

    Returns:
        Dict with:
          correlations           – all 7 pairs with r, p, lag, significance flag
          significant_correlations – filtered subset where |r|>0.3 and p<0.05
          anomalies              – list of z-score anomaly events
          anomalies_detected     – count
          fiber_trend            – long-term fiber intake direction
          mdi_trend              – long-term MDI direction
          groq_summary           – natural-language pattern summary
          pattern_confidence     – high / moderate / low
          days_analyzed          – int
          timestamp              – ISO 8601 UTC

    Raises:
        ValueError: If fewer than 7 daily records provided.
    """
    if len(daily_records) < 7:
        raise ValueError(
            f"Stage 7 requires at least 7 daily records, got {len(daily_records)}"
        )

    correlations = _compute_correlations(daily_records)
    anomalies = _detect_anomalies(daily_records)

    fiber_trend = _linear_trend(daily_records, "fiber_g")
    mdi_trend = _linear_trend(daily_records, "microbiome_diversity_index")

    if skip_groq:
        sig_count = sum(1 for c in correlations if c["significant"])
        groq_summary = (
            f"Groq summarization skipped. "
            f"{sig_count}/{len(correlations)} correlations significant; "
            f"{len(anomalies)} anomaly event(s) detected across {len(daily_records)} days."
        )
    else:
        groq_summary = _groq_summary(correlations, len(anomalies))

    return {
        "correlations": correlations,
        "significant_correlations": [c for c in correlations if c["significant"]],
        "anomalies": anomalies,
        "anomalies_detected": len(anomalies),
        "fiber_trend": fiber_trend,
        "mdi_trend": mdi_trend,
        "groq_summary": groq_summary,
        "pattern_confidence": _pattern_confidence(correlations),
        "days_analyzed": len(daily_records),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
