"""Shared data schemas and type hints for GutSense.

These are lightweight runtime-free structures (TypedDicts) that document the
shape of data flowing between the different stages of the pipeline.
"""

from __future__ import annotations

from typing import List, TypedDict


class BBox(TypedDict):
    x1: int
    y1: int
    x2: int
    y2: int


class FoodDetection(TypedDict):
    food_item: str
    confidence: float
    bbox: List[int]  # [x1, y1, x2, y2]


class NutritionProfile(TypedDict):
    fiber: float
    sugar: float
    tryptophan: float
    polyphenol: float
    resistant_starch: float
    fermented: bool


class FoodNutrition(NutritionProfile):
    food_item: str


class MicrobiomeScores(TypedDict):
    scfa_score: float
    serotonin_score: float
    inflammation_score: float
    diversity_score: float


class MoodPrediction(TypedDict):
    mood: float
    energy: float
    confidence: float
    explanation: str


class MealAnalysis(TypedDict):
    foods: List[FoodDetection]
    nutrition: List[FoodNutrition]
    microbiome: MicrobiomeScores
    prediction: MoodPrediction

