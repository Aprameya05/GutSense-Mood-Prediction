import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts'
import type { DemoData } from '../../data/demoData'

interface Props {
  data: DemoData['risk'] | null
}

export const Stage9Risk: React.FC<Props> = ({ data }) => {
  if (!data) return null

  const chartData = [
    { axis: 'Nutrient', value: data.score >= 1 ? 0.6 : 0.1 },
    { axis: 'Sleep', value: 0.3 },
    { axis: 'Mood', value: 0.2 },
    { axis: 'Metabolic', value: 0.25 },
    { axis: 'Gut', value: 0.18 },
    { axis: 'Circadian', value: 0.22 },
    { axis: 'Stress', value: 0.2 },
    { axis: 'Other', value: 0.1 },
  ]

  const levelColor =
    data.level === 'NONE'
      ? '#22C55E'
      : data.level === 'MILD'
        ? '#FACC15'
        : data.level === 'MODERATE'
          ? '#FB923C'
          : '#F97373'

  return (
    <section className="rounded-3xl border border-slate-800/80 bg-slate-950/80 px-6 md:px-8 py-8 shadow-[0_0_40px_rgba(15,23,42,0.9)]">
      <p className="text-[11px] font-mono uppercase tracking-[0.3em] text-accent-teal">
        Stage 9 • Neurological Risk Detection
      </p>
      <h2 className="mt-2 text-xl md:text-2xl font-display text-slate-50">Risk radar</h2>

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] items-center">
        <div className="h-64">
          <ResponsiveContainer>
            <RadarChart data={chartData}>
              <PolarGrid stroke="#1e293b" />
              <PolarAngleAxis
                dataKey="axis"
                stroke="#6b7280"
                tick={{ fontSize: 9 }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 1]}
                tick={false}
                stroke="#1f2937"
              />
              <Radar
                name="Risk"
                dataKey="value"
                stroke={levelColor}
                fill={levelColor}
                fillOpacity={0.4}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 px-4 py-3 text-xs font-mono">
            <p className="text-[11px] uppercase tracking-[0.25em] text-slate-400">
              Overall level
            </p>
            <p className="mt-1 text-lg" style={{ color: levelColor }}>
              {data.level} • score {data.score}
            </p>
          </div>

          {data.flags.map((flag) => (
            <div
              key={flag.id}
              className="rounded-2xl border border-amber-500/70 bg-amber-950/40 px-4 py-3 text-xs"
            >
              <p className="text-[11px] font-mono uppercase tracking-[0.25em] text-amber-300">
                {flag.label}
              </p>
              <p className="mt-1 text-amber-100">{flag.description}</p>
              <p className="mt-1 text-[11px] text-amber-200 font-mono">
                Duration: {flag.durationDays} days
              </p>
            </div>
          ))}

          {data.level === 'ELEVATED' && (
            <div className="rounded-2xl border border-rose-500/90 bg-rose-950/50 px-4 py-3 text-xs">
              <p className="text-[11px] font-mono uppercase tracking-[0.25em] text-rose-200">
                Consult a professional
              </p>
              <p className="mt-1 text-rose-100">
                GutSense is informational only. If these patterns persist or worsen, consider
                sharing this report with a qualified clinician.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

