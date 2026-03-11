"use client";

import { Shell } from "@/components/Shell";

export default function TimelinePage() {
  return (
    <Shell active="/timeline">
      <div className="glass-surface rounded-2xl p-4 md:p-6">
        <h1 className="text-xl font-semibold">Prediction Timeline</h1>
        <p className="mt-1 text-xs text-slate-400 max-w-xl">
          Timeline forecasts for mood, energy, focus and sleep will be
          visualized here with stacked charts and calendar views.
        </p>
      </div>
    </Shell>
  );
}

