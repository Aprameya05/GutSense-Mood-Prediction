"""Stage 4: Mood & Cognitive State Logging.

Captures psychological and cognitive responses post-meal using
PANAS-derived emoji mapping (Watson et al., 1988) and cognitive
penalty scoring adapted from MoCA (Nasreddine et al., 2005).
"""

from datetime import datetime, timezone
from typing import TypedDict

from utils.validators import validate_stage4_input


# ─── Emoji → (score, label) mapping (PANAS-SF derived) ───────────────────────

EMOJI_MAP: dict[str, tuple[int, str]] = {
    "\U0001f604": (+2, "very_happy"),   # 😄
    "\U0001f642": (+1, "happy"),        # 🙂
    "\U0001f610": (0, "neutral"),       # 😐
    "\U0001f61f": (-1, "worried"),      # 😟
    "\U0001f614": (-2, "sad"),          # 😔
    "\U0001f634": (-1, "sleepy"),       # 😴
    "\U0001f92f": (-2, "overwhelmed"),  # 🤯
}

COGNITIVE_PENALTIES: dict[str, float] = {
    "sharp": 0.0,
    "clear": 0.0,
    "mild_fog": -0.5,
    "brain_fog": -1.5,
    "drowsy": -1.0,
}


class MoodOutput(TypedDict):
    mood_score: int
    mood_label: str
    cognitive_state: str
    cognitive_penalty: float
    energy_level: str
    anxiety_level: str
    tryptophan_context_mg: float
    hours_since_meal: float
    timestamp: str


def _parse_timestamp(ts: str) -> datetime:
    """Parse an ISO-8601 timestamp, tolerating both tz-aware and naive."""
    ts = ts.strip()
    try:
        return datetime.fromisoformat(ts)
    except ValueError:
        if ts.endswith("Z"):
            return datetime.fromisoformat(ts[:-1] + "+00:00")
        raise


def _hours_between(meal_ts: str, mood_ts: str) -> float:
    meal_dt = _parse_timestamp(meal_ts)
    mood_dt = _parse_timestamp(mood_ts)
    if meal_dt.tzinfo is None:
        meal_dt = meal_dt.replace(tzinfo=timezone.utc)
    if mood_dt.tzinfo is None:
        mood_dt = mood_dt.replace(tzinfo=timezone.utc)
    delta = (mood_dt - meal_dt).total_seconds() / 3600.0
    return round(max(0.0, delta), 2)


# ─── Public API ───────────────────────────────────────────────────────────────

def run(mood_input: dict, stage2_output: dict, meal_timestamp: str) -> MoodOutput:
    """
    Process mood and cognitive self-report into scored output.

    Args:
        mood_input: User self-report with mood_emoji, mood_rating,
                    cognitive_state, energy_level, anxiety_level, and
                    optionally a timestamp.
        stage2_output: Stage 2 output dict (must have totals.tryptophan_mg).
        meal_timestamp: ISO-8601 timestamp of the meal (from Stage 1).

    Returns:
        MoodOutput dict with scored mood, cognitive penalty, and context.

    Raises:
        ValueError: If mood_input fails validation.
    """
    errors = validate_stage4_input(mood_input)
    if errors:
        raise ValueError(f"Invalid Stage 4 input: {errors}")

    emoji = mood_input["mood_emoji"]
    score, label = EMOJI_MAP[emoji]

    cog_state = mood_input["cognitive_state"]
    cog_penalty = COGNITIVE_PENALTIES[cog_state]

    totals = stage2_output.get("totals", stage2_output)
    tryptophan = float(totals.get("tryptophan_mg", 0.0))

    mood_ts = mood_input.get("timestamp", datetime.now(timezone.utc).isoformat())
    hours = _hours_between(meal_timestamp, mood_ts)

    return {
        "mood_score": score,
        "mood_label": label,
        "cognitive_state": cog_state,
        "cognitive_penalty": cog_penalty,
        "energy_level": mood_input["energy_level"],
        "anxiety_level": mood_input["anxiety_level"],
        "tryptophan_context_mg": round(tryptophan, 2),
        "hours_since_meal": hours,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
