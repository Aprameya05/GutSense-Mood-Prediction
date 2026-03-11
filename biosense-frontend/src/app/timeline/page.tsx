"use client";

import { Shell } from "@/components/Shell";
import { useBioSense } from "@/context/BioSenseContext";
import { TimelineChart } from "@/components/TimelineChart";

export default function TimelinePage() {
  const { analysis } = useBioSense();

  return (
    <Shell active="/timeline">
      <div className="glass-surface rounded-2xl p-4 md:p-6 space-y-4">
        <h1 className="text-xl font-semibold">Prediction Timeline</h1>
        {!analysis ? (
          <p className="mt-1 text-xs text-slate-400 max-w-xl">
            Run a meal through BioSense to view mood, energy, stress and sleep
            trajectories over the next 24 hours.
          </p>
        ) : (
          <>
            <p className="mt-1 text-xs text-slate-400 max-w-xl">
              Temporal forecast derived from the neurochemistry and
              microbiome-informed prediction engine.
            </p>
            <div className="mt-3 rounded-2xl border border-slate-800/80 bg-slate-950/70 px-3 py-4">
              <TimelineChart timeline={analysis.prediction.timeline} />
            </div>
          </>
        )}
      </div>
    </Shell>
  );
}

