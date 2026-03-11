"use client";

import { Shell } from "@/components/Shell";
import { useBioSense } from "@/context/BioSenseContext";
import { CircularGauge } from "@/components/Gauges";

export default function MicrobiomePage() {
  const { analysis } = useBioSense();

  return (
    <Shell active="/microbiome">
      <div className="glass-surface rounded-2xl p-4 md:p-6 space-y-4">
        <h1 className="text-xl font-semibold">Microbiome Panel</h1>
        {!analysis ? (
          <p className="mt-1 text-xs text-slate-400 max-w-xl">
            Run a meal through the pipeline on the Dashboard or Scan pages to
            populate microbiome scores.
          </p>
        ) : (
          <>
            <p className="mt-1 text-xs text-slate-400 max-w-xl">
              Microbiome state derived from fiber, resistant starch, polyphenols
              and fermented foods across the detected meal.
            </p>
            <div className="mt-3 grid gap-4 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.2fr)]">
              <div className="rounded-2xl border border-slate-800/80 bg-slate-950/70 px-3 py-4">
                <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-slate-400">
                  Core Gut Scores
                </div>
                <div className="flex gap-4">
                  <CircularGauge
                    label="SCFA support"
                    value={analysis.microbiome.scfa_score * 10}
                    accent="#4ef2c5"
                  />
                  <CircularGauge
                    label="Diversity"
                    value={analysis.microbiome.diversity_score * 10}
                    accent="#2bb1ff"
                  />
                  <CircularGauge
                    label="Probiotic tone"
                    value={analysis.microbiome.probiotic_score * 10}
                    accent="#a855f7"
                  />
                </div>
              </div>
              <div className="rounded-2xl border border-slate-800/80 bg-slate-950/70 px-3 py-4 text-xs text-slate-300">
                <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-slate-400">
                  Meal-level Nutrition Driver Map
                </div>
                <table className="w-full border-separate border-spacing-y-1">
                  <thead className="text-[10px] text-slate-400">
                    <tr>
                      <th className="text-left">Food</th>
                      <th className="text-right">Fiber</th>
                      <th className="text-right">Polyphenol</th>
                      <th className="text-right">Resistant starch</th>
                      <th className="text-right">Fermented</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysis.nutrition.map((n, i) => (
                      <tr key={i} className="text-[11px]">
                        <td className="text-slate-200">
                          {n.food_item ?? `food-${i + 1}`}
                        </td>
                        <td className="text-right">{n.fiber.toFixed(1)}</td>
                        <td className="text-right">{n.polyphenol.toFixed(1)}</td>
                        <td className="text-right">
                          {n.resistant_starch.toFixed(1)}
                        </td>
                        <td className="text-right">
                          {n.fermented ? "yes" : "no"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </Shell>
  );
}

