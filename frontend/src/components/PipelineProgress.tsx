import { motion } from 'framer-motion'
import type { StageStatus } from '../hooks/usePipelineData'

interface Props {
  stages: Record<number, StageStatus>
}

const order: number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

export const PipelineProgress: React.FC<Props> = ({ stages }) => {
  return (
    <aside className="hidden lg:flex w-64 flex-col pr-8 py-4 border-r border-slate-800/80 bg-black/25 backdrop-blur-md">
      <div className="mb-6">
        <h2 className="text-xs tracking-[0.32em] uppercase text-slate-400 font-mono">
          GutSense Pipeline
        </h2>
        <p className="mt-2 text-sm text-slate-300 font-serif italic">
          From plate to nervous system.
        </p>
      </div>

      <div className="relative flex-1">
        <div className="absolute left-3 top-0 bottom-0 w-px bg-gradient-to-b from-accent-teal/70 via-slate-700/70 to-accent-pink/40" />
        <ul className="relative space-y-3 pl-6">
          {order.map((id) => {
            const stage = stages[id]
            if (!stage) return null

            const isCompleted = stage.completed
            const isActive = stage.active

            return (
              <li key={stage.id} className="relative">
                <motion.div
                  className="absolute -left-6 top-1.5 h-3 w-3 rounded-full border border-accent-teal/60 bg-slate-900"
                  animate={{
                    scale: isActive ? 1.4 : 1,
                    boxShadow: isCompleted
                      ? '0 0 16px rgba(0,255,209,0.9)'
                      : isActive
                        ? '0 0 10px rgba(0,255,209,0.7)'
                        : '0 0 0 rgba(0,0,0,0)',
                    backgroundColor: isCompleted
                      ? 'rgba(0,255,209,1)'
                      : isActive
                        ? 'rgba(0,255,209,0.6)'
                        : 'rgba(15,23,42,1)',
                  }}
                  transition={{ type: 'spring', stiffness: 200, damping: 18 }}
                />

                <motion.div
                  className="rounded-lg border border-slate-800/80 bg-slate-950/60 px-3 py-2.5 shadow-[0_0_30px_rgba(15,23,42,0.9)]"
                  animate={{
                    borderColor: isCompleted
                      ? 'rgba(0,255,209,0.8)'
                      : isActive
                        ? 'rgba(148,163,184,0.9)'
                        : 'rgba(30,64,175,0.5)',
                    background:
                      'radial-gradient(circle at top left, rgba(0,255,209,0.18), rgba(15,23,42,0.95))',
                    opacity: isCompleted || isActive ? 1 : 0.7,
                    y: isActive ? -2 : 0,
                  }}
                  transition={{ duration: 0.35 }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-mono uppercase tracking-[0.24em] text-slate-400">
                      Stage {stage.id}
                    </span>
                    {isCompleted && (
                      <motion.span
                        className="text-[10px] font-mono text-accent-teal"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 280, damping: 16 }}
                      >
                        PING
                      </motion.span>
                    )}
                  </div>
                  <p className="mt-1 text-sm font-display text-slate-100">{stage.label}</p>
                </motion.div>
              </li>
            )
          })}
        </ul>
      </div>
    </aside>
  )
}

