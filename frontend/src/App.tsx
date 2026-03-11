import { useMemo, useState } from 'react'
import './App.css'

type FoodDetection = {
  food_item: string
  confidence: number
  bbox: number[]
}

type FoodNutrition = {
  food_item: string
  fiber: number
  sugar: number
  tryptophan: number
  polyphenol: number
  resistant_starch: number
  fermented: boolean
}

type MicrobiomeScores = {
  scfa_score: number
  serotonin_score: number
  inflammation_score: number
  diversity_score: number
}

type MoodPrediction = {
  mood: number
  energy: number
  confidence: number
  explanation: string
}

type MealAnalysis = {
  foods: FoodDetection[]
  nutrition: FoodNutrition[]
  microbiome: MicrobiomeScores
  prediction: MoodPrediction
}

type StageId = 'upload' | 'detection' | 'nutrition' | 'microbiome' | 'mood'

const STAGES: { id: StageId; label: string; subtitle: string }[] = [
  {
    id: 'upload',
    label: 'Upload',
    subtitle: 'Your meal snapshot',
  },
  {
    id: 'detection',
    label: 'Stage 1 · Vision',
    subtitle: 'YOLO + classifier',
  },
  {
    id: 'nutrition',
    label: 'Stage 2 · Nutrition',
    subtitle: 'Macro & micro lookup',
  },
  {
    id: 'microbiome',
    label: 'Stage 3 · Microbiome',
    subtitle: 'Gut proxy scores',
  },
  {
    id: 'mood',
    label: 'Stage 4 · Mood',
    subtitle: 'Energy & mood impact',
  },
]

const API_BASE =
  (import.meta as any).env?.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000'

