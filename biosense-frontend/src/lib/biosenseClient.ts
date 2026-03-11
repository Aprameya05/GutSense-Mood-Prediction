const API_BASE =
  process.env.NEXT_PUBLIC_BIOSENSE_API_BASE ?? "http://127.0.0.1:8000";

export type FoodDetection = {
  food_item: string;
  confidence: number;
  bbox: number[];
};

export type NutritionVector = {
  food_item?: string;
  fiber: number;
  sugar: number;
  protein: number;
  fat: number;
  polyphenol: number;
  tryptophan: number;
  omega3: number;
  resistant_starch: number;
  fermented: boolean;
  glycemic_load: number;
};

export type MicrobiomeState = {
  scfa_score: number;
  diversity_score: number;
  inflammation_score: number;
  probiotic_score: number;
  gut_balance_score: number;
};

export type NeuroState = {
  serotonin: number;
  dopamine: number;
  gaba: number;
  cortisol: number;
  melatonin: number;
};

export type TimeHorizonPrediction = {
  horizon_hours: number;
  mood: number;
  energy: number;
  focus: number;
  stress: number;
  sleep_quality: number;
  mental_clarity: number;
};

export type PredictionState = {
  mood: number;
  energy: number;
  focus: number;
  stress: number;
  sleep_quality: number;
  mental_clarity: number;
  timeline: TimeHorizonPrediction[];
};

export type HealthScore = {
  overall_score: number;
  brain_score: number;
  gut_score: number;
  metabolism_score: number;
  inflammation_risk: number;
  burnout_risk: number;
};

export type Explanation = {
  summary: string;
  bullets: string[];
};

export type BioSenseAnalysis = {
  foods: FoodDetection[];
  nutrition: NutritionVector[];
  microbiome: MicrobiomeState;
  neuro: NeuroState;
  prediction: PredictionState;
  health: HealthScore;
  explanation: Explanation;
};

export async function analyzeMealWithBioSense(
  file: File,
): Promise<BioSenseAnalysis> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE}/biosense/analyze-meal`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    throw new Error(`BioSense API error (${res.status})`);
  }

  return (await res.json()) as BioSenseAnalysis;
}

