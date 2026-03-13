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
