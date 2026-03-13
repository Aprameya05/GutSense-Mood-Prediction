"use client";

import { motion } from "framer-motion";
import { Check, AlertTriangle } from "lucide-react";

interface StabilityCardProps {
  metric_name: string;
  value: number | string;
  cv_percent: number;
  stable: boolean;
  unit: string;
  index?: number;
}

export default function StabilityCard({
  metric_name,
  value,
  cv_percent,
  stable,
  unit,
  index = 0,
}: StabilityCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className="bg-white rounded-xl border border-[var(--border)] p-4"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-[var(--text)] font-jakarta">{metric_name}</p>
          <p className="text-lg font-ibm text-[var(--text)] mt-1">
            {typeof value === "number" ? value.toFixed(2) : value}
            {unit}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {stable ? (
            <>
              <Check className="h-5 w-5 text-[var(--green)]" strokeWidth={2.5} />
              <span className="text-xs font-ibm text-[var(--green)]">Stable</span>
            </>
          ) : (
            <>
              <AlertTriangle className="h-5 w-5 text-[var(--amber)]" strokeWidth={2.5} />
              <span className="text-xs font-ibm text-[var(--amber)]">
                Unstable (CV: {cv_percent.toFixed(1)}%)
              </span>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
