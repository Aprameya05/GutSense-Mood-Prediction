import { motion } from 'framer-motion'
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { DemoData } from '../../data/demoData'

interface Props {
  data: DemoData['metabolic'] | null
}

export const Stage5Metabolic: React.FC<Props> = ({ data }) => {
  if (!data) return null

  return (
    <section className="rounded-3xl border border-slate-800/80 bg-slate-950/80 px-6 md:px-8 py-8 shadow-[0_0_40px_rgba(15,23,42,0.9)]">
      <p className="text-[11px] font-mono uppercase tracking-[0.3em] text-accent-teal">
        Stage 5 • Metabolic Response
      </p>
      <h2 className="mt-2 text-xl md:text-2xl font-display text-slate-50">
        Glucose curve and fiber shield
      </h2>

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] items-center">
        <div className="h-64">
          <ResponsiveContainer>
            <LineChart data={data.curve}>
              <XAxis dataKey="t" stroke="#4b5563" tick={{ fontSize: 10 }} />
              <YAxis stroke="#4b5563" tick={{ fontSize: 10 }} />
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
                dataKey="value"
                stroke={data.status === 'HIGH' ? '#FB7185' : data.status === 'ELEVATED' ? '#F97316' : '#22C55E'}
                strokeWidth={2.4}
                dot={false}
                isAnimationActive
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-4">
          <motion.div
            className="rounded-2xl border border-slate-800/80 bg-slate-900/80 px-4 py-3"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="text-[11px] font-mono uppercase tracking-[0.3em] text-slate-400">
              Glycemic Load
            </p>
            <p className="mt-1 text-3xl font-mono text-accent-gold">{data.glycemicLoad}</p>
            <p className="text-xs text-slate-300 font-serif">
              Classified as <span className="text-accent-teal">{data.classification}</span>{' '}
              for this meal.
            </p>
          </motion.div>

          <p className="text-xs text-slate-300 font-serif">
            Fiber attenuation dampens the spike by{' '}
            <span className="text-accent-teal">
              {(data.fiberAttenuation * 100).toFixed(0)}%
            </span>{' '}
            with an estimated crash probability of{' '}
            <span className="text-accent-pink">
              {(data.crashProbability * 100).toFixed(0)}%
            </span>
            .
          </p>
        </div>
      </div>
    </section>
  )
}

