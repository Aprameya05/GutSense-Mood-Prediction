import { motion } from 'framer-motion'
import type { DemoData } from '../../data/demoData'

interface Props {
  data: DemoData['patterns'] | null
}

export const Stage7Patterns: React.FC<Props> = ({ data }) => {
  if (!data) return null

  return (
    <section className="rounded-3xl border border-slate-800/80 bg-slate-950/80 px-6 md:px-8 py-8 shadow-[0_0_40px_rgba(15,23,42,0.9)]">
      <p className="text-[11px] font-mono uppercase tracking-[0.3em] text-accent-teal">
        Stage 7 • 30-Day Pattern Analysis
      </p>
      <h2 className="mt-2 text-xl md:text-2xl font-display text-slate-50">
        Your last month, as a story
      </h2>

      <div className="mt-6 flex flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-slate-300 font-serif max-w-xl">
            Each column is a day: meal type, mood and gut comfort stack into a tiny visual
            memory. Red pulses flag anomaly days.
          </p>
        </div>

        <div className="flex gap-[2px] overflow-x-auto rounded-xl border border-slate-800/80 bg-slate-900/80 px-2 py-3">
          {data.days.map((day) => (
            <div key={day.day} className="flex flex-col items-center gap-1 w-4">
              <div className="h-1.5 w-full rounded bg-slate-700" />
              <div
                className={`h-3 w-full rounded ${
                  day.mealType === 'High-fiber dinner' ? 'bg-emerald-400' : 'bg-slate-500'
                }`}
              />
              <div className="h-3 w-full rounded bg-sky-500/70" />
              {day.anomaly && (
                <motion.div
                  className="h-1.5 w-1.5 rounded-full bg-rose-500"
                  animate={{ scale: [1, 1.8, 1], opacity: [0.8, 0.2, 0.8] }}
                  transition={{ duration: 1.4, repeat: Infinity }}
                />
              )}
              <span className="mt-1 text-[9px] text-slate-500">{day.day}</span>
            </div>
          ))}
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {data.correlations.map((corr, idx) => (
            <motion.div
              key={corr.summary}
              className="rounded-xl border border-slate-800/80 bg-slate-900/80 px-3 py-3"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + idx * 0.1 }}
            >
              <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-slate-400">
                r = {corr.r.toFixed(2)} •{' '}
                {corr.direction === 'positive' ? 'Positive' : 'Negative'} link
              </p>
              <p className="mt-2 text-xs text-slate-100">
                {corr.from} → {corr.to}
              </p>
              <p className="mt-1 text-xs text-slate-300 font-serif">{corr.summary}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

