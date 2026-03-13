"""Input schema validation for each stage."""

_VALID_EMOJIS = {"\U0001f604", "\U0001f642", "\U0001f610", "\U0001f61f",
                 "\U0001f614", "\U0001f634", "\U0001f92f"}
_VALID_COGNITIVE = {"sharp", "clear", "mild_fog", "brain_fog", "drowsy"}
_VALID_ENERGY = {"very_low", "low", "moderate", "high", "very_high"}
_VALID_ANXIETY = {"none", "mild", "moderate", "high"}
_VALID_SLEEP_QUALITY = {"poor", "fair", "good", "excellent"}


def validate_stage0_input(data: dict) -> list[str]:
    """Return list of error strings. Empty list = valid."""
    errors = []

    required_fields = {
        "age": (int,),
        "sex": (str,),
        "height_cm": (float, int),
        "weight_kg": (float, int),
        "diet_type": (str,),
        "activity_level": (str,),
        "sleep_schedule": (str,),
    }
    for field, types in required_fields.items():
        if field not in data:
            errors.append(f"Missing required field: {field}")
        elif not isinstance(data[field], types):
            errors.append(f"Field '{field}' must be of type {[t.__name__ for t in types]}")

    if "sex" in data and isinstance(data["sex"], str):
        if data["sex"] not in ("male", "female"):
            errors.append("sex must be 'male' or 'female'")

    valid_diet = ("vegetarian", "non-vegetarian", "vegan")
    if "diet_type" in data and isinstance(data["diet_type"], str):
        if data["diet_type"] not in valid_diet:
            errors.append(f"diet_type must be one of {valid_diet}")

    valid_activity = ("sedentary", "light", "moderate", "heavy")
    if "activity_level" in data and isinstance(data["activity_level"], str):
        if data["activity_level"] not in valid_activity:
            errors.append(f"activity_level must be one of {valid_activity}")

    return errors


def validate_stage2_input(data: dict) -> list[str]:
    """Return list of error strings. Empty list = valid."""
    errors = []

    if "food_items" not in data:
        errors.append("Missing required field: food_items")
    elif not isinstance(data["food_items"], list):
        errors.append("food_items must be a list")
    elif len(data["food_items"]) == 0:
        errors.append("food_items must not be empty")

    return errors


def validate_stage4_input(data: dict) -> list[str]:
    """Return list of error strings. Empty list = valid."""
    errors = []

    if "mood_emoji" not in data:
        errors.append("Missing required field: mood_emoji")
    elif data["mood_emoji"] not in _VALID_EMOJIS:
        errors.append(f"mood_emoji must be one of the supported emojis")

    if "mood_rating" not in data:
        errors.append("Missing required field: mood_rating")
    elif not isinstance(data["mood_rating"], (int, float)):
        errors.append("mood_rating must be numeric")
    elif not (1 <= data["mood_rating"] <= 10):
        errors.append("mood_rating must be between 1 and 10")

    if "cognitive_state" not in data:
        errors.append("Missing required field: cognitive_state")
    elif data["cognitive_state"] not in _VALID_COGNITIVE:
        errors.append(f"cognitive_state must be one of {_VALID_COGNITIVE}")

    if "energy_level" not in data:
        errors.append("Missing required field: energy_level")
    elif data["energy_level"] not in _VALID_ENERGY:
        errors.append(f"energy_level must be one of {_VALID_ENERGY}")

    if "anxiety_level" not in data:
        errors.append("Missing required field: anxiety_level")
    elif data["anxiety_level"] not in _VALID_ANXIETY:
        errors.append(f"anxiety_level must be one of {_VALID_ANXIETY}")

    return errors


def validate_stage5_input(data: dict) -> list[str]:
    """Validate Stage 2 output has the fields Stage 5 needs."""
    errors = []
    totals = data.get("totals", data)

    for field in ("glycemic_load", "fiber_g"):
        if field not in totals:
            errors.append(f"Missing required nutrition field: {field}")

    return errors


