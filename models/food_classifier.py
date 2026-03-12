"""Food classification using a HuggingFace image-classification model.

Default model: nateraw/food (EfficientNet-B2 fine-tuned on Food-101).
Override via the FOOD_MODEL_ID environment variable to use an
Indian-food-specific checkpoint (e.g. rajistics/indian-food-classification).
"""

import os

from PIL import Image
from transformers import pipeline as hf_pipeline

FOOD_MODEL_ID = os.getenv("FOOD_MODEL_ID", "nateraw/food")

_pipe = None


def get_pipeline():
    global _pipe
    if _pipe is None:
        _pipe = hf_pipeline("image-classification", model=FOOD_MODEL_ID)
    return _pipe


def classify_food(image: Image.Image) -> dict:
    """
    Classify a food image.

    Args:
        image: PIL Image.

    Returns:
        Dict with 'food_item' (str) and 'confidence' (float).
    """
    result = get_pipeline()(image)[0]
    return {
        "food_item": result["label"],
        "confidence": round(result["score"], 2),
    }
