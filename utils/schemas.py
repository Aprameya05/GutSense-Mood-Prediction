"""Pydantic models for all API request/response types.

Translated from specs.md Section 5 TypeScript interfaces.
"""

from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field


# ── Enums / Literal types ───────────────────────────────────────────────

SexType = Literal["male", "female"]
DietType = Literal["vegetarian", "non-vegetarian", "vegan"]
DietTypeExtended = Literal["vegetarian", "non-vegetarian", "vegan", "omnivore"]
ActivityLevel = Literal["sedentary", "light", "moderate", "heavy"]
SleepQuality = Literal["poor", "fair", "good", "excellent"]
CognitiveState = Literal["sharp", "clear", "mild_fog", "brain_fog", "drowsy"]
EnergyLevel = Literal["very_low", "low", "moderate", "high", "very_high"]
AnxietyLevel = Literal["none", "mild", "moderate", "high"]
MoodEmoji = Literal["😄", "🙂", "😐", "😟", "😔", "😴", "🤯"]
MoodLabel = Literal[
    "very_happy", "happy", "neutral", "worried", "sad", "sleepy", "overwhelmed"
]
GlycemicLoad = Literal["low", "medium", "high", "unknown"]
GlucoseSpike = Literal["mild", "moderate", "high"]
InsulinDemand = Literal["low", "moderate", "high"]
SourceDB = Literal["IFCT_2017", "USDA_FDC", "INDB", "groq_estimate"]
FoodSource = Literal["groq", "efficientnet", "stub", "synthetic"]
MealId = Literal["breakfast", "lunch", "dinner", "snack"]
BloatingLevel = Literal["none", "mild", "moderate", "severe"]
GasLevel = Literal["none", "mild", "moderate", "severe"]
DigestionQuality = Literal["poor", "fair", "good", "excellent"]
InflammationLevel = Literal["low", "moderate", "high"]
SCFAProxy = Literal["low", "moderate", "high"]
SleepStability = Literal["low", "moderate", "high"]
RiskLevel = Literal["none", "mild", "moderate", "elevated"]
RiskFlag = Literal[
    "persistent_brain_fog",
    "chronic_sleep_debt",
    "mood_instability",
    "metabolic_dysregulation",
    "inflammation_persistence",
    "circadian_disruption",
    "combined_neuro_stress",
    "b12_deficiency_signal",
]
PatternConfidence = Literal["high", "moderate", "low"]
TrendDirection = Literal["increasing", "decreasing", "flat"]
CorrelationDirection = Literal["positive", "negative"]


# ── Stage 0: User Profile ──────────────────────────────────────────────


class RegisterRequest(BaseModel):
    user_id: str
    age: int = Field(gt=0)
    sex: SexType
    height_cm: float = Field(gt=0)
    weight_kg: float = Field(gt=0)
    diet_type: DietType
    activity_level: ActivityLevel
    sleep_schedule: str
    known_conditions: list[str] = Field(default_factory=list)
    supplements: list[str] = Field(default_factory=list)
    medications: list[str] = Field(default_factory=list)


class LoginRequest(BaseModel):
    user_id: str


class UserProfileResponse(BaseModel):
    user_id: str
    age: int
    sex: SexType
    height_cm: float
    weight_kg: float
    diet_type: DietType
    activity_level: ActivityLevel
    sleep_schedule: str
    known_conditions: list[str]
    supplements: list[str]
    medications: list[str]
    bmr_kcal: float
    tdee_kcal: float
    activity_multiplier: float
    baseline_established: bool
    timestamp: str


# ── Stage 1: Food Identification ───────────────────────────────────────


class Stage1Output(BaseModel):
    food_items: list[str]
    en_pred: str
    confidence: float = Field(ge=0.0, le=1.0)
    source: FoodSource
    timestamp: str


# ── Stage 2: Nutrition ─────────────────────────────────────────────────


class NutritionRecord(BaseModel):
    food_item: str
    portion_g: float
    source_db: SourceDB
    calories_kcal: float
    carbohydrates_g: float
    protein_g: float
    fat_g: float
    fiber_g: float
    glycemic_load: GlycemicLoad
    tryptophan_mg: float
    omega3_mg: float
    iron_mg: float
    magnesium_mg: float
    vitamin_b6_mg: float
    vitamin_b12_ug: float
    zinc_mg: float


class NutritionTotals(BaseModel):
    calories_kcal: float = 0.0
    carbs_g: float = 0.0
    protein_g: float = 0.0
    fat_g: float = 0.0
    fiber_g: float = 0.0
    glycemic_load: GlycemicLoad = "unknown"
    tryptophan_mg: float = 0.0
    omega3_mg: float = 0.0
    iron_mg: float = 0.0
    magnesium_mg: float = 0.0
    b6_mg: float = 0.0
    b12_mcg: float = 0.0
    zinc_mg: float = 0.0


class Stage2Output(BaseModel):
    items: list[NutritionRecord]
    totals: NutritionTotals
    timestamp: str


