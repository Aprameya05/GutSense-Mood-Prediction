"""Stage 10: Final Insight Generation.

Generates natural-language health summaries via Groq, synthesizing
pipeline outputs into actionable, non-diagnostic insights.
"""

import json
from datetime import datetime, timezone
from typing import TypedDict

from utils.config import GROQ_CHAT_MODEL
from utils.groq_client import chat


_DISCLAIMER = "Informational only. Not medical advice."

_SYSTEM_PROMPT = (
    "You are a health informatics assistant. NEVER diagnose. "
    "Given the user's 30-day pipeline summary:\n"
    "- Baseline metrics (Stage 8)\n"
    "- Significant correlations (Stage 7)\n"
    "- Risk flags (Stage 9)\n"
    "Generate 3-5 personalized, actionable insights in plain English.\n"
    "Each insight must reference specific food patterns and outcomes.\n"
    "Return ONLY a JSON array of insight strings, e.g. "
    '[\"insight 1\", \"insight 2\", \"insight 3\"].\n'
    "End with a disclaimer: These are informational observations, not medical advice."
)


class InsightOutput(TypedDict):
    diet_mood_correlation: str
    gut_health_proxy: str
    metabolic_stability: str
    sleep_stability: str
    neurological_risk_flag: str
    top_insight: str
    insights_count: int
    insights: list[str]
    disclaimer: str
    generated_by: str
    timestamp: str


def _build_user_prompt(summary: dict) -> str:
    """Build a user message from the pipeline summary."""
    parts = ["Pipeline Summary for Insight Generation:\n"]

    if "baselines" in summary:
        parts.append(f"Baselines: {json.dumps(summary['baselines'], indent=2)}\n")
    elif "baseline_mood" in summary:
        parts.append(f"Baselines: {json.dumps(summary, indent=2)}\n")

    if "correlations" in summary:
        parts.append(f"Significant Correlations: {json.dumps(summary['correlations'], indent=2)}\n")

    if "risk" in summary:
        parts.append(f"Risk Assessment: {json.dumps(summary['risk'], indent=2)}\n")

    if "nutrition_totals" in summary:
        parts.append(f"Recent Nutrition: {json.dumps(summary['nutrition_totals'], indent=2)}\n")

    if "sleep" in summary:
        parts.append(f"Sleep Data: {json.dumps(summary['sleep'], indent=2)}\n")

    if "gut" in summary:
        parts.append(f"Gut Health: {json.dumps(summary['gut'], indent=2)}\n")

    return "\n".join(parts)


def _parse_insights(response: str) -> list[str]:
    """Parse Groq response into a list of insight strings."""
    response = response.strip()
    try:
        parsed = json.loads(response)
        if isinstance(parsed, list):
            return [str(s) for s in parsed[:5]]
    except json.JSONDecodeError:
        pass

    # Fallback: split numbered lines
    lines = response.strip().split("\n")
    insights = []
    for line in lines:
        line = line.strip()
        if not line:
            continue
        # Strip leading numbers like "1. " or "- "
        for prefix in ("1.", "2.", "3.", "4.", "5.", "-", "*"):
            if line.startswith(prefix):
                line = line[len(prefix):].strip()
                break
        if line:
            insights.append(line)
    return insights[:5] if insights else [response]


def _summarize_level(summary: dict, key: str, fallback: str = "unknown") -> str:
    """Extract a summary-level label from nested pipeline data."""
    if key in summary:
        return str(summary[key])

    # Try common nested locations
    for section in ("baselines", "risk", "gut", "sleep", "metabolic"):
        if section in summary and isinstance(summary[section], dict):
            if key in summary[section]:
                return str(summary[section][key])

    return fallback


