import { useCallback, useEffect, useState } from 'react'
import { demoData } from '../data/demoData'

export type StageKey =
  | 0
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10

export interface StageStatus {
  id: StageKey
  label: string
  completed: boolean
  active: boolean
}

interface PipelineState {
  stages: Record<StageKey, StageStatus>
  foodIdentification: typeof demoData.foodIdentification | null
  digestiveJourney: typeof demoData.digestiveJourney | null
  nutrition: typeof demoData.nutrition | null
  gutProxy: typeof demoData.gutProxy | null
  mood: typeof demoData.mood | null
  metabolic: typeof demoData.metabolic | null
  sleep: typeof demoData.sleep | null
  patterns: typeof demoData.patterns | null
  baseline: typeof demoData.baseline | null
  risk: typeof demoData.risk | null
  insights: typeof demoData.insights | null
}

export interface AnalyzePayload {
  file: File
  userId: string
  moodEmoji: string
  moodRating: number
}

const initialStages: Record<StageKey, StageStatus> = {
  0: { id: 0, label: 'Profile', completed: false, active: false },
  1: { id: 1, label: 'Food ID', completed: false, active: false },
  2: { id: 2, label: 'Nutrition', completed: false, active: false },
  3: { id: 3, label: 'Gut Proxy', completed: false, active: false },
  4: { id: 4, label: 'Mood', completed: false, active: false },
  5: { id: 5, label: 'Metabolic', completed: false, active: false },
  6: { id: 6, label: 'Sleep', completed: false, active: false },
  7: { id: 7, label: 'Patterns', completed: false, active: false },
  8: { id: 8, label: 'Baseline', completed: false, active: false },
  9: { id: 9, label: 'Risk', completed: false, active: false },
  10: { id: 10, label: 'Insights', completed: false, active: false },
}

const buildInitialState = (): PipelineState => ({
  stages: initialStages,
  foodIdentification: null,
  digestiveJourney: null,
  nutrition: null,
  gutProxy: null,
  mood: null,
  metabolic: null,
  sleep: null,
  patterns: null,
  baseline: null,
  risk: null,
  insights: null,
})

