# Food Detection Pipeline

A Python pipeline that detects and classifies food in images using YOLOv8, EfficientNet-B0, and Groq Vision API fallback.

## Setup

### 1. Create virtual environment (recommended)

```bash
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Linux/Mac
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Groq API key (for fallback when EfficientNet confidence < 0.65)

Get a free API key from [Groq Console](https://console.groq.com/).

Copy the example env file and add your key:

```bash
# Windows (PowerShell)
Copy-Item .env.example .env

# Linux/Mac
cp .env.example .env
```

Edit `.env` and set:

```
GROQ_API_KEY=your-api-key-here
```

The pipeline loads `.env` automatically via `python-dotenv`.

---

## Testing

### Quick test (no Groq needed if EfficientNet is confident)

```bash
python -c "
from pipeline import analyze_food_image
result = analyze_food_image('path/to/your/food_image.jpg')
print(result)
"
```

### Test with a sample image

1. Download a food image (e.g. pizza, salad) or use your own.
2. Run:

```bash
python -c "
from pipeline import analyze_food_image
result = analyze_food_image('test_image.jpg')
for r in result:
    print(f\"{r['food_item']}: {r['confidence']} @ {r['bbox']}\")
"
```

### Test script

Create `test_pipeline.py`:

```python
from pipeline import analyze_food_image
import sys

if len(sys.argv) < 2:
    print("Usage: python test_pipeline.py <image_path>")
    sys.exit(1)

result = analyze_food_image(sys.argv[1])
print(result)
```

Run:
```bash
python test_pipeline.py your_image.jpg
```

---

## Expected output

```python
[
  {"food_item": "pizza", "confidence": 0.82, "bbox": [120, 80, 340, 290]},
  {"food_item": "salad", "confidence": 0.65, "bbox": [50, 200, 180, 350]}
]
```

---

## Notes

- **YOLO**: Uses COCO-pretrained YOLOv8n. Detects food classes: banana, apple, sandwich, orange, broccoli, carrot, hot dog, pizza, donut, cake, bottle, wine glass, cup, bowl.
- **EfficientNet**: ImageNet-pretrained. Classifies into 1000 ImageNet categories.
- **Groq fallback**: Used when EfficientNet confidence < 0.65. Requires `GROQ_API_KEY`.
- If YOLO finds no food, the whole image is sent to the classifier.
