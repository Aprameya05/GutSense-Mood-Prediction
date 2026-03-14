"""Model C: Food identification using Groq Vision API (Llama 4 Scout)."""

import base64
import io
import os

from groq import Groq
from PIL import Image

# Vision model — override via GROQ_VISION_MODEL env var without code changes
GROQ_VISION_MODEL = os.environ.get(
    "GROQ_VISION_MODEL", "meta-llama/llama-4-scout-17b-16e-instruct"
)
# Max dimension for the image sent to Groq (larger = more detail, but slower)
_MAX_IMAGE_DIM = 1120


def _prepare_image(image: Image.Image) -> str:
    """Resize image to fit within _MAX_IMAGE_DIM and return base64 data URI."""
    w, h = image.size
    if max(w, h) > _MAX_IMAGE_DIM:
        scale = _MAX_IMAGE_DIM / max(w, h)
        image = image.resize((int(w * scale), int(h * scale)), Image.LANCZOS)

    buffer = io.BytesIO()
    image.save(buffer, format="JPEG", quality=90)
    b64 = base64.b64encode(buffer.getvalue()).decode("utf-8")
    return f"data:image/jpeg;base64,{b64}"


def identify_food(image: Image.Image) -> dict:
    """
    Identify food in image using Groq Vision API (Llama 4 Scout).

    Args:
        image: PIL Image.

    Returns:
        Dict with 'food_items' (list[str]) and 'food_item' (str, primary item).
    """
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        raise ValueError("GROQ_API_KEY environment variable is required.")

    client = Groq(api_key=api_key)
    data_uri = _prepare_image(image)

    response = client.chat.completions.create(
        model=GROQ_VISION_MODEL,
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a precise food recognition expert specializing in Indian cuisine. "
                    "When identifying food, use exact dish names without adding adjectives like "
                    "'delicious' or 'fresh'. Never say 'I see' or explain yourself."
                ),
            },
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": (
                            "List ALL the distinct food items visible in this image. "
                            "Use specific dish names (e.g. masala dosa, sambar, coconut chutney, "
                            "biryani, paneer tikka, chole bhature, idli, vada, dal makhani, roti). "
                            "Output ONLY a comma-separated list of food names — no other text."
                        ),
                    },
                    {"type": "image_url", "image_url": {"url": data_uri}},
                ],
            },
        ],
        max_tokens=200,
        temperature=0.1,
    )

    raw = response.choices[0].message.content.strip().lower()
    # Strip trailing punctuation and filter empty tokens
    food_items = [item.strip().strip(".,;:") for item in raw.split(",") if item.strip()]
    # Remove any items that look like sentences (model leaked explanation text)
    food_items = [item for item in food_items if len(item.split()) <= 6]
    if not food_items:
        food_items = [raw]
    return {"food_items": food_items, "food_item": food_items[0]}