class MealLogResponse(BaseModel):
    stage1: Stage1Output
    stage2: Stage2Output


# ── Stage 3: Gut Microbiome Proxy ──────────────────────────────────────


class Stage3Output(BaseModel):
    microbiome_diversity_index: float
    inflammation_risk_score: float
    inflammation_risk_level: InflammationLevel
    digestion_stability_score: float
    scfa_production_proxy: SCFAProxy
    fiber_intake_today_g: float
    fermented_food_consumed: bool
    timestamp: str


class Stage3Response(BaseModel):
    stage3: Stage3Output


# ── Stage 4: Mood ──────────────────────────────────────────────────────


class MoodInput(BaseModel):
    mood_emoji: MoodEmoji
    mood_rating: int = Field(ge=1, le=10)
    cognitive_state: CognitiveState
    energy_level: EnergyLevel
    anxiety_level: AnxietyLevel
    timestamp: Optional[str] = None


class Stage4Output(BaseModel):
    mood_score: float
    mood_label: MoodLabel
    cognitive_state: CognitiveState
    cognitive_penalty: float
    energy_level: EnergyLevel
    anxiety_level: AnxietyLevel
    emoji_used: Optional[str] = None
    tryptophan_context_mg: float
    hours_since_meal: float
    timestamp: str


# ── Stage 5: Metabolic Response ────────────────────────────────────────


class Stage5Output(BaseModel):
    estimated_glucose_spike: GlucoseSpike
    spike_delta_mg_dl: float
    fiber_attenuation_factor: float
    energy_crash_probability: float
    late_meal_penalty_applied: bool
    insulin_demand_proxy: InsulinDemand
    timestamp: str


class MoodMetabolicResponse(BaseModel):
    stage4: Stage4Output
    stage5: Stage5Output


# ── Digestion Input ────────────────────────────────────────────────────


class DigestInput(BaseModel):
    bloating: BloatingLevel
    stool_quality: int = Field(ge=1, le=7)
    gas_discomfort: GasLevel
    digestion_quality: DigestionQuality
    fermented_food_today: bool


# ── Stage 6: Sleep ─────────────────────────────────────────────────────


class SleepInput(BaseModel):
    sleep_onset: str
    wake_time: str
    sleep_quality: SleepQuality = "good"
    night_awakenings: int = Field(ge=0, default=0)
    caffeine_after_14h: bool = False
    screen_before_bed_min: int = Field(ge=0, default=30)
    last_meal_to_bed_hours: Optional[float] = 3.0


class SleepOutput(BaseModel):
    sleep_onset: str
    wake_time: str
    sleep_hours: float
    sleep_debt: float
    cumulative_debt_7d: float
    circadian_regularity_index: float
    neurological_stress_proxy: float
    sleep_quality: SleepQuality
    sleep_stability: SleepStability
    night_awakenings: int = 0
    caffeine_after_14h: bool = False
    screen_before_bed_min: int = 0
    timestamp: Optional[str] = None


# ── Meal Entry & Save ──────────────────────────────────────────────────


class MealEntry(BaseModel):
    meal_id: MealId
    meal_time: str
    stage1: Stage1Output
    stage2: Stage2Output
    stage4: Stage4Output
    stage5: Stage5Output


class MealSaveStage1(BaseModel):
    food_items: list[str]
    en_pred: str
    confidence: float
    source: str
    timestamp: str


class MealSaveStage4(BaseModel):
    mood_score: float
    mood_label: str
    cognitive_state: str
    cognitive_penalty: float
    energy_level: str
    anxiety_level: str
    emoji_used: Optional[str] = None
    tryptophan_context_mg: float
    hours_since_meal: float
    timestamp: str


class MealSaveStage5(BaseModel):
    estimated_glucose_spike: str
    spike_delta_mg_dl: float
    fiber_attenuation_factor: float
    energy_crash_probability: float
    late_meal_penalty_applied: bool
    insulin_demand_proxy: str
    timestamp: str


class MealSaveMealData(BaseModel):
    stage1: MealSaveStage1
    stage2: Stage2Output
    stage4: MealSaveStage4
    stage5: MealSaveStage5


class MealSaveRequest(BaseModel):
    user_id: str
    date: str
    meal_id: Optional[MealId] = None
    meal_data: MealSaveMealData


class DailyMoodSummary(BaseModel):
    avg_mood_score: float = 0.0
    min_mood_score: float = 0.0
    max_mood_score: float = 0.0
    dominant_cognitive_state: str = "clear"


class MealSaveResponse(BaseModel):
    meal_id: str
    meal_count: int
    daily_totals: NutritionTotals
    daily_mood_summary: DailyMoodSummary


# ── Daily Aggregates ───────────────────────────────────────────────────


class DailyGut(BaseModel):
    microbiome_diversity_index: float = 0.0
    inflammation_risk_score: float = 0.0
    inflammation_risk_level: InflammationLevel = "low"
    digestion_stability_score: float = 0.0
    scfa_production_proxy: SCFAProxy = "low"


