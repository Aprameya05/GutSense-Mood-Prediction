"""Input schema validation for each stage."""


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
