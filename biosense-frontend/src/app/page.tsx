"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Shell } from "@/components/Shell";
import { CircularGauge } from "@/components/Gauges";
import { TimelineChart } from "@/components/TimelineChart";
import { useBioSense } from "@/context/BioSenseContext";

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
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <section className="glass-surface rounded-2xl p-4 md:p-5">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                Real-time Bio-AI
              </div>
              <h1 className="mt-1 text-xl font-semibold md:text-2xl">
                Meal → Gut → Brain multi-layer simulation
              </h1>
              <p className="mt-1 text-xs text-slate-400 max-w-xl">
                BioSense AI models nutrition, microbiome, neurochemistry and
                subjective state in one continuous pipeline. Upload a meal to
                watch biological layers light up.
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <button
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-biosense-accent to-biosense-blue px-4 py-2 text-xs font-semibold text-slate-900 shadow-lg disabled:opacity-50"
                disabled={!file || isAnalyzing}
                onClick={handleAnalyze}
              >
                {isAnalyzing ? "Analyzing…" : "Run BioSense pipeline"}
              </button>
              <label className="text-[11px] text-slate-400 cursor-pointer">
                <span className="inline-flex items-center gap-2 rounded-full border border-dashed border-slate-600/70 px-3 py-1 hover:border-biosense-accent/70">
                  <span className="h-1.5 w-1.5 rounded-full bg-biosense-accent" />
                  {file ? file.name : "Attach meal image"}
                </span>
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
          </div>

          {error && (
            <div className="mt-3 rounded-lg border border-rose-500/40 bg-rose-950/40 px-3 py-2 text-[11px] text-rose-200">
              {error}
            </div>
          )}

          <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            <motion.div
              className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-900/80 to-black/90"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {preview ? (
                <img
                  src={preview}
                  alt="Meal"
                  className="h-64 w-full object-cover md:h-72"
                />
              ) : (
                <div className="flex h-64 flex-col items-center justify-center gap-2 text-xs text-slate-500">
                  <span className="text-base text-slate-300">
                    Drop a bowl, thali, or plate
                  </span>
                  <span>BioSense will infer its gut–brain signature.</span>
                </div>
              )}
              <div className="absolute bottom-3 left-3 right-3 rounded-xl bg-slate-950/80 px-3 py-2 text-[11px] text-slate-300 border border-slate-700/80">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="uppercase tracking-[0.2em] text-[9px] text-slate-400">
                      Live Simulation Layers
                    </span>
                  </div>
                  <div className="flex gap-1">
                    {["Nutrition", "Microbiome", "Neuro", "Prediction"].map(
                      (label) => (
                        <span
                          key={label}
                          className="rounded-full bg-slate-900/80 px-2 py-0.5 text-[9px] text-slate-300"
                        >
                          {label}
                        </span>
                      ),
                    )}
                  </div>
                </div>
              </div>
            </motion.div>

            <div className="grid h-full grid-rows-2 gap-3">
              <div className="rounded-2xl border border-slate-800/80 bg-slate-950/70 px-3 py-3">
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                      Composite Health Score
                    </div>
                    <div className="text-xs text-slate-400">
                      Brain · Gut · Metabolism · Risk
                    </div>
                  </div>
                  {analysis && (
                    <span className="rounded-full bg-biosense-accent-soft/60 px-3 py-1 text-[11px] text-biosense-accent">
                      {analysis.health.overall_score.toFixed(0)}/100
                    </span>
                  )}
                </div>
                {analysis ? (
                  <div className="flex gap-4">
                    <CircularGauge
                      label="Brain"
                      value={analysis.health.brain_score}
                      accent="#4ef2c5"
                    />
                    <CircularGauge
                      label="Gut"
                      value={analysis.health.gut_score}
                      accent="#2bb1ff"
                    />
                    <CircularGauge
                      label="Metabolism"
                      value={analysis.health.metabolism_score}
                      accent="#ffb347"
                    />
                  </div>
                ) : (
                  <p className="mt-2 text-[11px] text-slate-500">
                    After analysis, BioSense collapses multi-layer biology into
                    interpretable system-level scores.
                  </p>
                )}
              </div>
              <div className="rounded-2xl border border-slate-800/80 bg-slate-950/70 px-3 py-3">
                <div className="mb-1 flex items-center justify-between">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                    Neuro &amp; Stress Snapshot
                  </div>
                  {analysis && (
                    <span className="text-[11px] text-slate-400">
                      Stress index:{" "}
                      <span className="text-rose-300">
                        {analysis.prediction.stress.toFixed(1)}
                      </span>
                    </span>
                  )}
                </div>
                {analysis ? (
                  <dl className="grid grid-cols-3 gap-2 text-[11px]">
                    <Metric label="Serotonin" value={analysis.neuro.serotonin} />
                    <Metric label="Dopamine" value={analysis.neuro.dopamine} />
                    <Metric label="GABA" value={analysis.neuro.gaba} />
                    <Metric label="Cortisol" value={analysis.neuro.cortisol} tone="bad" />
                    <Metric
                      label="Melatonin"
                      value={analysis.neuro.melatonin}
                      tone="good"
                    />
                    <Metric
                      label="Gut balance"
                      value={analysis.microbiome.gut_balance_score}
                      tone="good"
                    />
                  </dl>
                ) : (
                  <p className="mt-2 text-[11px] text-slate-500">
                    The neurochemistry engine projects serotonin, dopamine,
                    GABA, cortisol, and melatonin from gut and nutrition
                    features.
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="glass-surface rounded-2xl p-4 md:p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                Prediction Timeline
              </div>
              <p className="text-xs text-slate-400">
                Modelled mood, energy and stress over the next 24 hours.
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-slate-800/80 bg-slate-950/70 px-3 py-3">
            {analysis ? (
              <TimelineChart timeline={analysis.prediction.timeline} />
            ) : (
              <p className="text-[11px] text-slate-500">
                Once you analyze a meal, a temporal forecast of mood, energy,
                and stress will appear here.
              </p>
            )}
          </div>
          <div className="rounded-xl border border-slate-800/80 bg-slate-950/70 px-3 py-3">
            <div className="mb-1 text-[11px] uppercase tracking-[0.18em] text-slate-400">
              Scientific Explanation
            </div>
            {analysis ? (
              <div className="space-y-2 text-[11px] text-slate-300">
                <p>{analysis.explanation.summary}</p>
                <ul className="list-disc space-y-1 pl-4 text-slate-400">
                  {analysis.explanation.bullets.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-[11px] text-slate-500">
                The explanation engine will connect fiber, SCFAs, microbiome
                diversity, neurotransmitters and health scores into a
                research-style narrative.
              </p>
            )}
          </div>
        </section>
      </div>
    </Shell>
  );
}

function Metric({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "good" | "bad" | "neutral";
}) {
  const colour =
    tone === "good"
      ? "text-emerald-300"
      : tone === "bad"
      ? "text-rose-300"
      : "text-biosense-blue";
  return (
    <div className="rounded-lg bg-slate-900/70 px-2 py-1.5">
      <dt className="text-[10px] text-slate-400">{label}</dt>
      <dd className={`text-xs font-semibold ${colour}`}>{value.toFixed(1)}</dd>
    </div>
  );
}

