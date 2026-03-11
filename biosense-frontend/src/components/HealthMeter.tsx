"use client";

import { motion } from "framer-motion";

export function HealthMeter({
  label,
  value,
  accent = "emerald",
}: {
  label: string;
  value: number; // 0..100
  accent?: "emerald" | "cyan" | "blue" | "amber" | "rose";
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  const stroke =
    accent === "cyan"
      ? "#22d3ee"
      : accent === "blue"
      ? "#60a5fa"
      : accent === "amber"
      ? "#fbbf24"
      : accent === "rose"
      ? "#fb7185"
      : "#34d399";

  return (
    <div className="relative flex flex-col items-center justify-center">
      <svg viewBox="0 0 128 128" className="h-28 w-28 -rotate-90" aria-hidden>
        <circle
          cx="64"
          cy="64"
          r={radius}
          strokeWidth="10"
          className="fill-none stroke-white/10"
        />
        <motion.circle
          cx="64"
          cy="64"
          r={radius}
          strokeWidth="10"
          strokeLinecap="round"
          className="fill-none"
          stroke={stroke}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <div className="text-xl font-semibold text-white/90">
          {clamped.toFixed(0)}
        </div>
        <div className="text-[10px] uppercase tracking-[0.24em] text-white/45">
          {label}
        </div>
      </div>
    </div>
  );
}

