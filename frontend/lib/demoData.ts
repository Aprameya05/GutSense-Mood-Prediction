export const demoUser = {
  user_id: "balaji_001",
  name: "Balaji",
  age: 20,
  sex: "male" as const,
  height_cm: 170,
  weight_kg: 76,
  diet_type: "vegetarian" as const,
  activity_level: "heavy" as const,
  sleep_schedule: "23:00-06:30",
  known_conditions: [],
  supplements: ["Vitamin D"],
  medications: [],
  bmr_kcal: 1818,
  tdee_kcal: 3136,
  activity_multiplier: 1.725,
  baseline_established: true,
};

export const demoStage1 = {
  food_items: ["Masala Dosa", "Sambar", "Coconut Chutney"],
  en_pred: "masala_dosa",
  confidence: 0.94,
  source: "efficientnet" as const,
  timestamp: "2026-03-13T12:30:00+05:30",
  descriptions: [
    "Fermented Rice & Lentil Crepe with Potato Filling",
    "Lentil & Vegetable Stew with Tamarind",
    "Fresh Coconut Paste with Green Chili",
  ],
};

export const demoStage2 = {
  items: [
    { food_item: "Masala Dosa", portion_g: 200, source_db: "IFCT_2017" as const, calories_kcal: 260, carbohydrates_g: 42, protein_g: 5, fat_g: 8, fiber_g: 1.8, glycemic_load: "medium" as const, tryptophan_mg: 28, omega3_mg: 80, iron_mg: 2.1, magnesium_mg: 30, vitamin_b6_mg: 0.2, vitamin_b12_ug: 0, zinc_mg: 0.7 },
    { food_item: "Sambar", portion_g: 200, source_db: "IFCT_2017" as const, calories_kcal: 112, carbohydrates_g: 18, protein_g: 2.5, fat_g: 3, fiber_g: 1.2, glycemic_load: "low" as const, tryptophan_mg: 10, omega3_mg: 70, iron_mg: 0.8, magnesium_mg: 14, vitamin_b6_mg: 0.08, vitamin_b12_ug: 0, zinc_mg: 0.4 },
    { food_item: "Coconut Chutney", portion_g: 50, source_db: "IFCT_2017" as const, calories_kcal: 40, carbohydrates_g: 7, protein_g: 0.5, fat_g: 1, fiber_g: 0.2, glycemic_load: "low" as const, tryptophan_mg: 4, omega3_mg: 30, iron_mg: 0.2, magnesium_mg: 4, vitamin_b6_mg: 0.02, vitamin_b12_ug: 0, zinc_mg: 0.1 },
  ],
  totals: {
    calories_kcal: 412,
    carbs_g: 67,
    protein_g: 8,
    fat_g: 12,
    fiber_g: 3.2,
    glycemic_load: "medium" as const,
    tryptophan_mg: 42,
    omega3_mg: 180,
    iron_mg: 3.1,
    magnesium_mg: 48,
    b6_mg: 0.3,
    b12_mcg: 0,
    zinc_mg: 1.2,
  },
  timestamp: "2026-03-13T12:30:05+05:30",
};

export const demoStage3 = {
  microbiome_diversity_index: 0.71,
  inflammation_risk_score: 0.28,
  inflammation_risk_level: "low" as const,
  digestion_stability_score: 0.82,
  scfa_production_proxy: "high" as const,
  fiber_intake_today_g: 18.3,
  fermented_food_consumed: true,
  timestamp: "2026-03-13T12:30:08+05:30",
};

export const demoStage4 = {
  mood_score: 1,
  mood_label: "happy" as const,
  cognitive_state: "clear" as const,
  cognitive_penalty: 0,
  energy_level: "high" as const,
  anxiety_level: "none" as const,
  emoji_used: "🙂",
  tryptophan_context_mg: 42,
  hours_since_meal: 0,
  timestamp: "2026-03-13T12:35:00+05:30",
};

export const demoStage5 = {
  estimated_glucose_spike: "moderate" as const,
  spike_delta_mg_dl: 52,
  fiber_attenuation_factor: 0.82,
  energy_crash_probability: 0.31,
  late_meal_penalty_applied: false,
  insulin_demand_proxy: "moderate" as const,
  timestamp: "2026-03-13T12:30:10+05:30",
};

