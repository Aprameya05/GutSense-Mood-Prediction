import { motion } from 'framer-motion'
import { Line, LineChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { DemoData } from '../../data/demoData'
import { MoodCharacter } from '../Character/MoodCharacter'

interface Props {
  data: DemoData['mood'] | null
}

export const Stage4Mood: React.FC<Props> = ({ data }) => {
  if (!data) return null

  return (
    <section className="rounded-3xl border border-slate-800/80 bg-slate-950/80 px-6 md:px-8 py-8 shadow-[0_0_40px_rgba(15,23,42,0.9)]">
      <p className="text-[11px] font-mono uppercase tracking-[0.3em] text-accent-teal">
        Stage 4 • Mood & Cognitive State
      </p>
      <h2 className="mt-2 text-xl md:text-2xl font-display text-slate-50">
        How your nervous system feels this meal
      </h2>

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.1fr)] items-center">
        <MoodCharacter mood={data} />

        <div className="space-y-4">
          <p className="text-sm text-slate-300 font-serif">{data.tryptophanContext}</p>
          <p className="text-xs text-slate-400 font-mono">
            Cognitive state:{' '}
            <span className="text-accent-gold">{data.cognitiveState}</span> • Energy:{' '}
            <span className="text-accent-teal">{data.energy}</span> • Anxiety:{' '}
            <span className="text-accent-pink">{data.anxiety}</span>
          </p>

          <div className="h-28">
            <ResponsiveContainer>
              <LineChart data={data.history}>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#020617',
                    border: '1px solid #1e293b',
                    borderRadius: 12,
                    fontSize: 11,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#00FFD1"
                  strokeWidth={2}
                  dot={{ stroke: '#FF6B8A', strokeWidth: 1.5, r: 3 }}
                  isAnimationActive
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </section>
  )
}

