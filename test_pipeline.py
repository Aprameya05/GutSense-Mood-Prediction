"""Test script for the food detection pipeline."""

import json
import sys

from pipeline import analyze_food_image

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python test_pipeline.py <image_path>")
        sys.exit(1)

    image_path = sys.argv[1]
    result = analyze_food_image(image_path)
    print(json.dumps(result, indent=2))
