"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import BaselineRadar from "@/components/baselines/BaselineRadar";
import StabilityCard from "@/components/baselines/StabilityCard";
import { getBaselines, USER_ID } from "@/lib/api";

type StabilityDetail = {
  cv_percent: number;
  stable: boolean;
};

type BaselinesData = {
  baseline_mood?: number;
  baseline_sleep_hours?: number;
  baseline_digestion_stability?: number;
  baseline_MDI?: number;
  baseline_inflammation_risk?: number;
  baseline_cognitive_score?: number;
  baseline_neuro_stress?: number;
  stability_details?: {
    mood?: StabilityDetail;
    sleep_hours?: StabilityDetail;
    digestion_stability?: StabilityDetail;
    MDI?: StabilityDetail;
    inflammation?: StabilityDetail;
    cognitive_score?: StabilityDetail;
    neuro_stress?: StabilityDetail;
  };
  [key: string]: unknown;
};

const STABILITY_CARD_CONFIG = [
  {
    key: "mood" as const,
    metric_name: "Mood",
    unit: "/10",
  },
  {
    key: "sleep_hours" as const,
    metric_name: "Sleep Hours",
    unit: " hrs",
  },
  {
    key: "digestion_stability" as const,
    metric_name: "Digestion Stability",
    unit: "",
  },
  {
    key: "MDI" as const,
    metric_name: "MDI",
    unit: "",
  },
  {
    key: "inflammation" as const,
    metric_name: "Inflammation Risk",
    unit: "",
  },
  {
    key: "cognitive_score" as const,
    metric_name: "Cognitive Score",
    unit: "/10",
  },
  {
    key: "neuro_stress" as const,
    metric_name: "Neuro Stress",
    unit: "",
  },
] as const;

const BASELINE_KEYS: Record<string, keyof BaselinesData> = {
  mood: "baseline_mood",
  sleep_hours: "baseline_sleep_hours",
  digestion_stability: "baseline_digestion_stability",
  MDI: "baseline_MDI",
  inflammation: "baseline_inflammation_risk",
  cognitive_score: "baseline_cognitive_score",
  neuro_stress: "baseline_neuro_stress",
};

export default function BaselinesPage() {
  const [data, setData] = useState<BaselinesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    getBaselines(USER_ID)
      .then((res) => {
        setData(res as BaselinesData);
        setLocked(false);
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : String(err);
        setLocked(msg.includes("404") || msg.includes("30"));
        setData(null);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="h-9 w-64 bg-slate-200 rounded animate-pulse" />
        <div className="h-[400px] w-[400px] mx-auto bg-slate-200 rounded-xl animate-pulse" />
        <div className="h-10 w-32 bg-slate-200 rounded-full animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-24 bg-slate-200 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (locked || !data) {
    return (
      <div className="max-w-5xl mx-auto space-y-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h1 className="font-instrument text-3xl text-[var(--text)]">
            Personal Baselines
          </h1>
          <p className="text-sm text-[var(--muted)] mt-1 font-ibm">
            30-day baseline metrics with stability analysis
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-[var(--border)]"
        >
          <Lock className="h-12 w-12 text-[var(--muted)] mb-4" />
          <p className="text-[var(--muted)] font-ibm text-center">
            Baselines unlock after 30 days of logging
          </p>
        </motion.div>
      </div>
    );
  }

  const stabilityDetails = data.stability_details ?? {};
  const stabilityCards = STABILITY_CARD_CONFIG.map((config) => {
    const detail = stabilityDetails[config.key];
    const value = data[BASELINE_KEYS[config.key]] as number | undefined;
    return {
      metric_name: config.metric_name,
      value: value ?? 0,
      cv_percent: detail?.cv_percent ?? 0,
      stable: detail?.stable ?? false,
      unit: config.unit,
    };
  });

  const stableCount = stabilityCards.filter((c) => c.stable).length;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="font-instrument text-3xl text-[var(--text)]">
          Personal Baselines
        </h1>
        <p className="text-sm text-[var(--muted)] mt-1 font-ibm">
          30-day baseline metrics with stability analysis
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex justify-center"
      >
        <BaselineRadar baselines={data} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex items-center gap-3"
      >
        <span
          className={`px-4 py-2 rounded-full text-sm font-medium font-ibm ${
            stableCount >= 5
              ? "bg-emerald-50 text-emerald-700"
              : stableCount >= 3
              ? "bg-amber-50 text-amber-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {stableCount}/7 metrics stable
        </span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        {stabilityCards.map((card, i) => (
          <StabilityCard key={card.metric_name} {...card} index={i} />
        ))}
      </motion.div>
    </div>
  );
}
