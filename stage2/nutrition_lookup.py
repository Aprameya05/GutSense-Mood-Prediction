"""Stage 2: Nutrition lookup for GutSense.

This module provides a simple nutrition profile for a given food label.
It uses a small built-in database of common foods and can optionally
query the USDA FoodData Central API if an API key is available.
"""

from __future__ import annotations

import json
import logging
import os
import urllib.parse
import urllib.request
from typing import Any, Dict

from schemas import NutritionProfile


logger = logging.getLogger(__name__)


# Keys returned by get_nutrition
NUTRIENT_KEYS = (
    "fiber",
    "sugar",
    "tryptophan",
    "polyphenol",
    "resistant_starch",
    "fermented",
)


# Approximate nutrition values (arbitrary but consistent scale).
# Values are roughly "grams per serving" or relative units on a 0–10 scale.
# These are heuristic and not meant to be clinically accurate.
LOCAL_NUTRITION_DB: Dict[str, Dict[str, Any]] = {
    "dosa": {
        "fiber": 3.0,
        "sugar": 1.0,
        "tryptophan": 80.0,
        "polyphenol": 2.0,
        "resistant_starch": 2.5,
        "fermented": True,
    },
    "idli": {
        "fiber": 2.5,
        "sugar": 0.5,
        "tryptophan": 70.0,
        "polyphenol": 1.5,
        "resistant_starch": 2.0,
        "fermented": True,
    },
    "rice": {
        "fiber": 1.0,
        "sugar": 0.2,
        "tryptophan": 60.0,
        "polyphenol": 0.5,
        "resistant_starch": 1.5,
        "fermented": False,
    },
    "dal": {
        "fiber": 6.0,
        "sugar": 1.5,
        "tryptophan": 150.0,
        "polyphenol": 3.0,
        "resistant_starch": 2.5,
        "fermented": False,
    },
    "curd": {
        "fiber": 0.0,
        "sugar": 3.0,
        "tryptophan": 120.0,
        "polyphenol": 0.0,
        "resistant_starch": 0.0,
        "fermented": True,
    },
    "chapati": {
        "fiber": 4.0,
        "sugar": 0.5,
        "tryptophan": 90.0,
        "polyphenol": 2.0,
        "resistant_starch": 2.5,
        "fermented": False,
    },
    "banana": {
        "fiber": 3.0,
        "sugar": 12.0,
        "tryptophan": 10.0,
        "polyphenol": 2.0,
        "resistant_starch": 1.0,
        "fermented": False,
    },
    "vegetable curry": {
        "fiber": 5.0,
        "sugar": 3.0,
        "tryptophan": 60.0,
        "polyphenol": 5.0,
        "resistant_starch": 1.5,
        "fermented": False,
    },
}


# Common aliases / variants -> canonical labels for lookup.
FOOD_ALIASES: Dict[str, str] = {
    "plain dosa": "dosa",
    "masala dosa": "dosa",
    "idly": "idli",
    "white rice": "rice",
    "brown rice": "rice",
    "chapathi": "chapati",
    "roti": "chapati",
    "sabzi": "vegetable curry",
    "veg curry": "vegetable curry",
}


DEFAULT_NUTRITION: Dict[str, Any] = {
    "fiber": 3.0,
    "sugar": 5.0,
    "tryptophan": 50.0,
    "polyphenol": 3.0,
    "resistant_starch": 1.0,
    "fermented": False,
}


USDA_API_KEY_ENV = "USDA_API_KEY"
USDA_SEARCH_URL = "https://api.nal.usda.gov/fdc/v1/foods/search"


def _fetch_usda_nutrition(food_label: str) -> Dict[str, Any] | None:
    """
    Optionally fetch nutrition data from USDA FoodData Central.

    This is purposely minimal and defensive: if anything goes wrong
    (no key, network error, unexpected schema), it simply returns None.
    """
    api_key = os.environ.get(USDA_API_KEY_ENV)
    if not api_key:
        return None

    try:
        params = {
            "api_key": api_key,
            "query": food_label,
            "pageSize": 1,
        }
        url = USDA_SEARCH_URL + "?" + urllib.parse.urlencode(params)
        with urllib.request.urlopen(url, timeout=5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except Exception as exc:  # pragma: no cover - defensive logging
        logger.debug("USDA lookup failed for %s: %s", food_label, exc)
        return None

    foods = data.get("foods") or []
    if not foods:
        return None

    food = foods[0]
    nutrients = food.get("foodNutrients") or []

    # Map a few key nutrients if present; everything else will fall back.
    fiber = 0.0
    sugar = 0.0
    tryptophan = 0.0

    for n in nutrients:
        name = (n.get("nutrientName") or "").lower()
        amount = float(n.get("value") or 0.0)
        if "fiber" in name:
            fiber = amount
        elif "sugar" in name and "added" not in name:
            sugar = amount
        elif "tryptophan" in name:
            tryptophan = amount

    if fiber == sugar == tryptophan == 0.0:
        return None

    return {
        "fiber": fiber,
        "sugar": sugar,
        "tryptophan": tryptophan,
        # Polyphenols and resistant starch are not directly available;
        # we keep them at the fallback level.
    }


def _normalize_nutrition(raw: Dict[str, Any]) -> NutritionProfile:
    """Ensure that all expected nutrient keys are present."""
    normalized: Dict[str, Any] = DEFAULT_NUTRITION.copy()
    # Update with whatever we received (local DB or USDA)
    normalized.update(raw)
    # Keep only known keys and preserve types.
    result: Dict[str, Any] = {}
    for key in NUTRIENT_KEYS:
        if key == "fermented":
            result[key] = bool(normalized.get(key, False))
        else:
            value = normalized.get(key, 0.0)
            try:
                result[key] = float(value)
            except (TypeError, ValueError):
                result[key] = 0.0
    return result  # type: ignore[return-value]


def _normalize_label(food_label: str) -> str:
    """Normalize free-text food labels into canonical keys for lookup."""
    key = (food_label or "").strip().lower()
    key = key.replace("_", " ")
    key = " ".join(key.split())
    return FOOD_ALIASES.get(key, key)


def get_nutrition(food_label: str) -> NutritionProfile:
    """
    Look up a simple nutrition profile for a food item.

    Priority:
    1. Local in-memory DB (fast and predictable)
    2. USDA API (if API key is configured)
    3. Generic fallback values
    """
    key = _normalize_label(food_label)

    # 1) Local dictionary DB
    if key in LOCAL_NUTRITION_DB:
        logger.debug("Nutrition (local) for %s", key)
        return _normalize_nutrition(LOCAL_NUTRITION_DB[key])

    # 2) USDA API (best-effort)
    usda_data = _fetch_usda_nutrition(key)
    if usda_data is not None:
        logger.debug("Nutrition (USDA) for %s", key)
        return _normalize_nutrition(usda_data)

    # 3) Fallback generic profile
    logger.debug("Nutrition (fallback) for %s", key)
    return _normalize_nutrition({})

