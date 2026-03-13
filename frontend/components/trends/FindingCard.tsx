"use client";

import { motion } from "framer-motion";

interface FindingCardProps {
  title: string;
  description: string;
  correlation_r: number;
  p_value: number;
  significant: boolean;
}

export default function FindingCard({
  title,
  description,
  correlation_r,
  p_value,
  significant,
}: FindingCardProps) {
  const pDisplay = p_value < 0.001 ? "< 0.001" : p_value.toFixed(3);

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: "spring", stiffness: 100, damping: 15 }}
      className={`
        bg-white rounded-xl border border-[var(--border)] p-4
        border-l-4
        ${significant ? "border-l-[var(--green)]" : "border-l-[var(--muted)]"}
      `}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-medium text-[var(--text)]">{title}</h3>
          <p className="text-sm text-[var(--muted)] mt-1 leading-relaxed">
            {description}
          </p>
          <p className="font-ibm text-xs text-[var(--muted)] mt-2">
            r = {correlation_r.toFixed(2)}, p {pDisplay}
          </p>
        </div>
        <span
          className={`
            shrink-0 px-2 py-0.5 rounded text-xs font-ibm
            ${significant ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}
          `}
        >
          {significant ? "Significant" : "Not Significant"}
        </span>
      </div>
    </motion.div>
  );
}