export const demoStage6 = {
  sleep_onset: "23:30",
  wake_time: "06:30",
  sleep_hours: 7.0,
  sleep_debt: 0.5,
  cumulative_debt_7d: 2.1,
  circadian_regularity_index: 0.73,
  neurological_stress_proxy: 0.34,
  sleep_quality: "good" as const,
  sleep_stability: "high" as const,
  night_awakenings: 1,
  caffeine_after_14h: false,
  screen_before_bed_min: 45,
};

export const demoStage7 = {
  correlations: [
    { pair: "glycemic_load ↔ mood_score", r: -0.88, p: 0.0003, lag_days: 0, n: 30, expected_direction: "negative" as const, significant: true },
    { pair: "fiber_g ↔ MDI", r: 0.71, p: 0.008, lag_days: 1, n: 29, expected_direction: "positive" as const, significant: true },
    { pair: "late_meal ↔ sleep_quality", r: -0.52, p: 0.04, lag_days: 0, n: 30, expected_direction: "negative" as const, significant: true },
    { pair: "tryptophan_mg ↔ next_day_mood", r: 0.48, p: 0.06, lag_days: 1, n: 29, expected_direction: "positive" as const, significant: false },
    { pair: "sleep_debt ↔ cognitive_penalty", r: -0.65, p: 0.02, lag_days: 0, n: 30, expected_direction: "negative" as const, significant: true },
    { pair: "fermented_food ↔ DSS", r: 0.44, p: 0.07, lag_days: 0, n: 30, expected_direction: "positive" as const, significant: false },
    { pair: "carbs_g ↔ IRS", r: 0.39, p: 0.09, lag_days: 0, n: 30, expected_direction: "positive" as const, significant: false },
  ],
  significant_correlations: [
    { pair: "glycemic_load ↔ mood_score", r: -0.88, p: 0.0003, lag_days: 0, n: 30, expected_direction: "negative" as const, significant: true },
    { pair: "fiber_g ↔ MDI", r: 0.71, p: 0.008, lag_days: 1, n: 29, expected_direction: "positive" as const, significant: true },
    { pair: "sleep_debt ↔ cognitive_penalty", r: -0.65, p: 0.02, lag_days: 0, n: 30, expected_direction: "negative" as const, significant: true },
  ],
  anomalies: [
    { date: "2026-03-04", metric: "inflammation_risk_score", z_score: 2.4, value: 0.78, rolling_mean: 0.35, rolling_std: 0.18 },
    { date: "2026-03-08", metric: "mood_score", z_score: -2.1, value: -2, rolling_mean: 0.8, rolling_std: 1.33 },
    { date: "2026-03-11", metric: "sleep_hours", z_score: -2.3, value: 4.5, rolling_mean: 7.1, rolling_std: 1.13 },
  ],
  anomalies_detected: 3,
  fiber_trend: { slope: -0.12, direction: "decreasing" as const },
  mdi_trend: { slope: -0.08, direction: "decreasing" as const },
  groq_summary: "Your dietary patterns show a strong inverse relationship between high-glycemic meals and mood scores. Fiber intake has been declining over the past 2 weeks, correlating with reduced microbiome diversity. Sleep debt accumulation is beginning to affect cognitive clarity.",
  pattern_confidence: "high" as const,
  days_analyzed: 30,
  timestamp: "2026-03-13T12:30:15+05:30",
};

export const demoStage8 = {
  baseline_mood: 6.2,
  baseline_sleep_hours: 7.0,
  baseline_glucose_spike: "moderate" as const,
  baseline_digestion_stability: 0.74,
  baseline_MDI: 0.68,
  baseline_inflammation_risk: 0.31,
  baseline_cognitive_score: 5.8,
  baseline_neuro_stress: 0.38,
  all_baselines_stable: false,
  baseline_period_days: 30,
  stability_details: {
    mood: { cv_percent: 18.3, stable: false },
    sleep_hours: { cv_percent: 12.1, stable: true },
    digestion_stability: { cv_percent: 14.2, stable: true },
    MDI: { cv_percent: 16.8, stable: false },
    inflammation: { cv_percent: 22.5, stable: false },
    cognitive_score: { cv_percent: 11.4, stable: true },
    neuro_stress: { cv_percent: 13.7, stable: true },
  },
  timestamp: "2026-03-13T12:30:18+05:30",
};

