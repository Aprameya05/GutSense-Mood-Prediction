"""Model A: Food object detection using YOLOv8."""

from pathlib import Path
from ultralytics import YOLO


# COCO food-related class names (YOLOv8 uses COCO dataset)
FOOD_CLASS_NAMES = {
    "banana", "apple", "sandwich", "orange", "broccoli", "carrot",
    "hot dog", "pizza", "donut", "cake", "bottle", "wine glass",
    "cup", "bowl",
}


def load_model():
    """Load pretrained YOLOv8 model."""
    return YOLO("yolov8n.pt")


def detect_food(image_path: str) -> list[dict]:
    """
    Detect food objects in an image.

    Args:
        image_path: Path to the image file.

    Returns:
        List of dicts with 'bbox' [x1, y1, x2, y2] and 'confidence'.
    """
    model = load_model()
    results = model(image_path, verbose=False)[0]

    detections = []
    if results.boxes is None:
        return detections

    for box in results.boxes:
        cls_id = int(box.cls[0])
        cls_name = results.names.get(cls_id, "")
        if cls_name not in FOOD_CLASS_NAMES:
            continue

        xyxy = box.xyxy[0].tolist()
        conf = float(box.conf[0])
        detections.append({
            "bbox": [round(x) for x in xyxy],
            "confidence": round(conf, 2),
        })

    return detections
