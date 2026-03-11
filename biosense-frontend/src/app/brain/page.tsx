"use client";

import { Shell } from "@/components/Shell";
import { useBioSense } from "@/context/BioSenseContext";
import { CircularGauge } from "@/components/Gauges";

export default function BrainPage() {
  const { analysis } = useBioSense();

  return (
    <Shell active="/brain">
      <div className="glass-surface rounded-2xl p-4 md:p-6 space-y-4">
        <h1 className="text-xl font-semibold">Brain Panel</h1>
        {!analysis ? (
          <p className="mt-1 text-xs text-slate-400 max-w-xl">
            Run a meal on the Dashboard or Scan page to view neurochemical and
            state estimates here.
          </p>
        ) : (
          <>
            <p className="mt-1 text-xs text-slate-400 max-w-xl">
              Neurochemistry and subjective state estimated from nutrition and
              microbiome features of the current meal.
            </p>
            <div className="mt-3 grid gap-4 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.1fr)]">
              <div className="rounded-2xl border border-slate-800/80 bg-slate-950/70 px-3 py-4">
                <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-slate-400">
                  Neurotransmitters &amp; Hormones
                </div>
                <div className="flex gap-4">
                  <CircularGauge
                    label="Serotonin"
                    value={analysis.neuro.serotonin * 10}
                    accent="#4ef2c5"
                  />
                  <CircularGauge
                    label="Dopamine"
                    value={analysis.neuro.dopamine * 10}
                    accent="#2bb1ff"
                  />
                  <CircularGauge
                    label="GABA"
                    value={analysis.neuro.gaba * 10}
                    accent="#a855f7"
                  />
                </div>
              </div>
              <div className="rounded-2xl border border-slate-800/80 bg-slate-950/70 px-3 py-4 text-xs text-slate-300">
                <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-slate-400">
                  State Estimates
                </div>
                <dl className="grid grid-cols-2 gap-3">
                  <BrainMetric label="Mood" value={analysis.prediction.mood} />
                  <BrainMetric label="Energy" value={analysis.prediction.energy} />
                  <BrainMetric label="Focus" value={analysis.prediction.focus} />
                  <BrainMetric
                    label="Stress"
                    value={analysis.prediction.stress}
                    tone="bad"
                  />
                  <BrainMetric
                    label="Sleep quality"
                    value={analysis.prediction.sleep_quality}
                  />
                  <BrainMetric
                    label="Mental clarity"
                    value={analysis.prediction.mental_clarity}
                  />
                </dl>
              </div>
            </div>
          </>
        )}
      </div>
    </Shell>
  );
}

function BrainMetric({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "good" | "bad" | "neutral";
}) {
  const colour =
    tone === "good"
      ? "text-emerald-300"
      : tone === "bad"
      ? "text-rose-300"
      : "text-biosense-blue";
  return (
    <div className="rounded-lg bg-slate-900/70 px-2 py-1.5">
      <dt className="text-[10px] text-slate-400">{label}</dt>
      <dd className={`text-xs font-semibold ${colour}`}>{value.toFixed(1)}</dd>
    </div>
  );
}


