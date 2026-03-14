// ─── Stage 0: User Profile ───────────────────────────────────────────

export interface UserProfile {
  user_id: string;
  age: number;
  sex: "male" | "female";
  height_cm: number;
  weight_kg: number;
  diet_type: "vegetarian" | "non-vegetarian" | "vegan" | "omnivore";
  activity_level: "sedentary" | "light" | "moderate" | "heavy";
  sleep_schedule: string;
  known_conditions: string[];
  supplements: string[];
  medications: string[];
  bmr_kcal: number;
  tdee_kcal: number;
  activity_multiplier: number;   // 1.2 | 1.375 | 1.55 | 1.725
  baseline_established: boolean;
  timestamp: string;             // ISO 8601
}

// ─── Stage 1: Food Identification ────────────────────────────────────

export interface Stage1Output {
  food_items: string[];
  en_pred: string;
  confidence: number;             // 0.0–1.0
  source: "groq" | "efficientnet" | "stub" | "synthetic";
  timestamp: string;
}

// ─── Stage 2: Nutrition ──────────────────────────────────────────────

export interface NutritionRecord {
  food_item: string;
  portion_g: number;
  source_db: "IFCT_2017" | "USDA_FDC" | "INDB" | "groq_estimate";
  calories_kcal: number;
  carbohydrates_g: number;
  protein_g: number;
  fat_g: number;
  fiber_g: number;
  glycemic_load: "low" | "medium" | "high" | "unknown";
  tryptophan_mg: number;
  omega3_mg: number;
  iron_mg: number;
  magnesium_mg: number;
  vitamin_b6_mg: number;
  vitamin_b12_ug: number;
  zinc_mg: number;
}

export interface NutritionTotals {
  calories_kcal: number;
  carbohydrates_g: number;                
  protein_g: number;
  fat_g: number;
  fiber_g: number;
  glycemic_load: "low" | "medium" | "high" | "unknown";
  tryptophan_mg: number;
  omega3_mg: number;
  iron_mg: number;
  magnesium_mg: number;
  b6_mg: number;                  
  b12_mcg: number;                
  zinc_mg: number;
}

export interface Stage2Output {
  items: NutritionRecord[];
  totals: NutritionTotals;
  timestamp: string;
}

// ─── Stage 3: Gut Microbiome Proxy ───────────────────────────────────

export interface Stage3Output {
  microbiome_diversity_index: number;   // [0.0, 1.0]
  inflammation_risk_score: number;      // [0.0, 1.0]
  inflammation_risk_level: "low" | "moderate" | "high";
  digestion_stability_score: number;    // [0.0, 1.0]
  scfa_production_proxy: "low" | "moderate" | "high";
  fiber_intake_today_g: number;
  fermented_food_consumed: boolean;
  timestamp: string;
}

// ─── Stage 4: Mood ───────────────────────────────────────────────────

export type MoodEmoji = "😄" | "🙂" | "😐" | "😟" | "😔" | "😴" | "🤯";
export type CognitiveState = "sharp" | "clear" | "mild_fog" | "brain_fog" | "drowsy";
export type EnergyLevel = "very_low" | "low" | "moderate" | "high" | "very_high";
export type AnxietyLevel = "none" | "mild" | "moderate" | "high";

export interface MoodInput {
  mood_emoji: MoodEmoji;
  mood_rating: number;           // 1–10
  cognitive_state: CognitiveState;
  energy_level: EnergyLevel;
  anxiety_level: AnxietyLevel;
  timestamp?: string;
}

export interface Stage4Output {
  mood_score: number;            // -2 | -1 | 0 | +1 | +2
  mood_label: "very_happy" | "happy" | "neutral" | "worried" | "sad" | "sleepy" | "overwhelmed";
  cognitive_state: CognitiveState;
  cognitive_penalty: number;     // 0.0 | -0.5 | -1.0 | -1.5
  energy_level: EnergyLevel;
  anxiety_level: AnxietyLevel;
  emoji_used: MoodEmoji;
  tryptophan_context_mg: number;
  hours_since_meal: number;
  timestamp: string;
}

// ─── Stage 5: Metabolic Response ─────────────────────────────────────

export interface Stage5Output {
  estimated_glucose_spike: "mild" | "moderate" | "high";
  spike_delta_mg_dl: number;
  fiber_attenuation_factor: number;   // [0.7, 1.0]
  energy_crash_probability: number;   // [0.0, 1.0]
  late_meal_penalty_applied: boolean;
  insulin_demand_proxy: "low" | "moderate" | "high";
  timestamp: string;
}

// ─── Stage 6: Sleep ──────────────────────────────────────────────────

export type SleepQuality = "poor" | "fair" | "good" | "excellent";

export interface SleepInput {
  sleep_onset: string;               // "HH:MM"
  wake_time: string;                 // "HH:MM"
  sleep_quality: SleepQuality;
  night_awakenings: number;          // integer >= 0
  caffeine_after_14h: boolean;
  screen_before_bed_min: number;     // integer >= 0
  last_meal_to_bed_hours?: number;   // float, default 3.0
}