def _generate_fallback_insights(pipeline_summary: dict) -> list[str]:
    """
    Derive data-driven insights directly from pipeline_summary when Groq is skipped.

    Reads the same keys that _build_user_prompt() uses so every insight is
    specific to *this* user's actual stage outputs, not a generic template.
    Handles both nested (API) and flatter (CLI) pipeline_summary shapes.
    """
    insights: list[str] = []

    # ── Correlations (Stage 7): use significant flag when present, else |r|>0.3 ──
    for corr in pipeline_summary.get("correlations", []):
        r = corr.get("r", 0.0)
        is_notable = corr.get("significant", abs(r) > 0.3)
        if not is_notable:
            continue
        pair = corr.get("pair", "")
        direction = "positively" if r > 0 else "negatively"
        insights.append(
            f"Over the analysis window, {pair.replace(' <-> ', ' and ')} "
            f"are {direction} correlated (r={r:.2f}). "
            "This informational pattern may be worth monitoring."
        )
        if len(insights) >= 2:
            break

    # ── Neurological risk level (Stage 9) ────────────────────────────────────
    risk = pipeline_summary.get("risk", {})
    risk_level = risk.get("neurological_risk_level",
                          _summarize_level(pipeline_summary, "neurological_risk_level", ""))
    if risk_level in ("mild", "moderate", "elevated"):
        active_flags = risk.get("active_flags", [])
        flag_str = f" ({', '.join(active_flags[:2])})" if active_flags else ""
        insights.append(
            f"Neurological risk assessment: {risk_level}{flag_str}. "
            "Review sleep consistency and mood logs for contributing patterns."
        )

    # ── Gut inflammation (Stage 3): score or level string ────────────────────
    gut = pipeline_summary.get("gut", {})
    irs = gut.get("inflammation_risk_score")
    if irs is None:
        irs_raw = _summarize_level(pipeline_summary, "inflammation_risk_score", "")
        try:
            irs = float(irs_raw)
        except (ValueError, TypeError):
            irs = None
    if irs is not None:
        if irs > 0.6:
            insights.append(
                f"Inflammation risk score is {irs:.2f} (elevated). "
                "Reducing processed carbohydrates and increasing omega-3 sources may help."
            )
        elif irs < 0.3:
            insights.append(
                f"Inflammation risk score is {irs:.2f} (low), "
                "consistent with current dietary patterns."
            )
    else:
        # Fallback: level string (e.g. "inflammation_risk_level": "moderate")
        irs_level = gut.get("inflammation_risk_level",
                            _summarize_level(pipeline_summary, "inflammation_risk_level", ""))
        if irs_level in ("moderate", "high", "elevated"):
            insights.append(
                f"Gut inflammation proxy is {irs_level}. "
                "Increasing dietary fiber and fermented foods may support microbiome balance."
            )
        elif irs_level == "low":
            insights.append(
                "Gut inflammation proxy is low, consistent with current dietary patterns."
            )

    # ── Sleep quality / debt (Stage 6) ───────────────────────────────────────
    sleep = pipeline_summary.get("sleep", {})
    debt = sleep.get("cumulative_debt_7d")
    if debt is None:
        debt_raw = _summarize_level(pipeline_summary, "cumulative_debt_7d", "")
        try:
            debt = float(debt_raw)
        except (ValueError, TypeError):
            debt = None
    if debt is not None and debt > 5:
        insights.append(
            f"7-day cumulative sleep debt is {debt:.1f} hours. "
            "Consistent sleep timing may reduce neurological stress signals."
        )
    else:
        # Fallback: stability string
        stab = sleep.get("sleep_stability",
                         _summarize_level(pipeline_summary, "sleep_stability", ""))
        if stab in ("low", "poor"):
            insights.append(
                f"Sleep stability is reported as {stab}. "
                "Consistent sleep and wake times support circadian regularity."
            )

    # ── Metabolic spike (Stage 5) ─────────────────────────────────────────────
    metabolic = pipeline_summary.get("metabolic", {})
    spike = metabolic.get("estimated_glucose_spike",
                          _summarize_level(pipeline_summary, "estimated_glucose_spike", ""))
    if spike in ("high", "moderate"):
        insights.append(
            f"Estimated glucose spike is {spike}. "
            "Including higher-fiber foods and reducing refined carbohydrates may attenuate glycemic response."
        )

    # ── Fiber intake (Stage 2 nutrition) ─────────────────────────────────────
    nutrition = pipeline_summary.get("nutrition_totals", {})
    fiber = nutrition.get("fiber_g")
    if fiber is not None and fiber < 15:
        insights.append(
            f"Average fiber intake ({fiber:.1f} g) is below recommended levels. "
            "Legumes, whole grains, and vegetables support gut microbiome diversity."
        )

    # ── Final fallback if pipeline_summary had no usable data ────────────────
    if not insights:
        insights.append(
            "Insufficient pattern data for personalized observations. "
            "Continue logging meals, mood, and sleep to enable correlation analysis."
        )

    return insights[:5]


# ─── Public API ───────────────────────────────────────────────────────────────

def run(pipeline_summary: dict, skip_groq: bool = False) -> InsightOutput:
    """
    Generate final insights from the full pipeline summary.

    Args:
        pipeline_summary: Aggregated dict with baselines, correlations,
                          risk flags, and stage outputs.
        skip_groq: If True, return placeholder insights (for testing).

    Returns:
        InsightOutput with categorized insights and disclaimer.
    """
    if skip_groq:
        insights = _generate_fallback_insights(pipeline_summary)
    else:
        messages = [
            {"role": "system", "content": _SYSTEM_PROMPT},
            {"role": "user", "content": _build_user_prompt(pipeline_summary)},
        ]
        response = chat(messages, max_tokens=800, use_cache=False)
        insights = _parse_insights(response)

    top = insights[0] if insights else ""

    # Derive summary labels
    risk_data = pipeline_summary.get("risk", {})
    gut_data = pipeline_summary.get("gut", {})
    sleep_data = pipeline_summary.get("sleep", {})

    diet_mood = "detected" if insights else "none"
    gut_level = _summarize_level(pipeline_summary, "inflammation_risk_level", "unknown")
    metabolic = _summarize_level(pipeline_summary, "estimated_glucose_spike", "unknown")
    sleep_stab = _summarize_level(pipeline_summary, "sleep_stability", "unknown")
    neuro_flag = risk_data.get("neurological_risk_level",
                               _summarize_level(pipeline_summary, "neurological_risk_level", "none"))

    return {
        "diet_mood_correlation": diet_mood,
        "gut_health_proxy": gut_level,
        "metabolic_stability": metabolic,
        "sleep_stability": sleep_stab,
        "neurological_risk_flag": neuro_flag,
        "top_insight": top,
        "insights_count": len(insights),
        "insights": insights,
        "disclaimer": _DISCLAIMER,
        "generated_by": f"groq/{GROQ_CHAT_MODEL.split('/')[-1]}",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
