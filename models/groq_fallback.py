"""Model C: Fallback food identification using Groq Vision API."""

import base64
import io
import os

from groq import Groq
from PIL import Image


def identify_food(image: Image.Image) -> dict:
    """
    Identify food in image using Groq Vision API.

    Args:
        image: PIL Image (cropped region).

    Returns:
        Dict with 'food_item' (string only; no confidence from API).
    """
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        raise ValueError("GROQ_API_KEY environment variable is required for fallback.")

    client = Groq(api_key=api_key)

    buffer = io.BytesIO()
    image.save(buffer, format="JPEG")
    b64 = base64.b64encode(buffer.getvalue()).decode("utf-8")
    data_uri = f"data:image/jpeg;base64,{b64}"

    response = client.chat.completions.create(
        model="meta-llama/llama-4-scout-17b-16e-instruct",
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": "Identify the food item in this image. Reply with ONLY the food name (e.g. pizza, spaghetti, salad), nothing else.",
                    },
                    {"type": "image_url", "image_url": {"url": data_uri}},
                ],
            }
        ],
        max_tokens=50,
    )

    food_item = response.choices[0].message.content.strip().lower()
    return {"food_item": food_item}

