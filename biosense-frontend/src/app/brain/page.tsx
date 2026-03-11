"use client";

import { Shell } from "@/components/Shell";

export default function BrainPage() {
  return (
    <Shell active="/brain">
      <div className="glass-surface rounded-2xl p-4 md:p-6">
        <h1 className="text-xl font-semibold">Brain Panel</h1>
        <p className="mt-1 text-xs text-slate-400 max-w-xl">
          Dedicated view into serotonin, dopamine, GABA, cortisol and
          melatonin trends, derived from nutrition and microbiome states.
        </p>
      </div>
    </Shell>
  );
}

