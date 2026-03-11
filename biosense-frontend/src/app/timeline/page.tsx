"use client";

import { Shell } from "@/components/Shell";
import { useBioSense } from "@/context/BioSenseContext";
import { GlowPanel } from "@/components/GlowPanel";
import { TimelineGraph } from "@/components/TimelineGraph";
import { BioCard } from "@/components/BioCard";

export default function TimelinePage() {
  const { analysis } = useBioSense();

  return (
    <Shell active="/timeline">
      <GlowPanel
        title="Prediction timeline"
        subtitle="Short-horizon state forecast · 6h / 12h / 24h"
        tone="emerald"
      >
        {!analysis ? (
          <div className="text-[12px] text-white/55">
            Run a meal scan to render the forecast curves and horizon cards.
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
            <TimelineGraph timeline={analysis.prediction.timeline} />
            <div className="grid gap-3">
              {analysis.prediction.timeline.map((t) => (
                <div
                  key={t.horizon_hours}
                  className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] uppercase tracking-[0.26em] text-white/55">
                      horizon {t.horizon_hours}h
                    </div>
                    <div className="text-[11px] text-white/60">
                      mental clarity {t.mental_clarity.toFixed(1)}
                    </div>
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <BioCard label="Mood" value={t.mood.toFixed(1)} tone="emerald" />
                    <BioCard label="Energy" value={t.energy.toFixed(1)} tone="cyan" />
                    <BioCard label="Focus" value={t.focus.toFixed(1)} tone="blue" />
                    <BioCard label="Stress" value={t.stress.toFixed(1)} tone="rose" />
                    <BioCard
                      label="Sleep quality"
                      value={t.sleep_quality.toFixed(1)}
                      tone="amber"
                    />
                    <BioCard
                      label="Mental clarity"
                      value={t.mental_clarity.toFixed(1)}
                      tone="cyan"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </GlowPanel>
    </Shell>
  );
}