export const usePipelineData = () => {
  const [state, setState] = useState<PipelineState>(() => buildInitialState())
  const [isRunning, setIsRunning] = useState(false)

  const reset = useCallback(() => {
    setState(buildInitialState())
  }, [])

  const runDemo = useCallback(() => {
    if (isRunning) return
    setIsRunning(true)
    reset()

    const schedule = async () => {
      const sleepMs = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

      // Stage 1 - Food ID
      setState((prev) => ({
        ...prev,
        stages: {
          ...prev.stages,
          1: { ...prev.stages[1], active: true },
        },
      }))
      await sleepMs(1200)
      setState((prev) => ({
        ...prev,
        stages: {
          ...prev.stages,
          1: { ...prev.stages[1], active: false, completed: true },
        },
        foodIdentification: demoData.foodIdentification,
      }))

      // Digestive journey + Stage 2
      setState((prev) => ({
        ...prev,
        stages: {
          ...prev.stages,
          2: { ...prev.stages[2], active: true },
        },
        digestiveJourney: demoData.digestiveJourney,
      }))
      await sleepMs(1600)
      setState((prev) => ({
        ...prev,
        stages: {
          ...prev.stages,
          2: { ...prev.stages[2], active: false, completed: true },
        },
        nutrition: demoData.nutrition,
      }))

      // Stage 3 Gut Proxy
      setState((prev) => ({
        ...prev,
        stages: {
          ...prev.stages,
          3: { ...prev.stages[3], active: true },
        },
      }))
      await sleepMs(1200)
      setState((prev) => ({
        ...prev,
        stages: {
          ...prev.stages,
          3: { ...prev.stages[3], active: false, completed: true },
        },
        gutProxy: demoData.gutProxy,
      }))

      // Stage 4 Mood
      setState((prev) => ({
        ...prev,
        stages: {
          ...prev.stages,
          4: { ...prev.stages[4], active: true },
        },
      }))
      await sleepMs(1200)
      setState((prev) => ({
        ...prev,
        stages: {
          ...prev.stages,
          4: { ...prev.stages[4], active: false, completed: true },
        },
        mood: demoData.mood,
      }))

      // Stage 5 Metabolic
      setState((prev) => ({
        ...prev,
        stages: {
          ...prev.stages,
          5: { ...prev.stages[5], active: true },
        },
      }))
      await sleepMs(1000)
      setState((prev) => ({
        ...prev,
        stages: {
          ...prev.stages,
          5: { ...prev.stages[5], active: false, completed: true },
        },
        metabolic: demoData.metabolic,
      }))

      // Stage 6 Sleep
      setState((prev) => ({
        ...prev,
        stages: {
          ...prev.stages,
          6: { ...prev.stages[6], active: true },
        },
      }))
      await sleepMs(800)
      setState((prev) => ({
        ...prev,
        stages: {
          ...prev.stages,
          6: { ...prev.stages[6], active: false, completed: true },
        },
        sleep: demoData.sleep,
      }))

      // Stage 7 Patterns
      setState((prev) => ({
        ...prev,
        stages: {
          ...prev.stages,
          7: { ...prev.stages[7], active: true },
        },
      }))
      await sleepMs(800)
      setState((prev) => ({
        ...prev,
        stages: {
          ...prev.stages,
          7: { ...prev.stages[7], active: false, completed: true },
        },
        patterns: demoData.patterns,
      }))

      // Stage 8 Baseline
      setState((prev) => ({
        ...prev,
        stages: {
          ...prev.stages,
          8: { ...prev.stages[8], active: true },
        },
      }))
      await sleepMs(800)
      setState((prev) => ({
        ...prev,
        stages: {
          ...prev.stages,
          8: { ...prev.stages[8], active: false, completed: true },
        },
        baseline: demoData.baseline,
      }))

      // Stage 9 Risk
      setState((prev) => ({
        ...prev,
        stages: {
          ...prev.stages,
          9: { ...prev.stages[9], active: true },
        },
      }))
      await sleepMs(800)
      setState((prev) => ({
        ...prev,
        stages: {
          ...prev.stages,
          9: { ...prev.stages[9], active: false, completed: true },
        },
        risk: demoData.risk,
      }))

      // Stage 10 Insights
      setState((prev) => ({
        ...prev,
        stages: {
          ...prev.stages,
          10: { ...prev.stages[10], active: true },
        },
      }))
      await sleepMs(1200)
      setState((prev) => ({
        ...prev,
        stages: {
          ...prev.stages,
          10: { ...prev.stages[10], active: false, completed: true },
        },
        insights: demoData.insights,
      }))

      setIsRunning(false)
    }

    void schedule()
  }, [isRunning, reset])

  const analyzeMeal = useCallback(
    async (payload: AnalyzePayload) => {
      if (isRunning) return
      setIsRunning(true)
      reset()

      const formData = new FormData()
      formData.append('image', payload.file)
      formData.append('user', payload.userId)
      formData.append('mood_emoji', payload.moodEmoji)
      formData.append('mood_rating', String(payload.moodRating))

      try {
        const res = await fetch('http://localhost:8000/api/analyze', {
          method: 'POST',
          body: formData,
        })
        if (!res.ok) {
          console.error('API error', await res.text())
          setIsRunning(false)
          return
        }
        const json = await res.json()

        const stage1 = json.stage1 as { food_items: string[]; source: string; confidence: number }
        const stage3 = json.stage3 as any
        const stage4 = json.stage4 as any
        const stage5 = json.stage5 as any
        const stage6 = (json.stage6 || null) as any
        const stage10 = json.stage10 as any
        const totals = (json.stage2?.totals || {}) as any

        const mealImageUrl = URL.createObjectURL(payload.file)

        const numericGlycemicLoad = Number(totals.glycemic_load)
        const safeGlycemicLoad = Number.isFinite(numericGlycemicLoad) ? numericGlycemicLoad : 0

        setState((prev) => ({
          ...prev,
          stages: {
            ...prev.stages,
            1: { ...prev.stages[1], completed: true },
            2: { ...prev.stages[2], completed: true },
            3: { ...prev.stages[3], completed: true },
            4: { ...prev.stages[4], completed: true },
            5: { ...prev.stages[5], completed: true },
            6: { ...prev.stages[6], completed: Boolean(stage6) },
            7: { ...prev.stages[7], completed: Boolean(json.stage7) },
            8: { ...prev.stages[8], completed: Boolean(json.stage8) },
            9: { ...prev.stages[9], completed: Boolean(json.stage9) },
            10: { ...prev.stages[10], completed: true },
          },
          foodIdentification: {
            mealImageUrl,
            items: stage1.food_items.map((name) => ({
              name,
              description: '',
              confidenceEfficientNet: stage1.confidence,
              confidenceGroq: stage1.confidence,
              sourceEfficientNetLabel: stage1.source,
              sourceGroqLabel: stage1.source,
            })),
            mismatchWarning: false,
          },
          digestiveJourney: {
            glycemicLoad: String(totals.glycemic_load ?? 'unknown'),
            fiberGrams: Number(totals.fiber_g ?? 0),
            proteinGrams: Number(totals.protein_g ?? 0),
            fatGrams: Number(totals.fat_g ?? 0),
            keyEvents: [],
          },
          nutrition: {
            source: 'Pipeline',
            macros: [
              { name: 'Calories', value: Number(totals.calories_kcal ?? 0), unit: 'kcal', pct: 0.0, category: 'macro' },
              { name: 'Carbs', value: Number(totals.carbohydrates_g ?? 0), unit: 'g', pct: 0.0, category: 'macro' },
              { name: 'Protein', value: Number(totals.protein_g ?? 0), unit: 'g', pct: 0.0, category: 'macro' },
              { name: 'Fat', value: Number(totals.fat_g ?? 0), unit: 'g', pct: 0.0, category: 'macro' },
              { name: 'Fiber', value: Number(totals.fiber_g ?? 0), unit: 'g', pct: 0.0, category: 'macro' },
            ],
            micros: [],
          },
          gutProxy: {
            mdi: Number(stage3.microbiome_diversity_index ?? 0),
            irs: Number(stage3.inflammation_risk_score ?? 0),
            dss: Number(stage3.digestion_stability_score ?? 0),
            interpretation: {
              mdi: '',
              irs: '',
              dss: '',
            },
          },
          mood: {
            emoji: payload.moodEmoji,
            rating: payload.moodRating,
            cognitiveState: stage4?.cognitive_state ?? 'clear',
            energy: stage4?.energy_level ?? 'moderate',
            anxiety: stage4?.anxiety_level ?? 'none',
            tryptophanContext: '',
            history: [],
          },
          metabolic: {
            glycemicLoad: safeGlycemicLoad,
            classification: String(stage5.estimated_glucose_spike ?? 'unknown'),
            fiberAttenuation: Number(stage5.fiber_attenuation_factor ?? 0),
            crashProbability: Number(stage5.energy_crash_probability ?? 0),
            lateMealPenalty: Boolean(stage5.late_meal_penalty_applied),
            status: 'NORMAL',
            curve: [],
          },
          sleep: stage6
            ? {
                lastNightHours: Number(stage6.sleep_hours ?? 0),
                quality: String(stage6.sleep_stability ?? 'unknown'),
                sleepDebtHours: Number(stage6.sleep_debt ?? 0),
                cri: Number(stage6.circadian_regularity_index ?? 0),
                neurologicalStressProxy: Number(stage6.neurological_stress_proxy ?? 0),
                timeline: [],
              }
            : null,
          patterns: null,
          baseline: null,
          risk: json.stage9
            ? {
                level: String(json.stage9.neurological_risk_level ?? 'NONE').toUpperCase(),
                score: Number(json.stage9.active_flags ?? 0),
                flags: [],
              }
            : null,
          insights: stage10
            ? {
                summary: stage10.top_insight ?? '',
                patterns: [],
                recommendations: stage10.insights ?? [],
                disclaimer: stage10.disclaimer ?? '',
              }
            : null,
        }))
      } catch (error) {
        console.error(error)
      } finally {
        setIsRunning(false)
      }
    },
    [isRunning, reset],
  )

  useEffect(() => {
    setState(buildInitialState())
  }, [])

  return {
    state,
    runDemo,
    isRunning,
    analyzeMeal,
  }
}