function App() {
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [activeStage, setActiveStage] = useState<StageId>('upload')
  const [analysis, setAnalysis] = useState<MealAnalysis | null>(null)
  const [error, setError] = useState<string | null>(null)

  const hasResult = !!analysis

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.files?.[0]
    if (!next) return

    setFile(next)
    setAnalysis(null)
    setError(null)
    setActiveStage('upload')

    const url = URL.createObjectURL(next)
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return url
    })
  }

  const runAnalysis = async () => {
    if (!file) {
      setError('Upload a meal photo first.')
      return
    }

    setIsAnalyzing(true)
    setError(null)
    setAnalysis(null)
    setActiveStage('detection')

    // Visually step through the pipeline while the request runs.
    const stageOrder: StageId[] = ['detection', 'nutrition', 'microbiome', 'mood']
    const timers: number[] = []
    stageOrder.forEach((stage, i) => {
      const id = window.setTimeout(() => {
        setActiveStage(stage)
      }, (i + 1) * 900)
      timers.push(id)
    })

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch(`${API_BASE}/analyze-meal`, {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        throw new Error(`Backend error (${res.status})`)
      }

      const data = (await res.json()) as MealAnalysis
      setAnalysis(data)
      setActiveStage('mood')
    } catch (err: any) {
      console.error(err)
      setError(err?.message ?? 'Something went wrong running the pipeline.')
      setAnalysis(null)
      setActiveStage('upload')
    } finally {
      timers.forEach((id) => window.clearTimeout(id))
      setIsAnalyzing(false)
    }
  }

  const moodSummary = useMemo(() => {
    if (!analysis) return null
    const { prediction } = analysis
    const moodPct = Math.round(prediction.mood * 100)
    const energyPct = Math.round(prediction.energy * 100)
    return { moodPct, energyPct, prediction }
  }, [analysis])

  return (
    <div className="gut-app">
      <header className="gut-header">
        <div className="gut-logo">GutSense</div>
        <nav className="gut-nav">
          <span className="gut-nav-pill">Pipeline</span>
          <span className="gut-nav-pill">Microbiome</span>
          <span className="gut-nav-pill gut-nav-pill--accent">
            Prototype · Local Only
          </span>
        </nav>
      </header>

      <main className="gut-main">
        <section className="gut-hero">
          <div className="gut-hero-copy">
            <h1>
              From plate to{' '}
              <span className="gut-gradient-text">mood & microbiome</span>, in
              one tap.
            </h1>
            <p className="gut-hero-subtitle">
              GutSense runs a four-stage pipeline on your meal photo: vision,
              nutrition, microbiome, and mood. Watch each stage light up in
              real&nbsp;time.
            </p>

            <div className="gut-upload-card">
              <label className="gut-upload-dropzone">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  disabled={isAnalyzing}
                />
                <div className="gut-upload-inner">
                  <div className="gut-upload-icon">📷</div>
                  <div>
                    <div className="gut-upload-title">
                      {file ? file.name : 'Drop a meal photo or browse'}
                    </div>
                    <div className="gut-upload-hint">
                      JPG, PNG. Processed only on your local backend.
                    </div>
                  </div>
                </div>
              </label>

              <button
                className="gut-primary-btn"
                onClick={runAnalysis}
                disabled={!file || isAnalyzing}
              >
                {isAnalyzing ? 'Analyzing meal…' : 'Run GutSense pipeline'}
              </button>

              {error && <div className="gut-error">{error}</div>}
            </div>

            <div className="gut-stage-timeline">
              {STAGES.map((stage, index) => {
                const isActive = stage.id === activeStage
                const isComplete =
                  STAGES.findIndex((s) => s.id === activeStage) > index &&
                  activeStage !== 'upload'

                return (
                  <div
                    key={stage.id}
                    className={[
                      'gut-stage-chip',
                      isActive ? 'gut-stage-chip--active' : '',
                      isComplete ? 'gut-stage-chip--done' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <div className="gut-stage-index">{index + 1}</div>
                    <div className="gut-stage-text">
                      <div className="gut-stage-label">{stage.label}</div>
                      <div className="gut-stage-subtitle">{stage.subtitle}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="gut-hero-visual">
            <div className="gut-phone">
              <div className="gut-phone-screen">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Meal preview"
                    className="gut-meal-preview"
                  />
                ) : (
                  <div className="gut-meal-placeholder">
                    Snap a bowl, plate, or latte to begin.
                  </div>
                )}

                <div className="gut-stage-overlay">
                  <div className="gut-stage-overlay-label">
                    {STAGES.find((s) => s.id === activeStage)?.label}
                  </div>
                  <div className="gut-stage-overlay-bar">
                    {STAGES.filter((s) => s.id !== 'upload').map((stage) => {
                      const idx = STAGES.findIndex((s) => s.id === activeStage)
                      const stageIdx = STAGES.findIndex(
                        (s) => s.id === stage.id,
                      )
                      const filled = hasResult
                        ? stageIdx <= idx
                        : stageIdx < idx
                      return (
                        <span
                          key={stage.id}
                          className={[
                            'gut-stage-dot',
                            filled ? 'gut-stage-dot--filled' : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                        />
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="gut-grid">
          <div className="gut-panel gut-panel--detection">
            <header className="gut-panel-header">
              <div>
                <h2>Stage 1 · Food detection</h2>
                <p>YOLO boxes + classifier labels per region.</p>
              </div>
              <span className="gut-pill">
                {analysis?.foods?.length ?? 0} item
                {(analysis?.foods?.length ?? 0) === 1 ? '' : 's'}
              </span>
            </header>

            <div className="gut-panel-body gut-panel-body--scroll">
              {analysis?.foods && analysis.foods.length > 0 ? (
                analysis.foods.map((food, i) => (
                  <div key={`${food.food_item}-${i}`} className="gut-row">
                    <div className="gut-row-primary">
                      <div className="gut-row-title">
                        {food.food_item || 'Unknown food'}
                      </div>
                      <div className="gut-row-sub">
                        bbox [{food.bbox.join(', ')}]
                      </div>
                    </div>
                    <div className="gut-row-metric">
                      <span className="gut-chip">
                        {(food.confidence * 100).toFixed(0)}% model conf.
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="gut-empty">
                  Run the pipeline to see detected foods.
                </div>
              )}
            </div>
          </div>

          <div className="gut-panel gut-panel--nutrition">
            <header className="gut-panel-header">
              <div>
                <h2>Stage 2 · Nutrition graph</h2>
                <p>Per-food fiber, sugar, polyphenols &amp; more.</p>
              </div>
              <span className="gut-pill">Relative scale · 0–100</span>
            </header>

            <div className="gut-panel-body gut-panel-body--scroll">
              {analysis?.nutrition && analysis.nutrition.length > 0 ? (
                analysis.nutrition.map((nut) => {
                  const max = Math.max(
                    nut.fiber,
                    nut.sugar,
                    nut.polyphenol,
                    nut.resistant_starch,
                    nut.tryptophan,
                    0.0001,
                  )
                  const norm = (v: number) => (v / max) * 100
                  return (
                    <div key={nut.food_item} className="gut-nutrition-card">
                      <div className="gut-nutrition-header">
                        <span className="gut-row-title">{nut.food_item}</span>
                        {nut.fermented && (
                          <span className="gut-chip gut-chip--accent">
                            Fermented
                          </span>
                        )}
                      </div>
                      <div className="gut-nutrition-bars">
                        <NutritionBar
                          label="Fiber"
                          value={norm(nut.fiber)}
                          tone="good"
                        />
                        <NutritionBar
                          label="Sugar"
                          value={norm(nut.sugar)}
                          tone="caution"
                        />
                        <NutritionBar
                          label="Polyphenols"
                          value={norm(nut.polyphenol)}
                          tone="good"
                        />
                        <NutritionBar
                          label="Resistant starch"
                          value={norm(nut.resistant_starch)}
                          tone="good"
                        />
                        <NutritionBar
                          label="Tryptophan"
                          value={norm(nut.tryptophan)}
                          tone="neutral"
                        />
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="gut-empty">
                  Nutrition features will appear once foods are detected.
                </div>
              )}
            </div>
          </div>

          <div className="gut-panel gut-panel--microbiome">
            <header className="gut-panel-header">
              <div>
                <h2>Stage 3 · Microbiome proxy</h2>
                <p>Combined effect of the full plate on your gut.</p>
              </div>
            </header>

            <div className="gut-panel-body gut-micro-grid">
              {analysis ? (
                <>
                  <MicroGauge
                    label="SCFA support"
                    value={analysis.microbiome.scfa_score}
                    tone="good"
                  />
                  <MicroGauge
                    label="Serotonin support"
                    value={analysis.microbiome.serotonin_score}
                    tone="good"
                  />
                  <MicroGauge
                    label="Inflammation"
                    value={analysis.microbiome.inflammation_score}
                    tone="caution"
                    invert
                  />
                  <MicroGauge
                    label="Diversity"
                    value={analysis.microbiome.diversity_score}
                    tone="neutral"
                  />
                </>
              ) : (
                <div className="gut-empty">
                  Microbiome proxies activate once nutrition is computed.
                </div>
              )}
            </div>
          </div>

          <div className="gut-panel gut-panel--mood">
            <header className="gut-panel-header">
              <div>
                <h2>Stage 4 · Mood &amp; energy</h2>
                <p>How might this meal land in the next few hours?</p>
              </div>
              {moodSummary && (
                <span className="gut-pill gut-pill--soft">
                  Model confidence {Math.round(moodSummary.prediction.confidence * 100)}%
                </span>
              )}
            </header>

            {moodSummary ? (
              <div className="gut-panel-body gut-mood-layout">
                <div className="gut-mood-gauges">
                  <RadialGauge
                    label="Mood"
                    value={moodSummary.moodPct}
                    accent="var(--gut-green)"
                  />
                  <RadialGauge
                    label="Energy"
                    value={moodSummary.energyPct}
                    accent="var(--gut-blue)"
                  />
                </div>
                <div className="gut-mood-copy">
                  <h3 className="gut-mood-title">Narrative explanation</h3>
                  <p className="gut-mood-text">
                    {moodSummary.prediction.explanation}
                  </p>
                  <p className="gut-mood-meta">
                    This is a proxy model for experimentation, not a diagnostic
                    or medical tool.
                  </p>
                </div>
              </div>
            ) : (
              <div className="gut-panel-body">
                <div className="gut-empty">
                  Once the full pipeline runs, GutSense will narrate the
                  predicted mood &amp; energy impact here.
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}

type NutritionBarTone = 'good' | 'caution' | 'neutral'

interface NutritionBarProps {
  label: string
  value: number
  tone: NutritionBarTone
}

function NutritionBar({ label, value, tone }: NutritionBarProps) {
  const clamped = Math.max(0, Math.min(100, value))
  return (
    <div className="gut-nutrition-row">
      <span className="gut-nutrition-label">{label}</span>
      <div className="gut-nutrition-track">
        <div
          className={[
            'gut-nutrition-fill',
            `gut-nutrition-fill--${tone}`,
          ].join(' ')}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  )
}

interface MicroGaugeProps {
  label: string
  value: number
  tone: NutritionBarTone
  invert?: boolean
}

function MicroGauge({ label, value, tone, invert }: MicroGaugeProps) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100)
  const display = invert ? 100 - pct : pct
  return (
    <div className="gut-micro-card">
      <div className="gut-micro-header">
        <span className="gut-row-title">{label}</span>
        <span className="gut-micro-value">{display}%</span>
      </div>
      <div className="gut-nutrition-track gut-nutrition-track--thick">
        <div
          className={[
            'gut-nutrition-fill',
            `gut-nutrition-fill--${tone}`,
          ].join(' ')}
          style={{ width: `${display}%` }}
        />
      </div>
    </div>
  )
}

interface RadialGaugeProps {
  label: string
  value: number
  accent: string
}

function RadialGauge({ label, value, accent }: RadialGaugeProps) {
  const radius = 48
  const circumference = 2 * Math.PI * radius
  const clamped = Math.max(0, Math.min(100, value))
  const offset = circumference - (clamped / 100) * circumference

  return (
    <div className="gut-radial">
      <svg
        className="gut-radial-svg"
        viewBox="0 0 120 120"
        aria-hidden="true"
      >
        <circle
          className="gut-radial-bg"
          cx="60"
          cy="60"
          r={radius}
          strokeWidth="10"
        />
        <circle
          className="gut-radial-fg"
          cx="60"
          cy="60"
          r={radius}
          strokeWidth="10"
          stroke={accent}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="gut-radial-center">
        <div className="gut-radial-value">{clamped}%</div>
        <div className="gut-radial-label">{label}</div>
      </div>
    </div>
  )
}

export default App
