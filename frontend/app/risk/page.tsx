"use client";

import { motion } from "framer-motion";
import RiskRadar from "@/components/risk/RiskRadar";
import BrainViz from "@/components/risk/BrainViz";
import RiskFlagCard from "@/components/risk/RiskFlagCard";
import { demoStage9, riskFlagDetails } from "@/lib/demoData";

const FLAG_ORDER = [
  "persistent_brain_fog",
  "chronic_sleep_debt",
  "mood_instability",
  "metabolic_dysregulation",
  "inflammation_persistence",
  "circadian_disruption",
  "combined_neuro_stress",
  "b12_deficiency_signal",
] as const;

export default function RiskPage() {
  const activeFlags = new Set(demoStage9.active_flags);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-end justify-between"
      >
        <div>
          <h1 className="font-instrument text-3xl text-[var(--text)]">
            Neurological Risk Monitor
          </h1>
          <p className="text-sm text-[var(--muted)] mt-1 font-ibm">
            Active risk signals and recommendations
          </p>
        </div>
        <motion.span
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className={`px-4 py-2 rounded-full text-sm font-medium font-ibm capitalize ${
            (demoStage9.neurological_risk_level as string) === "none"
              ? "bg-emerald-50 text-emerald-700"
              : (demoStage9.neurological_risk_level as string) === "mild"
              ? "bg-amber-50 text-amber-700"
              : (demoStage9.neurological_risk_level as string) === "moderate"
              ? "bg-amber-100 text-amber-800"
              : "bg-red-50 text-red-700"
          }`}
        >
          {demoStage9.neurological_risk_level}
        </motion.span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-8"
      >
        <div className="bg-white rounded-2xl border border-[var(--border)] p-6 flex flex-col items-center justify-center">
          <h3 className="text-xs font-ibm uppercase tracking-wider text-[var(--muted)] mb-4">
            Risk Dimensions
          </h3>
          <RiskRadar riskData={{
            neurological_risk_level: demoStage9.neurological_risk_level,
            active_flags: demoStage9.active_flags,
            risk_count: demoStage9.risk_count,
          }} />
        </div>
        <div className="bg-white rounded-2xl border border-[var(--border)] p-6 flex flex-col items-center justify-center">
          <h3 className="text-xs font-ibm uppercase tracking-wider text-[var(--muted)] mb-4">
            Brain Region Map
          </h3>
          <BrainViz
            stressProxy={(demoStage9 as any).neurological_stress_proxy ?? 0.35}
            activeFlags={demoStage9.active_flags}
          />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h3 className="text-sm font-ibm uppercase tracking-wider text-[var(--muted)] mb-4">
          Recommendation
        </h3>
        <p className="text-[var(--text)] font-jakarta leading-relaxed bg-white rounded-xl border border-[var(--border)] p-4">
          {demoStage9.recommendation}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {FLAG_ORDER.map((flagId, i) => {
          const detail = riskFlagDetails[flagId];
          if (!detail) return null;
          return (
            <RiskFlagCard
              key={flagId}
              flag_id={flagId}
              name={detail.name}
              severity={detail.severity}
              evidence={detail.evidence}
              active={activeFlags.has(flagId)}
              index={i}
            />
          );
        })}
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="rounded-xl border-2 border-[var(--blue)] bg-blue-50/50 p-4"
      >
        <p className="text-sm text-[var(--text)] font-jakarta leading-relaxed">
          <strong className="font-semibold">Disclaimer:</strong>{" "}
          All observations are informational only. Not medical advice. Consult a
          qualified healthcare professional for medical concerns.
        </p>
      </motion.div>
    </div>
  );
}
