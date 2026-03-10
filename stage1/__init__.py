"""Stage 1: Food detection and classification for GutSense.

This package simply re-exports the existing Stage 1 components so that
all stages (1–4) can be accessed under a consistent `stageX` namespace.

The original implementation remains in:
  - `pipeline.analyze_food_image`
  - `models.yolo_detector.detect_food`
  - `models.food_classifier.classify_food`
  - `models.groq_fallback.identify_food`

We do NOT modify or move those files; this is just a convenience layer.
"""

from pipeline import analyze_food_image  # noqa: F401
from models.yolo_detector import detect_food  # noqa: F401
from models.food_classifier import classify_food  # noqa: F401
from models.groq_fallback import identify_food  # noqa: F401

__all__ = [
    "analyze_food_image",
    "detect_food",
    "classify_food",
    "identify_food",
]

