"use client";

import { Shell } from "@/components/Shell";

export default function HistoryPage() {
  return (
    <Shell active="/history">
      <div className="glass-surface rounded-2xl p-4 md:p-6">
        <h1 className="text-xl font-semibold">History</h1>
        <p className="mt-1 text-xs text-slate-400 max-w-xl">
          Placeholder for meal history, longitudinal health scores and
          correlation analysis with wearable data (HR, HRV, sleep, steps).
        </p>
      </div>
    </Shell>
  );
}

