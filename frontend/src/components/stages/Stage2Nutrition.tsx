import { motion } from 'framer-motion'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import type { DemoData } from '../../data/demoData'

interface Props {
  data: DemoData['nutrition'] | null
}

const MACRO_COLORS = ['#00FFD1', '#FFD700', '#FF6B8A', '#38BDF8', '#4ADE80']

export const Stage2Nutrition: React.FC<Props> = ({ data }) => {
  if (!data) {
    return null
  }

  return (
    <section className="rounded-3xl border border-slate-800/80 bg-slate-950/80 px-6 md:px-8 py-8 shadow-[0_0_40px_rgba(15,23,42,0.9)]">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
        <div>
          <p className="text-[11px] font-mono uppercase tracking-[0.3em] text-accent-teal">
            Stage 2 • Nutritional Calibration
          </p>
          <h2 className="mt-2 text-xl md:text-2xl font-display text-slate-50">
            Circular nutrition wheel
          </h2>
          <p className="mt-2 max-w-xl text-sm text-slate-300 font-serif">
            Macros anchor the inner ring, while micronutrients orbit outside — each sector
            glowing with its own category hue.
          </p>
        </div>
        <motion.span
          className="inline-flex items-center rounded-full border border-slate-700/90 bg-slate-900/80 px-3 py-1.5 text-[11px] font-mono uppercase tracking-[0.2em] text-slate-300"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Source: {data.source}
        </motion.span>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] items-center">
        <div className="h-64 md:h-72">
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={data.macros}
                dataKey="pct"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius="35%"
                outerRadius="60%"
                paddingAngle={2}
              >
                {data.macros.map((entry, index) => (
                  <Cell
                    key={entry.name}
                    fill={MACRO_COLORS[index % MACRO_COLORS.length]}
                    stroke="#020617"
                    strokeWidth={1}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-2 text-sm font-serif">
          {data.micros.map((micro, idx) => (
            <motion.div
              key={micro.name}
              className="flex items-start gap-3 rounded-xl border border-slate-800/80 bg-slate-950/80 px-3 py-2.5"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + idx * 0.08 }}
            >
              <span className="mt-1 inline-flex h-1.5 w-4 rounded-full bg-gradient-to-r from-accent-gold to-accent-pink" />
              <div>
                <p className="text-slate-100 font-display">
                  {micro.name}{' '}
                  <span className="text-xs text-slate-400 font-mono">
                    {micro.value}
                    {micro.unit} • {(micro.pct * 100).toFixed(0)}% daily
                  </span>
                </p>
                <p className="text-xs text-slate-300">{micro.insight}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

