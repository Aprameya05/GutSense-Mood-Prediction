export const demoData = {
  foodIdentification: {
    mealImageUrl: '',
    items: [
      {
        name: 'Masala Dosa',
        description: 'Fermented rice & lentil crepe with spiced potato filling',
        confidenceEfficientNet: 0.93,
        confidenceGroq: 0.96,
        sourceEfficientNetLabel: 'masala_dosa',
        sourceGroqLabel: 'South Indian fermented dosa with potato masala',
      },
      {
        name: 'Sambar',
        description: 'Lentil-based vegetable stew, rich in fiber and micronutrients',
        confidenceEfficientNet: 0.87,
        confidenceGroq: 0.91,
        sourceEfficientNetLabel: 'sambar',
        sourceGroqLabel: 'South Indian lentil sambar with vegetables',
      },
      {
        name: 'Coconut Chutney',
        description: 'Coconut and lentil chutney with tempering',
        confidenceEfficientNet: 0.82,
        confidenceGroq: 0.88,
        sourceEfficientNetLabel: 'coconut_chutney',
        sourceGroqLabel: 'Fresh coconut chutney with lentils',
      },
    ],
    mismatchWarning: false,
  },
  digestiveJourney: {
    glycemicLoad: 'MODERATE',
    fiberGrams: 6.4,
    proteinGrams: 11.2,
    fatGrams: 9.1,
    keyEvents: [
      'Fermented batter begins breakdown in mouth with salivary enzymes.',
      'Stomach acids churn dosa + potato, starting starch gelatinization.',
      'Small intestine absorbs carbohydrates and proteins; fiber slows the spike.',
      'Large intestine microbiome ferments remaining fiber, producing short-chain fatty acids.',
    ],
  },
  nutrition: {
    source: 'IFCT + USDA + Groq calibrated',
    macros: [
      { name: 'Calories', value: 420, unit: 'kcal', pct: 0.21, category: 'macro' },
      { name: 'Carbs', value: 58, unit: 'g', pct: 0.19, category: 'macro' },
      { name: 'Protein', value: 11.2, unit: 'g', pct: 0.22, category: 'macro' },
      { name: 'Fat', value: 14.5, unit: 'g', pct: 0.21, category: 'macro' },
      { name: 'Fiber', value: 6.4, unit: 'g', pct: 0.23, category: 'macro' },
    ],
    micros: [
      { name: 'Tryptophan', value: 0.22, unit: 'g', pct: 0.31, insight: 'Supports serotonin synthesis from fermented lentils.' },
      { name: 'Omega-3', value: 0.35, unit: 'g', pct: 0.18, insight: 'Modest anti-inflammatory support from lentils and spices.' },
      { name: 'Iron', value: 3.1, unit: 'mg', pct: 0.19, insight: 'Non-heme iron from lentils; vitamin C in sambar improves absorption.' },
      { name: 'Magnesium', value: 58, unit: 'mg', pct: 0.17, insight: 'Magnesium supports relaxation and neuromuscular balance.' },
      { name: 'Vitamin B6', value: 0.28, unit: 'mg', pct: 0.23, insight: 'B6 co-factor for neurotransmitter production.' },
      { name: 'Vitamin B12', value: 0.3, unit: 'µg', pct: 0.12, insight: 'Borderline for strict vegetarian baseline; monitor long-term.' },
      { name: 'Zinc', value: 1.6, unit: 'mg', pct: 0.18, insight: 'Zinc supports immune balance and gut barrier integrity.' },
    ],
  },
  gutProxy: {
    mdi: 0.71,
    irs: 0.28,
    dss: 0.18,
    interpretation: {
      mdi: 'Fermented batter + lentils support a pleasantly diverse microbiome.',
      irs: 'Low inflammatory load; minimal deep-frying and balanced spices.',
      dss: 'Meal is unlikely to cause significant bloating or urgency for most people.',
    },
  },
  mood: {
    emoji: '🙂',
    rating: 7,
    cognitiveState: 'SHARP',
    energy: 'Steady',
    anxiety: 'Low',
    tryptophanContext: 'Moderate tryptophan intake + fermented matrix support serotonin stability post-meal.',
    history: [
      { day: 'D-6', emoji: '😐', score: 5 },
      { day: 'D-5', emoji: '🙂', score: 7 },
      { day: 'D-4', emoji: '😟', score: 4 },
      { day: 'D-3', emoji: '🙂', score: 7 },
      { day: 'D-2', emoji: '😄', score: 9 },
      { day: 'D-1', emoji: '🙂', score: 7 },
      { day: 'Today', emoji: '🙂', score: 7 },
    ],
  },
  metabolic: {
    glycemicLoad: 14,
    classification: 'Moderate',
    fiberAttenuation: 0.32,
    crashProbability: 0.22,
    lateMealPenalty: false,
    status: 'NORMAL',
    curve: [
      { t: 0, value: 85 },
      { t: 15, value: 105 },
      { t: 30, value: 126 },
      { t: 45, value: 132 },
      { t: 60, value: 124 },
      { t: 90, value: 110 },
      { t: 120, value: 96 },
    ],
  },
  sleep: {
    lastNightHours: 7,
    quality: 'Fair',
    sleepDebtHours: 3.5,
    cri: 0.76,
    neurologicalStressProxy: 0.34,
    timeline: [
      { label: '22:30', state: 'awake' },
      { label: '23:00', state: 'sleep' },
      { label: '01:00', state: 'sleep' },
      { label: '03:00', state: 'light' },
      { label: '05:00', state: 'sleep' },
      { label: '06:30', state: 'fragmented' },
      { label: '07:00', state: 'awake' },
    ],
  },
  patterns: {
    days: Array.from({ length: 30 }).map((_, idx) => ({
      day: idx + 1,
      mealType: idx % 3 === 0 ? 'High-fiber dinner' : 'Typical',
      moodScore: 5 + ((idx * 7) % 4),
      sleepQuality: idx % 5 === 0 ? 'Low' : 'Good',
      gutScore: 0.6 + ((idx % 4) * 0.05),
      anomaly: idx === 11 || idx === 23,
    })),
    correlations: [
      {
        from: 'High-fiber dinners',
        to: 'Next-morning mood',
        r: 0.62,
        direction: 'positive',
        summary: 'Your best mood days follow high-fiber fermented dinners.',
      },
      {
        from: 'Late meals',
        to: 'Sleep quality',
        r: -0.54,
        direction: 'negative',
        summary: 'Meals after 9:30pm reliably erode your sleep depth.',
      },
      {
        from: 'Sleep debt',
        to: 'Gut comfort',
        r: -0.47,
        direction: 'negative',
        summary: 'Multi-day sleep debt subtly worsens gut comfort the following evenings.',
      },
    ],
  },
  baseline: {
    mood: 7.1,
    mdi: 0.69,
    irs: 0.31,
    dss: 0.24,
    avgGlycemicLoad: 13.5,
    avgSleepHours: 7.2,
    stability: 0.82,
  },
  risk: {
    level: 'MILD',
    score: 1,
    flags: [
      {
        id: 'b12_monitoring',
        label: 'B12 reserve monitoring',
        durationDays: 45,
        description:
          'Vegetarian pattern with several days below 20–25% RDA for B12. Not urgent, but worth tracking over months.',
      },
    ],
  },
  insights: {
    summary:
      'Today’s masala dosa-based meal supports a calm gut, stable mood, and only a moderate glucose rise — a well-balanced fermented South Indian pattern.',
    patterns: [
      'Fermented dinners like dosa + sambar correlate with next-morning mood and gut comfort in your last 30 days.',
      'Late, starch-heavy dinners without fiber stand out as red-flag days for both sleep depth and irritability.',
      'On weeks where you stack fermented foods with 7+ hours of sleep, neurological stress markers remain consistently low.',
    ],
    recommendations: [
      'Anchor 2–3 fermented, fiber-rich dinners per week (like dosa + sambar or idli with vegetable sides) as mood-and-gut “reset anchors”.',
      'On days with higher glycemic load meals, pair them earlier in the evening and increase lentil/vegetable portions to buffer the spike.',
      'Discuss long-term B12 strategy with a professional if you plan to sustain a vegetarian pattern; your current intake sits near the edge of comfort.',
      'Continue prioritizing a stable wind-down window; your data shows even 45–60 minutes earlier bedtime measurably improves both mood and gut comfort.',
    ],
    disclaimer:
      'GutSense is an informational tool only and does not provide medical diagnosis or treatment. Always discuss significant changes or concerns with a qualified healthcare professional.',
  },
}

export type DemoData = typeof demoData

