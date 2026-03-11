"use client";

import { Shell } from "@/components/Shell";

export default function SettingsPage() {
  return (
    <Shell active="/settings">
      <div className="glass-surface rounded-2xl p-4 md:p-6 space-y-4">
        <h1 className="text-xl font-semibold">Settings & Integrations</h1>
        <p className="text-xs text-slate-400 max-w-xl">
          Configure experimental API keys and placeholders for wearable
          integrations (Apple Health, Oura, Fitbit, HRV, stress indices).
        </p>
        <div className="grid gap-3 text-xs text-slate-300">
          <div className="rounded-xl border border-slate-800/80 bg-slate-950/70 px-3 py-3">
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
              Wearable Streams (Coming Soon)
            </div>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-slate-400">
              <li>Heart rate &amp; HRV</li>
              <li>Sleep architecture &amp; circadian phase</li>
              <li>Stress markers and respiration</li>
              <li>Step count and activity energy</li>
            </ul>
          </div>
        </div>
      </div>
    </Shell>
  );
}

