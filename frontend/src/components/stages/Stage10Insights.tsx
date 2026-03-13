import { motion } from 'framer-motion'
import type { DemoData } from '../../data/demoData'

interface Props {
  data: DemoData['insights'] | null
}

export const Stage10Insights: React.FC<Props> = ({ data }) => {
  if (!data) return null

  return (
    <section className="rounded-3xl border border-slate-800/80 bg-slate-950/90 px-6 md:px-8 py-8 shadow-[0_0_60px_rgba(15,23,42,0.9)]">
      <p className="text-[11px] font-mono uppercase tracking-[0.3em] text-accent-teal">
        Stage 10 • GutSense AI Insights
      </p>
      <h2 className="mt-2 text-xl md:text-2xl font-display text-slate-50">
        Today&apos;s narrative — from plate to brain
      </h2>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] items-start">
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950 px-4 py-4 font-mono text-[12px] text-emerald-200">
          <motion.div
            className="mb-3 text-[11px] uppercase tracking-[0.25em] text-slate-400"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
          >
            &gt; Today&apos;s Summary
          </motion.div>
          <motion.p
            className="whitespace-pre-line leading-relaxed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.2 }}
          >
            {data.summary}
          </motion.p>
        </div>

        <div className="space-y-4 text-xs text-slate-200 font-serif">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-[0.25em] text-accent-gold">
              Patterns Detected
            </p>
            <ul className="mt-2 space-y-1.5 list-disc list-inside">
              {data.patterns.map((pattern) => (
                <li key={pattern}>{pattern}</li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-[11px] font-mono uppercase tracking-[0.25em] text-accent-teal">
              Recommendations
            </p>
            <ul className="mt-2 space-y-1.5 list-disc list-inside">
              {data.recommendations.map((rec) => (
                <li key={rec}>{rec}</li>
              ))}
            </ul>
          </div>

          <p className="mt-2 text-[11px] text-slate-500 font-mono">
            {data.disclaimer}
          </p>
        </div>
      </div>
    </section>
  )
}

