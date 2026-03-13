"use client";

import { motion } from "framer-motion";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";

type Baselines = {
  baseline_mood?: number;
  baseline_sleep_hours?: number;
  baseline_digestion_stability?: number;
  baseline_MDI?: number;
  baseline_inflammation_risk?: number;
  baseline_cognitive_score?: number;
  baseline_neuro_stress?: number;
  [key: string]: unknown;
};

interface BaselineRadarProps {
  baselines: Baselines | null;
}

export default function BaselineRadar({ baselines }: BaselineRadarProps) {
  if (!baselines) {
    return (
      <div className="w-[400px] h-[400px] mx-auto flex items-center justify-center rounded-xl border border-[var(--border)] bg-slate-50/50">
        <p className="text-sm text-[var(--muted)] font-ibm">
          No baseline data to display
        </p>
      </div>
    );
  }

  const mood = baselines.baseline_mood ?? 0;
  const sleep = baselines.baseline_sleep_hours ?? 0;
  const digestion = baselines.baseline_digestion_stability ?? 0;
  const mdi = baselines.baseline_MDI ?? 0;
  const inflammation = baselines.baseline_inflammation_risk ?? 0;
  const cognitive = baselines.baseline_cognitive_score ?? 0;
  const neuroStress = baselines.baseline_neuro_stress ?? 0;

  const radarData = [
    { axis: "Mood", value: mood / 10, fullMark: 1 },
    { axis: "Sleep", value: sleep / 9, fullMark: 1 },
    { axis: "Digestion", value: digestion, fullMark: 1 },
    { axis: "MDI", value: mdi, fullMark: 1 },
    { axis: "Inflammation", value: 1 - inflammation, fullMark: 1 },
    { axis: "Cognitive", value: cognitive / 10, fullMark: 1 },
    { axis: "Neuro Stress", value: 1 - neuroStress, fullMark: 1 },
  ];

  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 120, damping: 15 }}
      className="w-[400px] h-[400px] mx-auto"
    >
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
          <PolarGrid stroke="var(--border)" />
          <PolarAngleAxis
            dataKey="axis"
            tick={{
              fill: "var(--muted)",
              fontSize: 11,
              fontFamily: "var(--font-ibm-mono)",
            }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 1]}
            tick={{ fill: "var(--muted)", fontSize: 10 }}
          />
          <Radar
            name="Baseline"
            dataKey="value"
            stroke="#0EA5E9"
            fill="#0EA5E9"
            fillOpacity={0.3}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
