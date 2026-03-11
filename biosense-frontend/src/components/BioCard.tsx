"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

export function BioCard({
  label,
  value,
  hint,
  tone = "cyan",
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "emerald" | "cyan" | "blue" | "rose" | "amber";
  icon?: ReactNode;
}) {
  const toneClass =
    tone === "emerald"
      ? "text-emerald-300"
      : tone === "blue"
      ? "text-blue-300"
      : tone === "rose"
      ? "text-rose-300"
      : tone === "amber"
      ? "text-amber-300"
      : "text-cyan-300";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="rounded-xl border border-white/10 bg-white/5 backdrop-blur px-3 py-2.5 shadow-lg shadow-cyan-500/10"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.22em] text-white/45">
            {label}
          </div>
          <div className={`mt-1 text-lg font-semibold ${toneClass}`}>{value}</div>
          {hint ? (
            <div className="mt-0.5 text-[11px] text-white/45">{hint}</div>
          ) : null}
        </div>
        {icon ? (
          <div className="h-9 w-9 shrink-0 rounded-full border border-white/10 bg-white/5 flex items-center justify-center">
            {icon}
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}