export const demoStage9 = {
  neurological_risk_level: "mild" as const,
  active_flags: ["b12_deficiency_signal"] as string[],
  risk_count: 1,
  recommendation: "Your vegetarian diet may benefit from B12 supplementation. Consider fortified foods or a B12 supplement. Continue monitoring cognitive clarity trends.",
  professional_consult_suggested: false,
  timestamp: "2026-03-13T12:30:20+05:30",
};

export const demoStage10 = {
  diet_mood_correlation: "detected" as const,
  gut_health_proxy: "moderate" as const,
  metabolic_stability: "moderate" as const,
  sleep_stability: "high" as const,
  neurological_risk_flag: "mild" as const,
  top_insight: "Your fermented food intake (dosa, idli) is supporting gut diversity. Consider adding more fiber-rich vegetables to further boost your microbiome.",
  insights_count: 4,
  insights: [
    "Fermented foods in your diet are positively supporting microbiome diversity (MDI: 0.71).",
    "High-glycemic meals are strongly correlated with mood dips — consider pairing with fiber-rich sides.",
    "Your B12 intake is consistently at 0 µg from meals. As a vegetarian, supplementation is recommended.",
    "Sleep regularity is good (CRI: 0.73), but cumulative debt of 2.1h this week may affect cognitive performance.",
  ],
  disclaimer: "All observations are informational only. Not medical advice. Consult a qualified healthcare professional for medical concerns.",
  generated_by: "groq-llama-4-scout",
  timestamp: "2026-03-13T12:30:22+05:30",
};

export const demoDigestion = {
  bloating: "none" as const,
  stool_quality: 4,
  gas_discomfort: "none" as const,
  digestion_quality: "good" as const,
  fermented_food_today: true,
};

const emojis = ["😄", "🙂", "🙂", "😐", "😟", "😔", "🤯"];
const moodScores = [2, 1, 1, 0, -1, -2, -2];
const moodLabels = ["very_happy", "happy", "happy", "neutral", "worried", "sad", "overwhelmed"];

function generateHistory(): Array<{
  date: string;
  mood_score: number;
  mood_emoji: string;
  mood_label: string;
  sleep_hours: number;
  mdi: number;
  irs: number;
  dss: number;
  calories: number;
  fiber_g: number;
  glycemic_load: string;
  glucose_spike: string;
  cognitive_state: string;
  neuro_stress: number;
  sleep_debt: number;
  cri: number;
  fermented: boolean;
  late_meal: boolean;
  anomaly: boolean;
}> {
  const history = [];
  const base = new Date("2026-02-12");

  for (let i = 0; i < 30; i++) {
    const d = new Date(base);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().slice(0, 10);

    const isGoodWeek = i < 14;
    const isBadWeek = i >= 16 && i < 26;
    const isRecovery = i >= 26;
    const isAnomaly = [4, 11, 18, 24].includes(i);

    let mood: number, sleep: number, mdi: number, irs: number, fiber: number;

    if (isGoodWeek) {
      mood = 1 + Math.random() * 1;
      sleep = 7 + Math.random() * 1.5;
      mdi = 0.6 + Math.random() * 0.2;
      irs = 0.15 + Math.random() * 0.15;
      fiber = 20 + Math.random() * 10;
    } else if (isBadWeek) {
      mood = -1 + Math.random() * 1;
      sleep = 4.5 + Math.random() * 2;
      mdi = 0.3 + Math.random() * 0.15;
      irs = 0.5 + Math.random() * 0.3;
      fiber = 5 + Math.random() * 8;
    } else if (isRecovery) {
      mood = 0 + Math.random() * 1.5;
      sleep = 6 + Math.random() * 1.5;
      mdi = 0.45 + Math.random() * 0.2;
      irs = 0.3 + Math.random() * 0.2;
      fiber = 12 + Math.random() * 10;
    } else {
      mood = Math.random() * 2 - 0.5;
      sleep = 5.5 + Math.random() * 2;
      mdi = 0.4 + Math.random() * 0.25;
      irs = 0.25 + Math.random() * 0.25;
      fiber = 10 + Math.random() * 12;
    }

    if (isAnomaly) {
      mood = -2;
      irs = 0.75 + Math.random() * 0.2;
    }

    const moodIdx = Math.max(0, Math.min(6, Math.round(2 - mood)));

    history.push({
      date: dateStr,
      mood_score: Math.round(mood * 10) / 10,
      mood_emoji: emojis[moodIdx],
      mood_label: moodLabels[moodIdx],
      sleep_hours: Math.round(sleep * 10) / 10,
      mdi: Math.round(mdi * 100) / 100,
      irs: Math.round(irs * 100) / 100,
      dss: Math.round((0.5 + Math.random() * 0.4) * 100) / 100,
      calories: Math.round(1500 + Math.random() * 1200),
      fiber_g: Math.round(fiber * 10) / 10,
      glycemic_load: fiber > 15 ? "low" : fiber > 8 ? "medium" : "high",
      glucose_spike: fiber > 15 ? "mild" : fiber > 8 ? "moderate" : "high",
      cognitive_state: mood > 0.5 ? "clear" : mood > -0.5 ? "mild_fog" : "brain_fog",
      neuro_stress: Math.round((0.8 - mdi + (7.5 - sleep) * 0.1) * 100) / 100,
      sleep_debt: Math.round(Math.max(0, 7.5 - sleep) * 100) / 100,
      cri: Math.round((0.5 + Math.random() * 0.4) * 100) / 100,
      fermented: Math.random() > 0.4,
      late_meal: isBadWeek && Math.random() > 0.5,
      anomaly: isAnomaly,
    });
  }
  return history;
}

