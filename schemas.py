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


# --- BioSense extended schemas -------------------------------------------------


class NutritionVector(TypedDict):
    fiber: float
    sugar: float
    protein: float
    fat: float
    polyphenol: float
    tryptophan: float
    omega3: float
    resistant_starch: float
    fermented: bool
    glycemic_load: float


class MicrobiomeState(TypedDict):
    scfa_score: float
    diversity_score: float
    inflammation_score: float
    probiotic_score: float
    gut_balance_score: float


class NeuroState(TypedDict):
    serotonin: float
    dopamine: float
    gaba: float
    cortisol: float
    melatonin: float


class TimeHorizonPrediction(TypedDict):
    horizon_hours: int
    mood: float
    energy: float
    focus: float
    stress: float
    sleep_quality: float
    mental_clarity: float


class PredictionState(TypedDict):
    mood: float
    energy: float
    focus: float
    stress: float
    sleep_quality: float
    mental_clarity: float
    timeline: List[TimeHorizonPrediction]


class HealthScore(TypedDict):
    overall_score: float
    brain_score: float
    gut_score: float
    metabolism_score: float
    inflammation_risk: float
    burnout_risk: float


class Explanation(TypedDict):
    summary: str
    bullets: List[str]


class BioSenseAnalysis(TypedDict):
    foods: List[FoodDetection]
    nutrition: List[NutritionVector]
    microbiome: MicrobiomeState
    neuro: NeuroState
    prediction: PredictionState
    health: HealthScore
    explanation: Explanation

