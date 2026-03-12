"""Food detection and classification pipeline."""

from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

from PIL import Image

from stage1.pipeline import run as stage1_run


def analyze_food_image(image_path: str) -> dict:
    """
    Classify food in an image using Stage 1 (EfficientNet + Groq in parallel).

    The full image is sent to both models. Groq returns all identified food
    items; EfficientNet's prediction is compared for mismatch logging.

    Args:
        image_path: Path to the image file.

    Returns:
        Dict with 'food_items', 'en_pred', 'confidence', and 'source'.
    """
    image_path = Path(image_path)
    if not image_path.exists():
        raise FileNotFoundError(f"Image not found: {image_path}")

    img = Image.open(image_path).convert("RGB")
    return stage1_run(img, image_path=str(image_path))
