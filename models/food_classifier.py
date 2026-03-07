"""Model B: Food classification using EfficientNet-B0."""

import torch
from torchvision import models, transforms
from PIL import Image


def load_model():
    """Load pretrained EfficientNet-B0 (ImageNet)."""
    model = models.efficientnet_b0(weights=models.EfficientNet_B0_Weights.IMAGENET1K_V1)
    model.eval()
    return model


def get_transform():
    """Image preprocessing for EfficientNet."""
    weights = models.EfficientNet_B0_Weights.IMAGENET1K_V1
    return weights.transforms()


def classify_food(image: Image.Image) -> dict:
    """
    Classify a cropped food image.

    Args:
        image: PIL Image (cropped region).

    Returns:
        Dict with 'food_item' and 'confidence'.
    """
    model = load_model()
    transform = get_transform()

    img_tensor = transform(image).unsqueeze(0)
    with torch.no_grad():
        logits = model(img_tensor)
        probs = torch.softmax(logits, dim=1)
        conf, idx = torch.max(probs, dim=1)

    class_idx = idx.item()
    confidence = conf.item()
    food_item = models.EfficientNet_B0_Weights.IMAGENET1K_V1.meta["categories"][class_idx]

    return {
        "food_item": food_item,
        "confidence": round(confidence, 2),
    }
