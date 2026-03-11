"use client";

import { Shell } from "@/components/Shell";

export default function ScanPage() {
  return (
    <Shell active="/scan">
      <div className="glass-surface rounded-2xl p-4 md:p-6">
        <h1 className="text-xl font-semibold">Scan Meal</h1>
        <p className="mt-1 text-xs text-slate-400 max-w-xl">
          This page will evolve into a dedicated capture interface for cameras,
          wearables and contextual tags. For now, use the main dashboard to run
          the BioSense pipeline and visualize layers.
        </p>
      </div>
    </Shell>
  );
}

