"""Stage 0: User Baseline Profiling.

Collects user demographics, computes BMR (Mifflin-St Jeor) and TDEE,
and persists the profile to data/user_profiles/{user_id}.json.
"""

from datetime import datetime, timezone
from typing import TypedDict

from utils.config import USER_PROFILES_DIR
from utils.storage import read_json, write_json
from utils.validators import validate_stage0_input

# Harris-Benedict activity multipliers (FAO/WHO/UNU, 2001)
ACTIVITY_MULTIPLIERS: dict[str, float] = {
    "sedentary": 1.2,
    "light": 1.375,
    "moderate": 1.55,
    "heavy": 1.725,
}


class UserProfile(TypedDict):
    user_id: str
    age: int
    sex: str
    height_cm: float
    weight_kg: float
    diet_type: str
    activity_level: str
    sleep_schedule: str
    known_conditions: list[str]
    supplements: list[str]
    medications: list[str]
    bmr_kcal: float
    tdee_kcal: float
    activity_multiplier: float
    baseline_established: bool
    timestamp: str


def _calculate_bmr(weight_kg: float, height_cm: float, age: int, sex: str) -> float:
    """Mifflin-St Jeor BMR formula (Mifflin et al., 1990)."""
    base = (10 * weight_kg) + (6.25 * height_cm) - (5 * age)
    return base + 5 if sex == "male" else base - 161


def run(user_id: str, profile_data: dict) -> UserProfile:
    """
    Process user baseline profile, compute BMR/TDEE, and persist to disk.

    Args:
        user_id: Unique identifier for the user (e.g. 'balaji_001').
        profile_data: Dict matching Stage 0 input schema.

    Returns:
        Persisted UserProfile dict with computed metabolic fields.

    Raises:
        ValueError: If profile_data fails schema validation.
    """
    errors = validate_stage0_input(profile_data)
    if errors:
        raise ValueError(f"Invalid Stage 0 input: {errors}")

    weight = float(profile_data["weight_kg"])
    height = float(profile_data["height_cm"])
    age = int(profile_data["age"])
    sex = profile_data["sex"]
    activity = profile_data["activity_level"]

    bmr = _calculate_bmr(weight, height, age, sex)
    multiplier = ACTIVITY_MULTIPLIERS[activity]
    tdee = round(bmr * multiplier, 1)

    profile: UserProfile = {
        "user_id": user_id,
        "age": age,
        "sex": sex,
        "height_cm": height,
        "weight_kg": weight,
        "diet_type": profile_data["diet_type"],
        "activity_level": activity,
        "sleep_schedule": profile_data["sleep_schedule"],
        "known_conditions": profile_data.get("known_conditions", []),
        "supplements": profile_data.get("supplements", []),
        "medications": profile_data.get("medications", []),
        "bmr_kcal": round(bmr, 1),
        "tdee_kcal": tdee,
        "activity_multiplier": multiplier,
        "baseline_established": True,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    write_json(USER_PROFILES_DIR / f"{user_id}.json", profile)
    return profile


def load(user_id: str) -> UserProfile | None:
    """Load an existing user profile from disk. Returns None if not found."""
    return read_json(USER_PROFILES_DIR / f"{user_id}.json")
