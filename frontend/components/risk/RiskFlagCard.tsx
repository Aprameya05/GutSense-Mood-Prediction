"use client";

import { motion } from "framer-motion";

interface RiskFlagCardProps {
  flag_id: string;
  name: string;
  severity: string;
  evidence: string;
  active: boolean;
  index?: number;
}

const severityColors: Record<string, string> = {
  Low: "bg-slate-100 text-slate-700",
  Moderate: "bg-amber-50 text-amber-700",
  High: "bg-red-50 text-red-700",
};

export default function RiskFlagCard({
  flag_id,
  name,
  severity,
  evidence,
  active,
  index = 0,
}: RiskFlagCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className={`bg-white rounded-xl border border-[var(--border)] p-4 border-l-4 ${
        active ? "border-l-[var(--red)]" : "border-l-slate-200"
      } ${active ? "font-medium" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className={`font-jakarta ${active ? "font-semibold text-[var(--text)]" : "text-[var(--text)]"}`}>
          {name}
        </p>
        <span
          className={`shrink-0 text-xs font-ibm px-2 py-1 rounded-full ${
            severityColors[severity] ?? "bg-slate-100 text-slate-700"
          }`}
        >
          {severity}
        </span>
      </div>
      <p className="text-sm text-[var(--muted)] mt-2 font-jakarta leading-relaxed">
        {evidence}
      </p>
    </motion.div>
  );
}