def validate_stage6_input(data: dict) -> list[str]:
    """Return list of error strings. Empty list = valid."""
    errors = []

    for field in ("sleep_onset", "wake_time"):
        if field not in data:
            errors.append(f"Missing required field: {field}")

    if "sleep_quality" in data and data["sleep_quality"] not in _VALID_SLEEP_QUALITY:
        errors.append(f"sleep_quality must be one of {_VALID_SLEEP_QUALITY}")

    if "night_awakenings" in data:
        if not isinstance(data["night_awakenings"], int) or data["night_awakenings"] < 0:
            errors.append("night_awakenings must be a non-negative integer")

    return errors


# ─── Multi-meal / nested-schema validators ────────────────────────────────────

_VALID_BLOATING = {"none", "mild", "moderate", "severe"}
_VALID_GAS = {"none", "mild", "moderate", "severe"}
_VALID_DIET_TYPE = {"vegetarian", "non-vegetarian", "vegan", "omnivore"}
_VALID_GL = {"low", "medium", "high", "unknown"}
_VALID_DIGESTION_QUALITY = {"poor", "fair", "good", "excellent"}

_DAILY_LOG_SECTIONS = {
    "date": str,
    "meals": list,
    "digestion": dict,
    "sleep": dict,
    "daily_totals": dict,
    "daily_gut": dict,
    "daily_mood_summary": dict,
    "diet_type": str,
}

_DAILY_TOTALS_NUMERIC = [
    "calories_kcal", "carbs_g", "protein_g", "fat_g", "fiber_g",
    "tryptophan_mg", "omega3_mg", "iron_mg", "magnesium_mg",
    "b6_mg", "b12_mcg", "zinc_mg",
]

_DAILY_GUT_KEYS = {
    "microbiome_diversity_index": (int, float),
    "inflammation_risk_score": (int, float),
    "inflammation_risk_level": (str,),
    "digestion_stability_score": (int, float),
    "scfa_production_proxy": (str,),
}

_DAILY_MOOD_KEYS = {
    "avg_mood_score": (int, float),
    "min_mood_score": (int,),
    "max_mood_score": (int,),
    "dominant_cognitive_state": (str,),
}


def validate_daily_log(log: dict) -> list[str]:
    """Validate a full nested DailyLog dict. Return list of error strings."""
    errors: list[str] = []
    if not isinstance(log, dict):
        return ["daily_log must be a dict"]

    for key, expected_type in _DAILY_LOG_SECTIONS.items():
        if key not in log:
            errors.append(f"Missing top-level key: {key}")
        elif not isinstance(log[key], expected_type):
            errors.append(f"'{key}' must be {expected_type.__name__}")

    if "diet_type" in log and isinstance(log["diet_type"], str):
        if log["diet_type"] not in _VALID_DIET_TYPE:
            errors.append(f"diet_type must be one of {_VALID_DIET_TYPE}")

    # daily_totals sub-keys
    dt = log.get("daily_totals")
    if isinstance(dt, dict):
        for nk in _DAILY_TOTALS_NUMERIC:
            if nk not in dt:
                errors.append(f"daily_totals missing key: {nk}")
            elif not isinstance(dt[nk], (int, float)):
                errors.append(f"daily_totals.{nk} must be numeric")
        if "glycemic_load" not in dt:
            errors.append("daily_totals missing key: glycemic_load")
        elif not isinstance(dt["glycemic_load"], str):
            errors.append("daily_totals.glycemic_load must be a string")

    # daily_gut sub-keys
    dg = log.get("daily_gut")
    if isinstance(dg, dict):
        for gk, types in _DAILY_GUT_KEYS.items():
            if gk not in dg:
                errors.append(f"daily_gut missing key: {gk}")
            elif not isinstance(dg[gk], types):
                errors.append(f"daily_gut.{gk} has wrong type")

    # daily_mood_summary sub-keys
    dm = log.get("daily_mood_summary")
    if isinstance(dm, dict):
        for mk, types in _DAILY_MOOD_KEYS.items():
            if mk not in dm:
                errors.append(f"daily_mood_summary missing key: {mk}")
            elif not isinstance(dm[mk], types):
                errors.append(f"daily_mood_summary.{mk} has wrong type")

    # Validate each meal entry
    if isinstance(log.get("meals"), list):
        for i, meal in enumerate(log["meals"]):
            meal_errs = validate_meal_entry(meal)
            for e in meal_errs:
                errors.append(f"meals[{i}]: {e}")

    return errors


