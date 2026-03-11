"use client";

import { Shell } from "@/components/Shell";
import { useState } from "react";
import { useBioSense } from "@/context/BioSenseContext";

export default function ScanPage() {
  const { runAnalysis, isAnalyzing, error } = useBioSense();
  const [file, setFile] = useState<File | null>(null);

  async function handleAnalyze() {
    if (!file) return;
    await runAnalysis(file);
  }

  return (
    <Shell active="/scan">
      <div className="glass-surface rounded-2xl p-4 md:p-6 space-y-4">
        <h1 className="text-xl font-semibold">Scan Meal</h1>
        <p className="mt-1 text-xs text-slate-400 max-w-xl">
          Capture a meal image and stream it into the BioSense pipeline. This is
          a focused scanner view that updates the shared dashboard and panels.
        </p>
        <div className="mt-3 flex flex-col gap-3 md:flex-row">
          <label className="flex-1 cursor-pointer rounded-2xl border border-dashed border-slate-600/70 bg-slate-950/60 px-4 py-6 text-xs text-slate-400 hover:border-biosense-accent/70">
            <span className="flex flex-col items-center gap-2">
              <span className="h-9 w-9 rounded-full bg-gradient-to-br from-biosense-accent to-biosense-blue shadow-lg" />
              <span className="text-slate-200">
                {file ? file.name : "Drop or select a meal image"}
              </span>
              <span>JPEG / PNG · processed only on your local backend.</span>
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                setFile(f);
              }}
            />
          </label>
          <div className="flex w-full flex-col gap-2 md:w-48">
            <button
              onClick={handleAnalyze}
              disabled={!file || isAnalyzing}
              className="rounded-full bg-gradient-to-r from-biosense-accent to-biosense-blue px-4 py-2 text-xs font-semibold text-slate-900 shadow-md disabled:opacity-50"
            >
              {isAnalyzing ? "Analyzing…" : "Analyze this meal"}
            </button>
            {error && (
              <p className="text-[11px] text-rose-300">
                {error}
              </p>
            )}
            <p className="text-[10px] text-slate-500">
              Tip: keep this open on a tablet while the dashboard visualizes
              deeper layers.
            </p>
          </div>
        </div>
      </div>
    </Shell>
  );
}

