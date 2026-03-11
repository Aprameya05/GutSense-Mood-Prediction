"use client";

import { Shell } from "@/components/Shell";
import { useBioSense } from "@/context/BioSenseContext";
import { GlowPanel } from "@/components/GlowPanel";
import { MicrobiomeChart } from "@/components/MicrobiomeChart";
import { BioCard } from "@/components/BioCard";

export default function MicrobiomePage() {
  const { analysis } = useBioSense();

  return (
    <Shell active="/microbiome">
      <GlowPanel
        title="Gut microbiome"
        subtitle="SCFA / diversity / inflammatory tone · microbial ecosystem proxy"
        tone="emerald"
        right={
          analysis ? (
            <div className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 text-[11px] uppercase tracking-[0.22em] text-emerald-200">
              gut balance {analysis.microbiome.gut_balance_score.toFixed(1)}
            </div>
          ) : null
        }
      >
        {!analysis ? (
          <div className="text-[12px] text-white/55">
            Run a meal through the pipeline (Dashboard or Scan) to populate gut
            state and microbiome charts.
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-3">
              <div className="mb-2 text-[10px] uppercase tracking-[0.26em] text-white/55">
                Microbiome state
              </div>
              <MicrobiomeChart microbiome={analysis.microbiome} />
            </div>

            <div className="grid gap-3">
              <div className="grid gap-3 md:grid-cols-2">
                <BioCard
                  label="SCFA score"
                  value={analysis.microbiome.scfa_score.toFixed(1)}
                  hint="short-chain fatty acids"
                  tone="emerald"
                />
                <BioCard
                  label="Diversity score"
                  value={analysis.microbiome.diversity_score.toFixed(1)}
                  hint="ecosystem richness"
                  tone="cyan"
                />
                <BioCard
                  label="Probiotic score"
                  value={analysis.microbiome.probiotic_score.toFixed(1)}
                  hint="fermented + fiber tone"
                  tone="blue"
                />
                <BioCard
                  label="Inflammation"
                  value={analysis.microbiome.inflammation_score.toFixed(1)}
                  hint="higher can be worse"
                  tone="rose"
                />
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-3">
                <div className="mb-2 text-[10px] uppercase tracking-[0.26em] text-white/55">
                  Nutrition drivers (per detected food)
                </div>
                <div className="overflow-auto">
                  <table className="w-full border-separate border-spacing-y-1">
                    <thead className="text-[10px] uppercase tracking-[0.22em] text-white/45">
                      <tr>
                        <th className="text-left font-medium">Food</th>
                        <th className="text-right font-medium">Fiber</th>
                        <th className="text-right font-medium">Polyphenol</th>
                        <th className="text-right font-medium">RS</th>
                        <th className="text-right font-medium">Fermented</th>
                      </tr>
                    </thead>
                    <tbody className="text-[12px] text-white/70">
                      {analysis.nutrition.map((n, i) => (
                        <tr key={i} className="rounded-lg">
                          <td className="pr-2 text-white/80">
                            {n.food_item ?? `food-${i + 1}`}
                          </td>
                          <td className="text-right">{n.fiber.toFixed(1)}</td>
                          <td className="text-right">{n.polyphenol.toFixed(1)}</td>
                          <td className="text-right">
                            {n.resistant_starch.toFixed(1)}
                          </td>
                          <td className="text-right">{n.fermented ? "yes" : "no"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </GlowPanel>
    </Shell>
  );
}