def validate_meal_entry(meal: dict) -> list[str]:
    """Validate a single MealEntry dict. Return list of error strings.

    Required: meal_id, timestamp (in stage1), stage1 (with food_items),
              stage2 (with totals).
    Optional: stage4, stage5 (added later in pipeline flow).
    """
    errors: list[str] = []
    if not isinstance(meal, dict):
        return ["meal entry must be a dict"]

    if "meal_id" not in meal:
        errors.append("Missing required field: meal_id")
    elif not isinstance(meal["meal_id"], str):
        errors.append("meal_id must be a string")

    # stage1
    s1 = meal.get("stage1")
    if s1 is None:
        errors.append("Missing required field: stage1")
    elif not isinstance(s1, dict):
        errors.append("stage1 must be a dict")
    else:
        if "food_items" not in s1:
            errors.append("stage1 missing food_items")
        elif not isinstance(s1["food_items"], list):
            errors.append("stage1.food_items must be a list")
        if "timestamp" not in s1:
            errors.append("stage1 missing timestamp")

    # stage2
    s2 = meal.get("stage2")
    if s2 is None:
        errors.append("Missing required field: stage2")
    elif not isinstance(s2, dict):
        errors.append("stage2 must be a dict")
    else:
        if "totals" not in s2:
            errors.append("stage2 missing totals")
        elif not isinstance(s2["totals"], dict):
            errors.append("stage2.totals must be a dict")

    return errors


def validate_sleep_input(data: dict) -> list[str]:
    """Validate a sleep self-report input dict. Return list of error strings.

    Required: sleep_onset (str), wake_time (str), sleep_quality (str).
    Optional: night_awakenings (int>=0), caffeine_after_14h (bool),
              screen_before_bed_min (int>=0).
    """
    errors: list[str] = []
    if not isinstance(data, dict):
        return ["sleep input must be a dict"]

    for field in ("sleep_onset", "wake_time"):
        if field not in data:
            errors.append(f"Missing required field: {field}")
        elif not isinstance(data[field], str):
            errors.append(f"{field} must be a string")

    if "sleep_quality" not in data:
        errors.append("Missing required field: sleep_quality")
    elif data["sleep_quality"] not in _VALID_SLEEP_QUALITY:
        errors.append(f"sleep_quality must be one of {_VALID_SLEEP_QUALITY}")

    if "night_awakenings" in data:
        if not isinstance(data["night_awakenings"], int) or data["night_awakenings"] < 0:
            errors.append("night_awakenings must be a non-negative integer")

    if "caffeine_after_14h" in data:
        if not isinstance(data["caffeine_after_14h"], bool):
            errors.append("caffeine_after_14h must be a boolean")

    if "screen_before_bed_min" in data:
        if not isinstance(data["screen_before_bed_min"], int) or data["screen_before_bed_min"] < 0:
            errors.append("screen_before_bed_min must be a non-negative integer")

    return errors


def validate_digestion_input(data: dict) -> list[str]:
    """Validate a digestion self-report input dict. Return list of error strings.

    Required: bloating (none/mild/moderate/severe), stool_quality (1-7),
              gas_discomfort (none/mild/moderate/severe),
              fermented_food_today (bool).
    """
    errors: list[str] = []
    if not isinstance(data, dict):
        return ["digestion input must be a dict"]

    if "bloating" not in data:
        errors.append("Missing required field: bloating")
    elif data["bloating"] not in _VALID_BLOATING:
        errors.append(f"bloating must be one of {_VALID_BLOATING}")

    if "stool_quality" not in data:
        errors.append("Missing required field: stool_quality")
    elif not isinstance(data["stool_quality"], int):
        errors.append("stool_quality must be an integer")
    elif not (1 <= data["stool_quality"] <= 7):
        errors.append("stool_quality must be between 1 and 7")

    if "gas_discomfort" not in data:
        errors.append("Missing required field: gas_discomfort")
    elif data["gas_discomfort"] not in _VALID_GAS:
        errors.append(f"gas_discomfort must be one of {_VALID_GAS}")

    if "fermented_food_today" not in data:
        errors.append("Missing required field: fermented_food_today")
    elif not isinstance(data["fermented_food_today"], bool):
        errors.append("fermented_food_today must be a boolean")

    return errors
