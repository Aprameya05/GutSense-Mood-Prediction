"""Food detection and classification pipeline."""

from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

from PIL import Image

from models.yolo_detector import detect_food
from models.food_classifier import classify_food
from models.groq_fallback import identify_food

CONFIDENCE_THRESHOLD = 0.65


def analyze_food_image(image_path: str) -> list[dict]:
    """
    Detect and classify food in an image.

    Pipeline:
    1. YOLO detects food objects
    2. Crop each region and classify with EfficientNet
    3. If EfficientNet confidence < 0.65, use Groq API fallback

    Args:
        image_path: Path to the image file.

    Returns:
        List of dicts: {"food_item": str, "confidence": float, "bbox": [x1, y1, x2, y2]}
    """
    image_path = Path(image_path)
    if not image_path.exists():
        raise FileNotFoundError(f"Image not found: {image_path}")

    img = Image.open(image_path).convert("RGB")
    detections = detect_food(str(image_path))

    # If YOLO finds no food, use whole image as single crop
    if not detections:
        detections = [{"bbox": [0, 0, img.width, img.height], "confidence": 0.0}]

    results = []
    for det in detections:
        x1, y1, x2, y2 = det["bbox"]
        crop = img.crop((x1, y1, x2, y2))

        if crop.width < 10 or crop.height < 10:
            continue

        pred = classify_food(crop)

        if pred["confidence"] >= CONFIDENCE_THRESHOLD:
            food_item = pred["food_item"]
            confidence = pred["confidence"]
        else:
            try:
                fallback = identify_food(crop)
                food_item = fallback["food_item"]
                confidence = CONFIDENCE_THRESHOLD
            except ValueError:
                food_item = pred["food_item"]
                confidence = pred["confidence"]

        results.append({
            "food_item": food_item,
            "confidence": confidence,
            "bbox": det["bbox"],
        })

    return results

