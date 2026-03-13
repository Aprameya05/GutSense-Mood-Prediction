"""Stage 10: Final Insight Generation.

Generates natural-language health summaries via Groq, synthesizing
pipeline outputs into actionable, non-diagnostic insights.
"""

import json
from datetime import datetime, timezone
from typing import TypedDict

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


_PLACEHOLDER_INSIGHTS = [
    "Consider increasing fiber intake to support gut microbiome diversity.",
    "Late-night meals appear to correlate with next-day mood dips.",
    "Consistent sleep onset times may improve circadian regularity.",
    "Fermented foods on days consumed show improved digestion stability.",
    "Adequate tryptophan-rich foods may support mood via serotonin pathway.",
]


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
        insights = _PLACEHOLDER_INSIGHTS[:4]
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
        "generated_by": "groq/llama-4-scout-17b",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
