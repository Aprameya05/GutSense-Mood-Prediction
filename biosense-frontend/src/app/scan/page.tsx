"use client";

import { Shell } from "@/components/Shell";
import { useState } from "react";
import { useBioSense } from "@/context/BioSenseContext";
import { GlowPanel } from "@/components/GlowPanel";
import { motion } from "framer-motion";

export default function ScanPage() {
  const { runAnalysis, isAnalyzing, error } = useBioSense();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  async function handleAnalyze() {
    if (!file) return;
    await runAnalysis(file);
  }

  return (
    <Shell active="/scan">
      <GlowPanel
        title="Meal scan"
        subtitle="Optical ingestion → feature extraction → biological state simulation"
        tone="emerald"
        right={
          <div className="flex items-center gap-2">
            <button
              onClick={handleAnalyze}
              disabled={!file || isAnalyzing}
              className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-[11px] uppercase tracking-[0.22em] text-cyan-200 shadow-lg shadow-cyan-500/20 disabled:opacity-50"
            >
              {isAnalyzing ? "Analyzing…" : "Analyze"}
            </button>
            <label className="cursor-pointer rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-white/65 hover:border-emerald-400/30">
              {file ? file.name : "Select image"}
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

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur"
          >
            {preview ? (
              <img
                src={preview}
                alt="Meal preview"
                className="h-96 w-full object-cover"
              />
            ) : (
              <div className="flex h-96 items-center justify-center text-xs text-white/50">
                Feed a meal image into the optical pipeline.
              </div>
            )}

            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-6 rounded-2xl border border-emerald-400/15 shadow-[0_0_40px_rgba(16,185,129,0.12)]" />
              <div className="absolute left-8 top-8 rounded-full border border-white/10 bg-black/45 px-3 py-1.5 text-[10px] uppercase tracking-[0.22em] text-white/60 backdrop-blur">
                Optical intake
              </div>
            </div>

            <div className="absolute bottom-3 left-3 right-3 rounded-xl border border-white/10 bg-black/55 px-3 py-2 backdrop-blur">
              <div className="flex items-center justify-between gap-2">
                <div className="text-[10px] uppercase tracking-[0.24em] text-white/55">
                  Pipeline stages
                </div>
                <div className="flex gap-1">
                  {["Vision", "Nutrition", "Microbiome", "Neuro", "Prediction"].map(
                    (s) => (
                      <span
                        key={s}
                        className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] uppercase tracking-[0.18em] text-white/60"
                      >
                        {s}
                      </span>
                    ),
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          <div className="space-y-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-3">
              <div className="text-[10px] uppercase tracking-[0.26em] text-white/55">
                Capture protocol
              </div>
              <ul className="mt-2 space-y-1 text-[12px] text-white/60">
                <li>- Keep plate centered; avoid heavy glare.</li>
                <li>- Include sides/toppings for better inference.</li>
                <li>- Use consistent lighting for longitudinal tracking.</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-3">
              <div className="text-[10px] uppercase tracking-[0.26em] text-white/55">
                Wearables (placeholder)
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                <div className="rounded-xl border border-white/10 bg-black/35 px-2 py-2 text-white/55">
                  HR / HRV
                </div>
                <div className="rounded-xl border border-white/10 bg-black/35 px-2 py-2 text-white/55">
                  Sleep
                </div>
                <div className="rounded-xl border border-white/10 bg-black/35 px-2 py-2 text-white/55">
                  Steps
                </div>
                <div className="rounded-xl border border-white/10 bg-black/35 px-2 py-2 text-white/55">
                  Stress
                </div>
              </div>
              <div className="mt-2 text-[11px] text-white/40">
                These streams will modulate circadian, stress, and recovery layers.
              </div>
            </div>
          </div>
        </div>
      </GlowPanel>
    </Shell>
  );
}