export const demoHistory = generateHistory();

export const demoMoodHistory7d = [
  { day: "Mon", score: 1, emoji: "🙂" },
  { day: "Tue", score: 2, emoji: "😄" },
  { day: "Wed", score: 1, emoji: "🙂" },
  { day: "Thu", score: 0, emoji: "😐" },
  { day: "Fri", score: -1, emoji: "😟" },
  { day: "Sat", score: 1, emoji: "🙂" },
  { day: "Sun", score: 1, emoji: "🙂" },
];

export const nutrientRDA: Record<string, { rda: number; unit: string }> = {
  calories_kcal: { rda: 3136, unit: "kcal" },
  carbs_g: { rda: 400, unit: "g" },
  protein_g: { rda: 60, unit: "g" },
  fat_g: { rda: 78, unit: "g" },
  fiber_g: { rda: 30, unit: "g" },
  tryptophan_mg: { rda: 250, unit: "mg" },
  omega3_mg: { rda: 1600, unit: "mg" },
  iron_mg: { rda: 17, unit: "mg" },
  magnesium_mg: { rda: 400, unit: "mg" },
  b6_mg: { rda: 1.7, unit: "mg" },
  b12_mcg: { rda: 2.4, unit: "µg" },
  zinc_mg: { rda: 12, unit: "mg" },
};

export const riskFlagDetails: Record<string, { name: string; severity: string; evidence: string }> = {
  persistent_brain_fog: { name: "Persistent Brain Fog", severity: "Moderate", evidence: "Brain fog reported on 5+ of last 7 days" },
  chronic_sleep_debt: { name: "Chronic Sleep Debt", severity: "High", evidence: "Cumulative sleep debt > 10h for 2+ consecutive weeks" },
  mood_instability: { name: "Mood Instability", severity: "Moderate", evidence: "Mood score variability (std dev > 2.5) sustained 14+ days" },
  metabolic_dysregulation: { name: "Metabolic Dysregulation", severity: "High", evidence: "High glucose spikes on 60%+ of meals over 14+ days" },
  inflammation_persistence: { name: "Chronic Inflammation", severity: "Moderate", evidence: "Inflammation risk score > 0.6 for 14+ consecutive days" },
  circadian_disruption: { name: "Circadian Disruption", severity: "Moderate", evidence: "Circadian regularity < 0.4 for 14+ days" },
  combined_neuro_stress: { name: "Elevated Neurological Stress", severity: "High", evidence: "Neuro stress proxy > 0.7 for 7+ consecutive days" },
  b12_deficiency_signal: { name: "B12 Deficiency Signal", severity: "Moderate", evidence: "Vegetarian diet + cognitive decline trend tracked over 21+ days" },
};

export const glucoseCurveData = Array.from({ length: 48 }, (_, i) => {
  const t = i / 12;
  const baseline = 90;
  const peak = 52;
  const raw = baseline + peak * Math.exp(-0.5 * ((t - 1.2) / 0.5) ** 2);
  const attenuated = baseline + peak * 0.82 * Math.exp(-0.5 * ((t - 1.2) / 0.55) ** 2);
  return {
    time: Math.round(t * 100) / 100,
    glucose: Math.round(raw * 10) / 10,
    attenuated: Math.round(attenuated * 10) / 10,
    label: `${Math.floor(t)}h ${Math.round((t % 1) * 60)}m`,
  };
});
