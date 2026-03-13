import { motion } from 'framer-motion'
import type { DemoData } from '../../data/demoData'

interface Props {
  data: DemoData['sleep'] | null
}

export const Stage6Sleep: React.FC<Props> = ({ data }) => {
  if (!data) return null

  return (
    <section className="rounded-3xl border border-slate-800/80 bg-slate-950/80 px-6 md:px-8 py-8 shadow-[0_0_40px_rgba(15,23,42,0.9)]">
      <p className="text-[11px] font-mono uppercase tracking-[0.3em] text-accent-teal">
        Stage 6 • Sleep & Neurological Stress
      </p>
      <h2 className="mt-2 text-xl md:text-2xl font-display text-slate-50">
        Circadian rhythm and brain load
      </h2>

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] items-center">
        <div className="space-y-3 text-xs font-mono text-slate-300">
          <div className="flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-accent-teal" />
            <span>
              Last night: {data.lastNightHours}h • Quality:{' '}
              <span className="text-accent-gold">{data.quality}</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-accent-pink" />
            <span>
              Sleep debt:{' '}
              <span className="text-accent-pink">{data.sleepDebtHours.toFixed(1)}h</span> • CRI:{' '}
              <span className="text-accent-teal">{data.cri.toFixed(2)}</span>
            </span>
          </div>

          <div className="mt-4 flex gap-1 rounded-xl border border-slate-800/80 bg-slate-900/80 px-2 py-2">
            {data.timeline.map((segment) => {
              const color =
                segment.state === 'sleep'
                  ? 'bg-sky-600'
                  : segment.state === 'light'
                    ? 'bg-sky-400'
                    : segment.state === 'fragmented'
                      ? 'bg-amber-400'
                      : 'bg-rose-500'
              return (
                <div key={segment.label} className="flex-1 space-y-1">
                  <div className={`h-5 rounded ${color}`} />
                  <p className="text-[10px] text-slate-400 text-center">{segment.label}</p>
                </div>
              )
            })}
          </div>
        </div>

        <div className="flex flex-col items-center gap-4">
          <motion.div
            className="relative h-32 w-32 rounded-full border border-slate-700/80 bg-slate-950/90 flex items-center justify-center"
            animate={{
              boxShadow:
                data.neurologicalStressProxy < 0.4
                  ? '0 0 26px rgba(34,197,94,0.7)'
                  : data.neurologicalStressProxy < 0.7
                    ? '0 0 26px rgba(234,179,8,0.8)'
                    : '0 0 32px rgba(248,113,113,0.9)',
            }}
            transition={{ duration: 1.6, repeat: Infinity, repeatType: 'reverse' }}
          >
            <motion.div
              className="h-20 w-20 rounded-full border border-slate-600/80"
              animate={{
                rotate: [0, 3, -3, 0],
              }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            />
            <p className="absolute text-xs font-mono text-slate-100">
              NSP {data.neurologicalStressProxy.toFixed(2)}
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

