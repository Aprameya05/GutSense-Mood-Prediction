## GutSense

GutSense is an end-to-end AI pipeline that goes from a **meal image** to a
**proxy mood impact score** via food detection, nutrition lookup, and
microbiome-inspired scoring.

### Pipeline overview

- **Stage 1 – Food detection & classification**
  - `pipeline.analyze_food_image(image_path)`
  - YOLOv8 for food object detection.
  - EfficientNet-B0 for food classification.
  - Groq Vision API fallback for low-confidence cases.
  - Convenience re-export in `stage1/__init__.py`.

- **Stage 2 – Nutrition lookup**
  - `stage2.get_nutrition(food_label)`
  - Uses an in-memory nutrition DB for common foods (`dosa`, `idli`, `rice`,
    `dal`, `curd`, `chapati`, `banana`, `vegetable curry`).
  - Optional USDA FoodData Central integration if `USDA_API_KEY` is set.
  - Returns a `NutritionProfile` with:
    - `fiber`, `sugar`, `tryptophan`, `polyphenol`, `resistant_starch`, `fermented`.

- **Stage 3 – Microbiome proxy scores**
  - `stage3.compute_microbiome_scores(nutrition_dict)`
  - Computes:
    - `scfa_score`, `serotonin_score`, `inflammation_score`, `diversity_score`.
  - Based on simple, explicit formulas documented in the code.

- **Stage 4 – Mood prediction**
  - `stage4.predict_mood(microbiome_scores)`
  - Produces:
    - `mood`, `energy`, `confidence`, `explanation`.
  - Explanation is a human-readable narrative justified by the input scores.

- **Full pipeline**
  - `full_pipeline.analyze_meal(image_path)` returns:
    - `foods`: list of detections from Stage 1.
    - `nutrition`: list of per-food nutrition profiles.
    - `microbiome`: combined microbiome scores across foods.
    - `prediction`: mood / energy prediction.

### Running locally

1. **Install dependencies**

   ```bash
   pip install -r requirements.txt
   ```

2. **Set environment variables**

   - `GROQ_API_KEY` (required for Stage 1 Groq fallback).
   - `USDA_API_KEY` (optional, for Stage 2 USDA lookup).

3. **Run the Stage 1 test**

   ```bash
   python test_pipeline.py path/to/meal.jpg
   ```

4. **Run the full pipeline**

   ```bash
   python test_full_pipeline.py path/to/meal.jpg
   ```

   The script prints:

   - Detected foods
   - Nutrition values
   - Microbiome scores
   - Mood prediction (with explanation)

### Code structure

- `models/` – model-specific code (YOLO, EfficientNet, Groq).
- `pipeline.py` – Stage 1 pipeline (unchanged core).
- `stage1/` – re-exports Stage 1 components.
- `stage2/` – nutrition lookup logic.
- `stage3/` – microbiome proxy scoring.
- `stage4/` – mood prediction.
- `schemas.py` – shared data shapes for type safety.
- `full_pipeline.py` – orchestrates stages 1–4.
- `test_pipeline.py` – Stage 1 smoke test.
- `test_full_pipeline.py` – end-to-end smoke test for the full pipeline.

### Notes

- This is a research and prototyping tool, **not** a medical device.
- All nutrition and microbiome-related scores are heuristic and for
  experimentation / exploration only.
