import { motion } from 'framer-motion'
import { DigestiveTract } from './DigestiveTract'
import type { DemoData } from '../../data/demoData'

interface Props {
  data: DemoData['digestiveJourney'] | null
}

export const DigestiveJourney: React.FC<Props> = ({ data }) => {
  if (!data) {
    return (
      <section className="rounded-3xl border border-slate-800/80 bg-slate-950/60 px-6 py-10 shadow-glow-pink">
        <p className="text-xs font-mono uppercase tracking-[0.3em] text-slate-400 mb-3">
          Stage 3 • Digestive Journey
        </p>
        <p className="text-sm text-slate-400">
          Once your meal is identified, GutSense will trace every step from mouth to microbiome
          in a living, animated digestive tract.
        </p>
      </section>
    )
  }

  return (
    <section className="rounded-3xl border border-slate-800/80 bg-gradient-to-b from-slate-950/90 via-slate-950/70 to-slate-950/90 px-6 md:px-8 py-8 md:py-10 shadow-[0_0_60px_rgba(15,23,42,0.9)]">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 mb-6">
        <div>
          <p className="text-[11px] font-mono uppercase tracking-[0.3em] text-accent-teal">
            Stage 3 • Digestive Journey
          </p>
          <h2 className="mt-2 text-xl md:text-2xl font-display text-slate-50">
            From plate to microbiome
          </h2>
          <p className="mt-2 max-w-xl text-sm text-slate-300 font-serif">
            Watch your masala dosa travel through mouth, stomach, small intestine and colon,
            with real-time overlays for glycemic load, fiber absorption and microbiome impact.
          </p>
        </div>
        <motion.div
          className="inline-flex items-center gap-3 rounded-full border border-slate-700/80 bg-slate-900/70 px-4 py-2 text-xs font-mono text-slate-200"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <span className="h-2 w-2 rounded-full bg-accent-teal shadow-glow-teal" />
          8-second cinematic tract simulation
        </motion.div>
      </div>

      <div className="grid gap-6 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] items-center">
        <div>
          <DigestiveTract
            glycemicLoadLabel={data.glycemicLoad}
            fiberGrams={data.fiberGrams}
          />
        </div>

        <div className="space-y-3 text-sm text-slate-200 font-serif">
          {data.keyEvents.map((event, idx) => (
            <motion.div
              key={idx}
              className="flex gap-3"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + idx * 0.15 }}
            >
              <span className="mt-1 h-1.5 w-6 rounded-full bg-gradient-to-r from-accent-teal to-accent-pink" />
              <p className="text-slate-300">{event}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

