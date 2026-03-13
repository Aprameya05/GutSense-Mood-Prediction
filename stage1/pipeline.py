"""Stage 1 pipeline: run EfficientNet and Groq Vision in parallel.

Groq (Llama 4 Scout) is treated as ground truth. When EfficientNet disagrees,
the mismatch is logged for periodic batch retraining of the local model.
If Groq fails, EfficientNet result is used as fallback.
"""

from concurrent.futures import ThreadPoolExecutor

from PIL import Image

from models.food_classifier import classify_food
from models.groq_fallback import identify_food
from stage1.mismatch_logger import log_mismatch


def _words(label: str) -> set:
    """Return the set of words in a food label for fuzzy overlap matching."""
    return set(label.lower().replace("-", " ").split())


def _is_match(en_pred: str, groq_items: list) -> bool:
    """
    Return True if EfficientNet prediction overlaps with any Groq item.

    Accepts partial matches so that e.g. 'dosa' matches 'masala dosa'.
    """
    en_words = _words(en_pred)
    for item in groq_items:
        item_words = _words(item)
        if en_words & item_words:  # any word in common
            return True
    return False


def run(image: Image.Image, image_path: str = "") -> dict:
    """
    Classify a food image using EfficientNet and Groq in parallel.

    Groq sees the full image and returns all food items it identifies.
    EfficientNet's top-1 is compared against Groq's list (fuzzy word overlap)
    for mismatch logging. If Groq fails, EfficientNet result is used.

    Args:
        image: PIL Image to classify.
        image_path: Original file path (used only for mismatch logging).

    Returns:
        Dict with 'food_items' (list), 'en_pred', 'confidence', and 'source'.
    """
    with ThreadPoolExecutor(max_workers=2) as executor:
        en_future = executor.submit(classify_food, image)
        groq_future = executor.submit(identify_food, image)

        en_result = en_future.result()

        try:
            groq_result = groq_future.result()
            groq_items = groq_result.get("food_items", [groq_result["food_item"]])
            source = "groq"
        except Exception as exc:
            # Groq unavailable — fall back to EfficientNet
            print(f"[stage1] Groq Vision failed ({exc}), falling back to EfficientNet.")
            groq_items = [en_result["food_item"]]
            source = "efficientnet"

    en_pred = en_result["food_item"]

    if source == "groq" and not _is_match(en_pred, groq_items):
        log_mismatch(
            image_path=image_path,
            en_pred=en_pred,
            groq_pred=", ".join(groq_items),
        )

    return {
        "food_items": groq_items,
        "en_pred": en_pred,
        "confidence": en_result["confidence"],
        "source": source,
    }
