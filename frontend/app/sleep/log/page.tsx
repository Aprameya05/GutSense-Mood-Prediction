"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Moon, Clock, Coffee, Monitor, AlertTriangle } from "lucide-react";
import CountUp from "@/components/shared/CountUp";
import ScrollReveal from "@/components/shared/ScrollReveal";
import GaugeChart from "@/components/shared/GaugeChart";
import { demoStage6 } from "@/lib/demoData";

export default function SleepLogPage() {
  const [onset, setOnset] = useState(demoStage6.sleep_onset);
  const [wake, setWake] = useState(demoStage6.wake_time);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-instrument text-3xl text-[var(--text)]">Log Sleep</h1>
        <p className="text-sm text-[var(--muted)] mt-1 font-ibm">
          Stage 6 — Sleep & Circadian Analysis
        </p>
      </motion.div>

      {/* Input Form */}
      <ScrollReveal>
        <div className="bg-white rounded-2xl border border-[var(--border)] p-6 space-y-6">
          <h2 className="font-instrument text-lg text-[var(--text)]">Sleep Details</h2>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="text-xs font-ibm text-[var(--muted)] uppercase tracking-wider mb-2 block">
                Sleep Onset
              </label>
              <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-4 py-3 border border-[var(--border)]">
                <Moon className="h-4 w-4 text-[var(--blue)]" />
                <input
                  type="time"
                  value={onset}
                  onChange={(e) => setOnset(e.target.value)}
                  className="bg-transparent text-[var(--text)] font-ibm text-sm flex-1 outline-none"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-ibm text-[var(--muted)] uppercase tracking-wider mb-2 block">
                Wake Time
              </label>
              <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-4 py-3 border border-[var(--border)]">
                <Clock className="h-4 w-4 text-[var(--amber)]" />
                <input
                  type="time"
                  value={wake}
                  onChange={(e) => setWake(e.target.value)}
                  className="bg-transparent text-[var(--text)] font-ibm text-sm flex-1 outline-none"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3 border border-[var(--border)]">
              <Coffee className="h-4 w-4 text-[var(--amber)]" />
              <span className="text-sm text-[var(--text)]">
                Caffeine after 2 PM: <strong>{demoStage6.caffeine_after_14h ? "Yes" : "No"}</strong>
              </span>
            </div>
            <div className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3 border border-[var(--border)]">
              <Monitor className="h-4 w-4 text-[var(--blue)]" />
              <span className="text-sm text-[var(--text)]">
                Screen before bed: <strong>{demoStage6.screen_before_bed_min} min</strong>
              </span>
            </div>
          </div>
        </div>
      </ScrollReveal>

      {/* Results */}
      <ScrollReveal delay={0.1}>
        <div className="bg-white rounded-2xl border border-[var(--border)] p-6">
          <h2 className="font-instrument text-lg text-[var(--text)] mb-6">Sleep Analysis</h2>

          {/* Stat Cards */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            {[
              { label: "Sleep Duration", value: demoStage6.sleep_hours, unit: "hrs", color: "text-blue-600" },
              { label: "Sleep Debt", value: demoStage6.sleep_debt, unit: "hrs", color: "text-amber-600" },
              { label: "7-Day Debt", value: demoStage6.cumulative_debt_7d, unit: "hrs", color: "text-rose-500" },
              { label: "Awakenings", value: demoStage6.night_awakenings, unit: "", color: "text-violet-600" },
            ].map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.08 }}
                className="bg-slate-50 rounded-xl p-4 text-center"
              >
                <div className="text-xs font-ibm text-[var(--muted)] uppercase tracking-wider mb-1">{s.label}</div>
                <CountUp end={s.value} decimals={1} suffix={s.unit ? ` ${s.unit}` : ""} className={`text-2xl font-semibold ${s.color}`} />
              </motion.div>
            ))}
          </div>

          {/* Gauges */}
          <div className="grid grid-cols-3 gap-8 mb-6">
            <GaugeChart value={demoStage6.circadian_regularity_index} color="var(--blue)" label="Circadian Regularity" sublabel={`CRI: ${demoStage6.circadian_regularity_index}`} />
            <GaugeChart value={demoStage6.neurological_stress_proxy} color="var(--amber)" label="Neuro Stress" sublabel={`Score: ${demoStage6.neurological_stress_proxy}`} />
            <GaugeChart value={demoStage6.sleep_hours / 9} color="var(--green)" label="Sleep Quality" sublabel={demoStage6.sleep_quality} />
          </div>

          {/* Quality Badges */}
          <div className="flex gap-3 justify-center">
            <span className="px-4 py-1.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
              Quality: {demoStage6.sleep_quality}
            </span>
            <span className="px-4 py-1.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
              Stability: {demoStage6.sleep_stability}
            </span>
            {demoStage6.cumulative_debt_7d > 3 && (
              <span className="px-4 py-1.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Sleep debt accumulating
              </span>
            )}
          </div>
        </div>
      </ScrollReveal>
    </div>
  );
}
