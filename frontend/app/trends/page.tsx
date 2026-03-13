"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import CorrelationGraph from "@/components/trends/CorrelationGraph";
import FindingCard from "@/components/trends/FindingCard";
import { getTrends, USER_ID } from "@/lib/api";

type Correlation = {
  pair: string;
  r: number;
  p: number;
  significant: boolean;
  [key: string]: unknown;
};

type Anomaly = {
  date: string;
  metric: string;
  z_score: number;
  value: number;
  rolling_mean: number;
  rolling_std?: number;
  [key: string]: unknown;
};

type TrendsData = {
  correlations?: Correlation[];
  significant_correlations?: Correlation[];
  anomalies?: Anomaly[];
  groq_summary?: string;
  [key: string]: unknown;
};

export default function TrendsPage() {
  const [data, setData] = useState<TrendsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    getTrends(USER_ID)
      .then((res) => {
        setData(res as TrendsData);
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
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="h-9 w-64 bg-slate-200 rounded animate-pulse" />
        <div className="h-[500px] w-full max-w-[600px] mx-auto bg-slate-200 rounded-xl animate-pulse" />
        <div className="space-y-4">
          <div className="h-6 w-48 bg-slate-200 rounded animate-pulse" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-slate-200 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (locked || !data) {
    return (
      <div className="max-w-4xl mx-auto space-y-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="font-instrument text-3xl text-[var(--text)]">
            Pattern Analysis
          </h1>
          <p className="text-sm text-[var(--muted)] mt-1 font-ibm">
            30-day correlation analysis between food, gut, and mood indicators
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-[var(--border)]"
        >
          <Lock className="h-12 w-12 text-[var(--muted)] mb-4" />
          <p className="text-[var(--muted)] font-ibm text-center">
            Trends unlock after 30 days of logging
          </p>
        </motion.div>
      </div>
    );
  }

  const correlations = data.correlations ?? [];
  const significantFindings = (data.significant_correlations ?? []).slice(0, 5);
  const anomalies = data.anomalies ?? [];
  const groqSummary = data.groq_summary ?? "";

  const findingDescriptions: Record<string, string> = {
    "glycemic_load ↔ mood_score":
      "Higher glycemic load meals correlate with lower mood scores. Consider pairing high-carb meals with fiber-rich sides.",
    "fiber_g ↔ MDI":
      "Fiber intake positively correlates with microbiome diversity index. Increasing fiber supports gut health.",
    "sleep_debt ↔ cognitive_penalty":
      "Accumulated sleep debt is associated with cognitive fog. Prioritize consistent sleep to maintain clarity.",
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="font-instrument text-3xl text-[var(--text)]">
          Pattern Analysis
        </h1>
        <p className="text-sm text-[var(--muted)] mt-1 font-ibm">
          30-day correlation analysis between food, gut, and mood indicators
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex justify-center"
      >
        <CorrelationGraph correlations={correlations} />
      </motion.div>

      {/* Finding cards */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-4"
      >
        <h2 className="font-instrument text-xl text-[var(--text)]">
          Significant Correlations
        </h2>
        <div className="space-y-3">
          {significantFindings.length === 0 ? (
            <p className="text-sm text-[var(--muted)] font-ibm">
              No significant correlations detected yet.
            </p>
          ) : (
            significantFindings.map((c, i) => (
              <FindingCard
                key={`${c.pair}-${i}`}
                title={c.pair}
                description={
                  findingDescriptions[c.pair] ??
                  `Correlation of r = ${c.r.toFixed(2)} (p ${c.p < 0.001 ? "< 0.001" : c.p.toFixed(3)})`
                }
                correlation_r={c.r}
                p_value={c.p}
                significant={c.significant}
              />
            ))
          )}
        </div>
      </motion.div>

      {/* Groq summary */}
      {groqSummary && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-blue-50 rounded-xl border border-blue-100 p-4"
        >
          <h3 className="text-xs font-ibm uppercase tracking-wider text-[var(--blue)] mb-2">
            AI Summary
          </h3>
          <p className="text-sm text-[var(--text)] leading-relaxed font-jakarta">
            {groqSummary}
          </p>
        </motion.div>
      )}

      {/* Anomalies section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <h2 className="font-instrument text-xl text-[var(--text)] mb-4">
          Detected Anomalies
        </h2>
        <div className="space-y-3">
          {anomalies.length === 0 ? (
            <p className="text-sm text-[var(--muted)] font-ibm">
              No anomalies detected in the analysis window.
            </p>
          ) : (
            anomalies.map((a, i) => (
              <div
                key={`${a.date}-${a.metric}-${i}`}
                className="bg-white rounded-xl border border-[var(--border)] p-4 flex items-center justify-between"
              >
                <div>
                  <span className="font-ibm text-sm text-[var(--text)]">
                    {a.date}
                  </span>
                  <span className="text-[var(--muted)] mx-2">·</span>
                  <span className="font-ibm text-sm text-[var(--muted)]">
                    {a.metric}
                  </span>
                </div>
                <div className="font-ibm text-sm">
                  <span className="text-[var(--red)]">
                    z = {a.z_score.toFixed(1)}
                  </span>
                  <span className="text-[var(--muted)] ml-2">
                    (value: {a.value}, mean: {a.rolling_mean.toFixed(1)})
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
}