class DailyLog(BaseModel):
    date: str
    meals: list[MealEntry] = Field(default_factory=list)
    digestion: Optional[DigestInput] = None
    sleep: Optional[SleepOutput] = None
    daily_totals: NutritionTotals = Field(default_factory=NutritionTotals)
    daily_gut: DailyGut = Field(default_factory=DailyGut)
    daily_mood_summary: DailyMoodSummary = Field(default_factory=DailyMoodSummary)
    diet_type: DietTypeExtended = "vegetarian"


class HistoryResponse(BaseModel):
    logs: list[DailyLog]
    count: int


# ── API Request Bodies ─────────────────────────────────────────────────


class DigestionSubmitRequest(BaseModel):
    user_id: str
    date: str
    digestion: DigestInput


class MoodSubmitRequest(BaseModel):
    user_id: str
    date: str
    meal_timestamp: str
    stage2_totals: NutritionTotals
    stage0_profile: dict
    mood_input: MoodInput


class SleepLogRequest(BaseModel):
    user_id: str
    date: str
    sleep_input: SleepInput


class ProfileUpdateRequest(BaseModel):
    user_id: str
    age: int = Field(gt=0)
    sex: SexType
    height_cm: float = Field(gt=0)
    weight_kg: float = Field(gt=0)
    diet_type: DietType
    activity_level: ActivityLevel
    sleep_schedule: str
    known_conditions: list[str] = Field(default_factory=list)
    supplements: list[str] = Field(default_factory=list)
    medications: list[str] = Field(default_factory=list)


# ── Stage 7: Trends ────────────────────────────────────────────────────


class CorrelationResult(BaseModel):
    pair: str
    r: float
    p: float
    lag_days: int
    n: int
    expected_direction: CorrelationDirection
    significant: bool


class AnomalyEvent(BaseModel):
    date: str
    metric: str
    z_score: float
    value: float
    rolling_mean: float
    rolling_std: float


class TrendDirectionModel(BaseModel):
    slope: float
    direction: TrendDirection


class TrendsOutput(BaseModel):
    correlations: list[CorrelationResult]
    significant_correlations: list[CorrelationResult]
    anomalies: list[AnomalyEvent]
    anomalies_detected: int
    fiber_trend: TrendDirectionModel
    mdi_trend: TrendDirectionModel
    groq_summary: str
    pattern_confidence: PatternConfidence
    days_analyzed: int
    timestamp: str


# ── Stage 8: Baselines ─────────────────────────────────────────────────


class StabilityDetail(BaseModel):
    cv_percent: float
    stable: bool


class StabilityDetails(BaseModel):
    mood: StabilityDetail = Field(default_factory=lambda: StabilityDetail(cv_percent=0, stable=False))
    sleep_hours: StabilityDetail = Field(default_factory=lambda: StabilityDetail(cv_percent=0, stable=False))
    digestion_stability: StabilityDetail = Field(default_factory=lambda: StabilityDetail(cv_percent=0, stable=False))
    MDI: StabilityDetail = Field(default_factory=lambda: StabilityDetail(cv_percent=0, stable=False))
    inflammation: StabilityDetail = Field(default_factory=lambda: StabilityDetail(cv_percent=0, stable=False))
    cognitive_score: StabilityDetail = Field(default_factory=lambda: StabilityDetail(cv_percent=0, stable=False))
    neuro_stress: StabilityDetail = Field(default_factory=lambda: StabilityDetail(cv_percent=0, stable=False))


class BaselinesOutput(BaseModel):
    baseline_mood: float
    baseline_sleep_hours: float
    baseline_glucose_spike: str
    baseline_digestion_stability: float
    baseline_MDI: float
    baseline_inflammation_risk: float
    baseline_cognitive_score: float
    baseline_neuro_stress: float
    all_baselines_stable: bool
    baseline_period_days: int
    stability_details: StabilityDetails
    timestamp: str


# ── Stage 9: Risk ──────────────────────────────────────────────────────


class RiskOutput(BaseModel):
    neurological_risk_level: RiskLevel
    active_flags: list[str]
    risk_count: int
    recommendation: str
    professional_consult_suggested: bool
    timestamp: str


# ── Stage 10: Insights ─────────────────────────────────────────────────


class InsightsOutput(BaseModel):
    diet_mood_correlation: str
    gut_health_proxy: str
    metabolic_stability: str
    sleep_stability: str
    neurological_risk_flag: str
    top_insight: str
    insights_count: int
    insights: list[str]
    disclaimer: str
    generated_by: str
    timestamp: str


# ── Error responses ────────────────────────────────────────────────────


class ErrorResponse(BaseModel):
    error: str


class ValidationErrorResponse(BaseModel):
    errors: list[str]


class FeatureLockedResponse(BaseModel):
    error: str
    days_logged: int