export interface SleepOutput {
  sleep_onset: string;
  wake_time: string;
  sleep_hours: number;
  sleep_debt: number;                // max(0, 7.5 - sleep_hours)
  cumulative_debt_7d: number;
  circadian_regularity_index: number; // [0.0, 1.0]
  neurological_stress_proxy: number;  // [0.0, 1.0]
  sleep_quality: SleepQuality;
  sleep_stability: "low" | "moderate" | "high";
  night_awakenings: number;
  caffeine_after_14h: boolean;
  screen_before_bed_min: number;
}

// ─── Digestion Input ─────────────────────────────────────────────────

export interface DigestInput {
  bloating: "none" | "mild" | "moderate" | "severe";
  stool_quality: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  fermented_food_today: boolean;
  gas_discomfort: "none" | "mild" | "moderate" | "severe";
  digestion_quality: "poor" | "fair" | "good" | "excellent";
}

// ─── Meal Entry ──────────────────────────────────────────────────────

export interface MealEntry {
  meal_id: "breakfast" | "lunch" | "dinner" | "snack";
  meal_time: string;                 // "HH:MM"
  stage1: Stage1Output;
  stage2: Stage2Output;
  stage4: Stage4Output;
  stage5: Stage5Output;
}

// ─── Daily Aggregates ────────────────────────────────────────────────

export interface DailyTotals extends NutritionTotals {}

export interface DailyGut {
  microbiome_diversity_index: number;
  inflammation_risk_score: number;
  inflammation_risk_level: "low" | "moderate" | "high";
  digestion_stability_score: number;
  scfa_production_proxy: "low" | "moderate" | "high";
}

export interface DailyMoodSummary {
  avg_mood_score: number;
  min_mood_score: number;          // -2 to +2
  max_mood_score: number;          // -2 to +2
  dominant_cognitive_state: CognitiveState;
}

// ─── Daily Log (top-level per-day structure) ─────────────────────────

export interface DailyLog {
  date: string;                     // "YYYY-MM-DD"
  meals: MealEntry[];
  digestion: DigestInput;
  sleep: SleepOutput | null;
  daily_totals: DailyTotals;
  daily_gut: DailyGut;
  daily_mood_summary: DailyMoodSummary;
  diet_type: "vegetarian" | "non-vegetarian" | "vegan" | "omnivore";
}

// ─── Stage 7: Trends ─────────────────────────────────────────────────

export interface CorrelationResult {
  pair: string;
  r: number;
  p: number;
  lag_days: number;
  n: number;
  expected_direction: "positive" | "negative";
  significant: boolean;
}

export interface AnomalyEvent {
  date: string;
  metric: string;
  z_score: number;
  value: number;
  rolling_mean: number;
  rolling_std: number;
}

export interface TrendDirection {
  slope: number;
  direction: "increasing" | "decreasing" | "flat";
}

export interface TrendsOutput {
  correlations: CorrelationResult[];
  significant_correlations: CorrelationResult[];
  anomalies: AnomalyEvent[];
  anomalies_detected: number;
  fiber_trend: TrendDirection;
  mdi_trend: TrendDirection;
  groq_summary: string;
  pattern_confidence: "high" | "moderate" | "low";
  days_analyzed: number;
  timestamp: string;
}

// ─── Stage 8: Baselines ──────────────────────────────────────────────

export interface StabilityDetail {
  cv_percent: number;
  stable: boolean;
}

export interface BaselinesOutput {
  baseline_mood: number;
  baseline_sleep_hours: number;
  baseline_glucose_spike: "mild" | "moderate" | "high" | "unknown";
  baseline_digestion_stability: number;
  baseline_MDI: number;
  baseline_inflammation_risk: number;
  baseline_cognitive_score: number;
  baseline_neuro_stress: number;
  all_baselines_stable: boolean;
  baseline_period_days: number;
  stability_details: {
    mood: StabilityDetail;
    sleep_hours: StabilityDetail;
    digestion_stability: StabilityDetail;
    MDI: StabilityDetail;
    inflammation: StabilityDetail;
    cognitive_score: StabilityDetail;
    neuro_stress: StabilityDetail;
  };
  timestamp: string;
}

// ─── Stage 9: Risk ───────────────────────────────────────────────────

export type RiskFlag =
  | "persistent_brain_fog"
  | "chronic_sleep_debt"
  | "mood_instability"
  | "metabolic_dysregulation"
  | "inflammation_persistence"
  | "circadian_disruption"
  | "combined_neuro_stress"
  | "b12_deficiency_signal";

export interface RiskOutput {
  neurological_risk_level: "none" | "mild" | "moderate" | "elevated";
  active_flags: RiskFlag[];
  risk_count: number;
  recommendation: string;
  professional_consult_suggested: boolean;
  timestamp: string;
}

// ─── Stage 10: Insights ──────────────────────────────────────────────

export interface InsightsOutput {
  diet_mood_correlation: "detected" | "none";
  gut_health_proxy: "low" | "moderate" | "high" | "unknown";
  metabolic_stability: "mild" | "moderate" | "high" | "unknown";
  sleep_stability: "low" | "moderate" | "high" | "unknown";
  neurological_risk_flag: "none" | "mild" | "moderate" | "elevated";
  top_insight: string;
  insights_count: number;
  insights: string[];
  disclaimer: string;
  generated_by: string;
  timestamp: string;
}

export interface QueuedRequest {
  id: string;
  url: string;
  method: "POST" | "PUT" | "PATCH" | "DELETE";
  body?: any;
  createdAt: number;
  retries: number;
}
