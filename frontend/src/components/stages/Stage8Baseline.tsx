import type { DemoData } from '../../data/demoData'

interface Props {
  data: DemoData['baseline'] | null
}

export const Stage8Baseline: React.FC<Props> = ({ data }) => {
  if (!data) return null

  const items: { label: string; value: number | string; accent: string }[] = [
    { label: 'Baseline mood', value: data.mood.toFixed(1), accent: 'text-accent-gold' },
    { label: 'MDI baseline', value: data.mdi.toFixed(2), accent: 'text-accent-teal' },
    { label: 'IRS baseline', value: data.irs.toFixed(2), accent: 'text-rose-400' },
    { label: 'DSS baseline', value: data.dss.toFixed(2), accent: 'text-accent-pink' },
    { label: 'Avg GL', value: data.avgGlycemicLoad.toFixed(1), accent: 'text-sky-400' },
    { label: 'Avg sleep', value: `${data.avgSleepHours.toFixed(1)}h`, accent: 'text-emerald-400' },
  ]

  return (
    <section className="rounded-3xl border border-slate-800/80 bg-slate-950/80 px-6 md:px-8 py-8 shadow-[0_0_40px_rgba(15,23,42,0.9)]">
      <p className="text-[11px] font-mono uppercase tracking-[0.3em] text-accent-teal">
        Stage 8 • Baseline Creation
      </p>
      <h2 className="mt-2 text-xl md:text-2xl font-display text-slate-50">
        The story your body returns to
      </h2>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        {items.map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-slate-800/80 bg-slate-900/80 px-3 py-3 text-xs"
          >
            <p className="text-[11px] font-mono uppercase tracking-[0.25em] text-slate-400">
              {item.label}
            </p>
            <p className={`mt-2 text-lg font-mono ${item.accent}`}>{item.value}</p>
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs text-slate-300 font-serif">
        Baseline stability index{' '}
        <span className="text-accent-teal">{(data.stability * 100).toFixed(0)}%</span> — your
        recent weeks look{' '}
        {data.stability > 0.8 ? 'remarkably consistent.' : 'somewhat variable; more data will sharpen this.'}
      </p>
    </section>
  )
}

