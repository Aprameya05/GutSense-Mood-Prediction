import { motion } from "framer-motion";

export function CircularGauge({
  label,
  value,
  accent = "#4ef2c5",
}: {
  label: string;
  value: number;
  accent?: string;
}) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative flex flex-col items-center justify-center">
      <svg
        viewBox="0 0 120 120"
        className="h-28 w-28 -rotate-90 text-slate-700"
        aria-hidden="true"
      >
        <circle
          cx="60"
          cy="60"
          r={radius}
          strokeWidth="9"
          className="fill-none stroke-slate-800"
        />
        <motion.circle
          cx="60"
          cy="60"
          r={radius}
          strokeWidth="9"
          strokeLinecap="round"
          className="fill-none"
          stroke={accent}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.6 }}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <div className="text-lg font-semibold">{clamped.toFixed(0)}%</div>
        <div className="text-[11px] text-slate-400">{label}</div>
      </div>
    </div>
  );
}

