"""Test script for the full GutSense pipeline."""

import logging
import sys

from full_pipeline import analyze_meal


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
)


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: python test_full_pipeline.py <image_path>")
        sys.exit(1)

    image_path = sys.argv[1]

    result = analyze_meal(image_path)

    print("\n=== Detected foods ===")
    foods = result.get("foods", [])
    if not foods:
        print("No foods detected.")
    else:
        for idx, f in enumerate(foods, start=1):
            item = f.get("food_item", "unknown")
            conf = f.get("confidence", 0.0)
            bbox = f.get("bbox", [])
            print(f"{idx}. {item} (confidence={conf:.2f}, bbox={bbox})")

    print("\n=== Nutrition values ===")
    for n in result.get("nutrition", []):
        item = n.get("food_item", "unknown")
        print(
            f"- {item}: "
            f"fiber={n.get('fiber', 0.0):.2f}, "
            f"sugar={n.get('sugar', 0.0):.2f}, "
            f"tryptophan={n.get('tryptophan', 0.0):.2f}, "
            f"polyphenol={n.get('polyphenol', 0.0):.2f}, "
            f"resistant_starch={n.get('resistant_starch', 0.0):.2f}, "
            f"fermented={bool(n.get('fermented', False))}"
        )

    print("\n=== Microbiome scores (combined) ===")
    microbiome = result.get("microbiome", {})
    for key in ("scfa_score", "serotonin_score", "inflammation_score", "diversity_score"):
        value = microbiome.get(key, 0.0)
        print(f"{key}: {value:.2f}")

    print("\n=== Mood prediction ===")
    prediction = result.get("prediction", {})
    mood = prediction.get("mood", 0.0)
    energy = prediction.get("energy", 0.0)
    confidence = prediction.get("confidence", 0.0)
    explanation = prediction.get("explanation", "")

    print(f"mood: {mood:.2f}")
    print(f"energy: {energy:.2f}")
    print(f"confidence: {confidence:.2f}")
    if explanation:
        print("\nExplanation:")
        print(explanation)


if __name__ == "__main__":
    main()

