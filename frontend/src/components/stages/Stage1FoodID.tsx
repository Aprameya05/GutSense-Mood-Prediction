import { motion } from 'framer-motion'
import type { DemoData } from '../../data/demoData'

interface Props {
  data: DemoData['foodIdentification'] | null
}

export const Stage1FoodID: React.FC<Props> = ({ data }) => {
  return (
    <section className="rounded-3xl border border-slate-800/80 bg-slate-950/70 px-6 md:px-8 py-8 shadow-[0_0_40px_rgba(15,23,42,0.9)]">
      <div className="mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="text-[11px] font-mono uppercase tracking-[0.3em] text-accent-teal">
            Stage 1 • Food Identification
          </p>
          <h2 className="mt-2 text-xl md:text-2xl font-display text-slate-50">
            Dual-model scan of your plate
          </h2>
          <p className="mt-2 max-w-xl text-sm text-slate-300 font-serif">
            EfficientNet and Groq Vision sweep over your meal like a medical imaging scanner,
            locking in each food component before the journey continues.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] items-center">
        <div className="relative h-52 md:h-64 rounded-2xl border border-slate-800/80 bg-slate-900/70 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(0,255,209,0.24),transparent_55%)] opacity-70" />
          {data?.mealImageUrl ? (
            <>
              <img
                src={data.mealImageUrl}
                alt="Uploaded meal"
                className="relative z-0 h-full w-full object-cover opacity-80"
              />
              <motion.div
                className="absolute inset-x-0 h-10 bg-gradient-to-b from-accent-teal/0 via-accent-teal/50 to-transparent"
                animate={{ y: ['-20%', '120%'] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
              />
            </>
          ) : (
            <>
              <motion.div
                className="absolute inset-x-0 h-10 bg-gradient-to-b from-accent-teal/0 via-accent-teal/40 to-transparent"
                animate={{ y: ['-20%', '120%'] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
              />
              <div className="relative z-10 flex h-full items-center justify-center">
                <p className="text-sm text-slate-300 font-serif text-center px-6">
                  Drop a meal photo or run the dosa demo to watch GutSense scan each component.
                </p>
              </div>
            </>
          )}
        </div>

        <div className="space-y-4">
          {data ? (
            <>
              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="rounded-xl border border-slate-800/80 bg-slate-900/80 p-3">
                  <p className="text-[10px] uppercase tracking-[0.25em] text-slate-400">
                    EfficientNet
                  </p>
                  <motion.p
                    className="mt-1 text-base text-accent-teal"
                    initial={{ width: 0 }}
                    animate={{ width: `${data.items[0].confidenceEfficientNet * 100}%` }}
                    transition={{ duration: 1.2, ease: 'easeOut' }}
                  >
                    {(data.items[0].confidenceEfficientNet * 100).toFixed(1)}%
                  </motion.p>
                </div>
                <div className="rounded-xl border border-slate-800/80 bg-slate-900/80 p-3">
                  <p className="text-[10px] uppercase tracking-[0.25em] text-slate-400">
                    Groq Vision
                  </p>
                  <motion.p
                    className="mt-1 text-base text-accent-gold"
                    initial={{ width: 0 }}
                    animate={{ width: `${data.items[0].confidenceGroq * 100}%` }}
                    transition={{ duration: 1.2, ease: 'easeOut', delay: 0.2 }}
                  >
                    {(data.items[0].confidenceGroq * 100).toFixed(1)}%
                  </motion.p>
                </div>
              </div>

              <div className="space-y-2 text-sm text-slate-200 font-serif">
                {data.items.map((item, idx) => (
                  <motion.div
                    key={item.name}
                    className="flex items-start gap-3 rounded-xl border border-slate-800/80 bg-slate-950/80 px-3 py-2.5"
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + idx * 0.12 }}
                  >
                    <span className="mt-1 inline-flex h-1.5 w-4 rounded-full bg-gradient-to-r from-accent-teal to-accent-pink" />
                    <div>
                      <p className="font-display text-slate-50">
                        {item.name}{' '}
                        <span className="text-xs text-slate-400 font-mono uppercase tracking-[0.18em]">
                          LOCKED IN
                        </span>
                      </p>
                      <p className="text-xs text-slate-300">{item.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-400 font-serif">
              Drop a meal or run the dosa demo to watch dual-model identification with
              confidence arcs and mismatch warnings.
            </p>
          )}
        </div>
      </div>
    </section>
  )
}

