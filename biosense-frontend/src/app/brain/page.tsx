"use client";

import { Shell } from "@/components/Shell";
import { useBioSense } from "@/context/BioSenseContext";
import { GlowPanel } from "@/components/GlowPanel";
import { HealthMeter } from "@/components/HealthMeter";
import { BrainMeter } from "@/components/BrainMeter";
import { BioCard } from "@/components/BioCard";

export default function BrainPage() {
  const { analysis } = useBioSense();

  return (
    <Shell active="/brain">
      <GlowPanel
        title="Neuro panel"
        subtitle="Neurotransmitters + hormones · mood / focus / stress estimation"
        tone="cyan"
        right={
          analysis ? (
            <div className="flex items-center gap-2">
              <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] uppercase tracking-[0.22em] text-white/65">
                mood {analysis.prediction.mood.toFixed(1)}
              </div>
              <div className="rounded-full border border-rose-400/25 bg-rose-400/10 px-3 py-1.5 text-[11px] uppercase tracking-[0.22em] text-rose-200">
                stress {analysis.prediction.stress.toFixed(1)}
              </div>
            </div>
          ) : null
        }
      >
        {!analysis ? (
          <div className="text-[12px] text-white/55">
            Run a meal through the pipeline (Dashboard or Scan) to generate
            neurochemistry and state predictions.
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-3">
              <div className="mb-2 text-[10px] uppercase tracking-[0.26em] text-white/55">
                Neurochemistry layer
              </div>
              <BrainMeter neuro={analysis.neuro} pred={analysis.prediction} />
            </div>

            <div className="grid gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-3">
                <div className="text-[10px] uppercase tracking-[0.26em] text-white/55">
                  Brain score
                </div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <HealthMeter
                    label="Brain"
                    value={analysis.health.brain_score}
                    accent="cyan"
                  />
                  <HealthMeter
                    label="Overall"
                    value={analysis.health.overall_score}
                    accent="emerald"
                  />
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <BioCard
                  label="Energy"
                  value={analysis.prediction.energy.toFixed(1)}
                  hint="0–10 proxy"
                  tone="cyan"
                />
                <BioCard
                  label="Focus"
                  value={analysis.prediction.focus.toFixed(1)}
                  hint="0–10 proxy"
                  tone="blue"
                />
                <BioCard
                  label="Sleep quality"
                  value={analysis.prediction.sleep_quality.toFixed(1)}
                  hint="0–10 proxy"
                  tone="amber"
                />
                <BioCard
                  label="Mental clarity"
                  value={analysis.prediction.mental_clarity.toFixed(1)}
                  hint="0–10 proxy"
                  tone="emerald"
                />
              </div>
            </div>
          </div>
        )}
      </GlowPanel>
    </Shell>
  );
}

