"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Shell } from "@/components/Shell";
import { useBioSense } from "@/context/BioSenseContext";
import { GlowPanel } from "@/components/GlowPanel";
import { HealthMeter } from "@/components/HealthMeter";
import { BioCard } from "@/components/BioCard";
import { BrainMeter } from "@/components/BrainMeter";
import { MicrobiomeChart } from "@/components/MicrobiomeChart";
import { TimelineGraph } from "@/components/TimelineGraph";

export default function DashboardPage() {
  const { analysis, isAnalyzing, error, runAnalysis } = useBioSense();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  async function handleAnalyze() {
    if (!file) return;
    await runAnalysis(file);
  }

  return (
    <Shell active="/">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <GlowPanel
          title="Dashboard"
          subtitle="Meal-driven gut–brain state simulation · real-time inference layers"
          tone="cyan"
          right={
            <div className="flex items-center gap-2">
              <button
                disabled={!file || isAnalyzing}
                onClick={handleAnalyze}
                className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-[11px] uppercase tracking-[0.22em] text-emerald-200 shadow-lg shadow-emerald-500/20 disabled:opacity-50"
              >
                {isAnalyzing ? "Analyzing…" : "Run pipeline"}
              </button>
              <label className="cursor-pointer rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-white/65 hover:border-cyan-400/30">
                {file ? file.name : "Attach image"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    setFile(f);
                    const url = URL.createObjectURL(f);
                    setPreview((prev) => {
                      if (prev) URL.revokeObjectURL(prev);
                      return url;
                    });
                  }}
                />
              </label>
            </div>
          }
        >
          {error ? (
            <div className="mb-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-200">
              {error}
            </div>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur"
            >
              {preview ? (
                <img
                  src={preview}
                  alt="Meal"
                  className="h-72 w-full object-cover"
                />
              ) : (
                <div className="flex h-72 flex-col items-center justify-center gap-2 text-xs text-white/50">
                  <div className="text-base text-white/80">
                    Meal scan input
                  </div>
                  <div>Upload a meal to initiate the model cascade.</div>
                </div>
              )}
              <div className="absolute bottom-3 left-3 right-3 rounded-xl border border-white/10 bg-black/55 px-3 py-2 backdrop-blur">
                <div className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-[0.22em] text-white/55">
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                    Live layers
                  </div>
                  <div className="flex gap-1">
                    {["Nutrition", "Microbiome", "Neuro", "Prediction"].map(
                      (l) => (
                        <span
                          key={l}
                          className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-white/60"
                        >
                          {l}
                        </span>
                      ),
                    )}
                  </div>
                </div>
              </div>
            </motion.div>

            <div className="grid gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[10px] uppercase tracking-[0.26em] text-white/55">
                    Health score
                  </div>
                  {analysis ? (
                    <div className="text-[11px] text-emerald-200">
                      Overall {analysis.health.overall_score.toFixed(0)}/100
                    </div>
                  ) : (
                    <div className="text-[11px] text-white/45">
                      Awaiting scan
                    </div>
                  )}
                </div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <HealthMeter
                    label="Overall"
                    value={analysis?.health.overall_score ?? 0}
                    accent="emerald"
                  />
                  <HealthMeter
                    label="Brain"
                    value={analysis?.health.brain_score ?? 0}
                    accent="cyan"
                  />
                </div>
              </div>

              {analysis ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <BioCard
                    label="Inflammation risk"
                    value={`${analysis.health.inflammation_risk.toFixed(0)}/100`}
                    hint="systemic inflammatory tone"
                    tone="rose"
                  />
                  <BioCard
                    label="Burnout risk"
                    value={`${analysis.health.burnout_risk.toFixed(0)}/100`}
                    hint="stress + sleep load"
                    tone="amber"
                  />
                  <BioCard
                    label="Energy"
                    value={analysis.prediction.energy.toFixed(1)}
                    hint="predicted state (0–10)"
                    tone="cyan"
                  />
                  <BioCard
                    label="Mood"
                    value={analysis.prediction.mood.toFixed(1)}
                    hint="predicted state (0–10)"
                    tone="emerald"
                  />
                </div>
              ) : (
                <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-3 text-[11px] text-white/50">
                  Run a scan to populate neurochemistry, inflammation, and
                  prediction panels.
                </div>
              )}
            </div>
          </div>

          {analysis ? (
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-3">
                <div className="mb-2 text-[10px] uppercase tracking-[0.26em] text-white/55">
                  Brain layer
                </div>
                <BrainMeter neuro={analysis.neuro} pred={analysis.prediction} />
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-3">
                <div className="mb-2 text-[10px] uppercase tracking-[0.26em] text-white/55">
                  Gut microbiome layer
                </div>
                <MicrobiomeChart microbiome={analysis.microbiome} />
              </div>
            </div>
          ) : null}
        </GlowPanel>

        <div className="grid gap-4">
          <GlowPanel
            title="Timeline"
            subtitle="Short-horizon forecast (6h / 12h / 24h)"
            tone="emerald"
          >
            {analysis ? (
              <TimelineGraph timeline={analysis.prediction.timeline} />
            ) : (
              <div className="text-[11px] text-white/50">
                Forecast will appear after a scan.
              </div>
            )}
          </GlowPanel>

          <GlowPanel
            title="Scientific explanation"
            subtitle="Causal narrative from nutrition → microbiome → neurochemistry"
            tone="cyan"
          >
            {analysis ? (
              <div className="space-y-2 text-[12px] text-white/75">
                <div className="text-white/85">{analysis.explanation.summary}</div>
                <ul className="list-disc pl-4 space-y-1 text-white/60">
                  {analysis.explanation.bullets.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="text-[11px] text-white/50">
                Explanation engine output will render here post-scan.
              </div>
            )}
          </GlowPanel>
        </div>
      </div>
    </Shell>
  );
}
