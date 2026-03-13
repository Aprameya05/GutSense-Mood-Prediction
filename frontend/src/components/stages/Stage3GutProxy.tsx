import { motion } from 'framer-motion'
import type { DemoData } from '../../data/demoData'

interface Props {
  data: DemoData['gutProxy'] | null
}

const Card: React.FC<{ title: string; score: number; description: string; variant: 'mdi' | 'irs' | 'dss' }> = ({
  title,
  score,
  description,
  variant,
}) => {
  const color =
    variant === 'mdi' ? 'from-accent-teal' : variant === 'irs' ? 'from-orange-500' : 'from-accent-pink'

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-950/80 px-4 py-4 shadow-[0_0_30px_rgba(15,23,42,0.9)]">
      <div className={`absolute inset-x-0 -top-16 h-24 bg-gradient-to-b ${color} to-transparent opacity-40`} />
      <div className="relative flex items-baseline justify-between">
        <div>
          <p className="text-[11px] font-mono uppercase tracking-[0.3em] text-slate-300">
            {title}
          </p>
          <motion.p
            className="mt-2 text-2xl font-display text-slate-50"
            initial={{ scale: 0.9, opacity: 0.5 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 220, damping: 14 }}
          >
            {score.toFixed(2)}
          </motion.p>
        </div>
        <motion.div
          className="h-12 w-12 rounded-full border border-slate-700/80 bg-slate-900/70"
          animate={{ scale: [1, 1.1, 1], boxShadow: '0 0 18px rgba(0,255,209,0.4)' }}
          transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
      <p className="relative mt-3 text-xs text-slate-300 font-serif">{description}</p>
    </div>
  )
}

export const Stage3GutProxy: React.FC<Props> = ({ data }) => {
  if (!data) return null

  return (
    <section className="rounded-3xl border border-slate-800/80 bg-slate-950/80 px-6 md:px-8 py-8 shadow-[0_0_40px_rgba(15,23,42,0.9)]">
      <p className="text-[11px] font-mono uppercase tracking-[0.3em] text-accent-teal">
        Stage 3 • Gut Microbiome Proxy
      </p>
      <h2 className="mt-2 text-xl md:text-2xl font-display text-slate-50">
        Microbes, inflammation and digestive calm
      </h2>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Card title="MDI • Diversity" score={data.mdi} description={data.interpretation.mdi} variant="mdi" />
        <Card title="IRS • Inflammation" score={data.irs} description={data.interpretation.irs} variant="irs" />
        <Card title="DSS • Stress" score={data.dss} description={data.interpretation.dss} variant="dss" />
      </div>
    </section>
  )
}

