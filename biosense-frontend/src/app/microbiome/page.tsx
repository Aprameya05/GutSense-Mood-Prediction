"use client";

import { Shell } from "@/components/Shell";

export default function MicrobiomePage() {
  return (
    <Shell active="/microbiome">
      <div className="glass-surface rounded-2xl p-4 md:p-6">
        <h1 className="text-xl font-semibold">Microbiome Panel</h1>
        <p className="mt-1 text-xs text-slate-400 max-w-xl">
          Future panel for high-resolution microbiome signatures, SCFA maps and
          diversity timelines. It will consume the same BioSense API used on
          the main dashboard.
        </p>
      </div>
    </Shell>
  );
}

