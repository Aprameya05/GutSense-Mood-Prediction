"use client";

import { Shell } from "@/components/Shell";
import { useBioSense } from "@/context/BioSenseContext";
import { GlowPanel } from "@/components/GlowPanel";
import { BioCard } from "@/components/BioCard";

export default function HistoryPage() {
  const { history } = useBioSense();

  return (
    <Shell active="/history">
      <GlowPanel
        title="History"
        subtitle="Session telemetry · meal scans and composite health outcomes"
        tone="cyan"
        right={
          <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] uppercase tracking-[0.22em] text-white/65">
            entries {history.length}
          </div>
        }
      >
        {history.length === 0 ? (
          <div className="text-[12px] text-white/55">
            No entries yet. Run a scan to create a session record of health
            scores and meal labels.
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-3">
              <div className="mb-2 text-[10px] uppercase tracking-[0.26em] text-white/55">
                Recent runs
              </div>
              <div className="space-y-2">
                {history.slice(0, 6).map((h) => (
                  <div
                    key={h.id}
                    className="rounded-xl border border-white/10 bg-black/40 px-3 py-2"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[11px] uppercase tracking-[0.22em] text-white/45">
                          {new Date(h.createdAt).toLocaleTimeString()}
                        </div>
                        <div className="truncate text-[12px] text-white/75">
                          {h.label}
                        </div>
                      </div>
                      <div className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-[11px] text-emerald-200">
                        {h.healthScore.toFixed(0)}/100
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-3">
              <div className="mb-2 text-[10px] uppercase tracking-[0.26em] text-white/55">
                Session table
              </div>
              <div className="overflow-auto">
                <table className="w-full border-separate border-spacing-y-1">
                  <thead className="text-[10px] uppercase tracking-[0.22em] text-white/45">
                    <tr>
                      <th className="text-left font-medium">Time</th>
                      <th className="text-left font-medium">Meal</th>
                      <th className="text-right font-medium">Score</th>
                    </tr>
                  </thead>
                  <tbody className="text-[12px] text-white/70">
                    {history.map((h) => (
                      <tr key={h.id}>
                        <td className="text-white/50">
                          {new Date(h.createdAt).toLocaleTimeString()}
                        </td>
                        <td className="text-white/80">{h.label}</td>
                        <td className="text-right text-emerald-200">
                          {h.healthScore.toFixed(0)}/100
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <BioCard
                  label="Best score"
                  value={`${Math.max(...history.map((h) => h.healthScore)).toFixed(0)}`}
                  hint="highest overall_score"
                  tone="emerald"
                />
                <BioCard
                  label="Latest score"
                  value={`${history[0].healthScore.toFixed(0)}`}
                  hint="most recent overall_score"
                  tone="cyan"
                />
              </div>
            </div>
          </div>
        )}
      </GlowPanel>
    </Shell>
  );
}

