"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import HealthCalendar from "@/components/history/HealthCalendar";
import { getHistory, USER_ID, TODAY } from "@/lib/api";

export type HistoryLog = {
  date: string;
  mood_score: number;
  mood_emoji?: string;
  sleep_hours: number;
  mdi: number;
  irs: number;
  calories: number;
  fiber_g?: number;
  anomaly?: boolean;
  [key: string]: unknown;
};

function mapRawLogToHealthLog(raw: Record<string, unknown>): HistoryLog {
  const totals = (raw.daily_totals as Record<string, unknown>) ?? {};
  const gut = (raw.daily_gut as Record<string, unknown>) ?? {};
  const moodSummary = (raw.daily_mood_summary as Record<string, unknown>) ?? {};
  const sleep = (raw.sleep as Record<string, unknown>) ?? {};
  const meals = (raw.meals as Array<Record<string, unknown>>) ?? [];
  const lastMood = meals
    .map((m) => (m.stage4 as Record<string, unknown>)?.emoji_used)
    .find((e) => e);
  return {
    date: String(raw.date ?? ""),
    mood_score: Number(moodSummary.avg_mood_score ?? 0),
    mood_emoji: lastMood ? String(lastMood) : undefined,
    sleep_hours: Number(sleep.sleep_hours ?? 0),
    mdi: Number(gut.microbiome_diversity_index ?? 0),
    irs: Number(gut.inflammation_risk_score ?? 0),
    calories: Number(totals.calories_kcal ?? 0),
    fiber_g: Number(totals.fiber_g ?? 0),
    anomaly: Boolean(raw.anomaly),
  };
}

function getDateRange(daysBack: number): { from: string; to: string } {
  const to = new Date(TODAY);
  const from = new Date(to);
  from.setDate(from.getDate() - daysBack);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

export default function HistoryPage() {
  const [logs, setLogs] = useState<HistoryLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const { from, to } = getDateRange(30);
    getHistory(USER_ID, from, to)
      .then((res) => {
        const rawLogs = (res.logs ?? []) as Record<string, unknown>[];
        setLogs(rawLogs.map(mapRawLogToHealthLog));
        setError(null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load history");
        setLogs([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const avgMood =
    logs.length > 0
      ? logs.reduce((s, d) => s + (d.mood_score ?? 0), 0) / logs.length
      : 0;
  const avgSleep =
    logs.length > 0
      ? logs.reduce((s, d) => s + (d.sleep_hours ?? 0), 0) / logs.length
      : 0;
  const avgCalories =
    logs.length > 0
      ? logs.reduce((s, d) => s + (d.calories ?? 0), 0) / logs.length
      : 0;
  const anomalyDays = logs.filter((d) => d.anomaly).length;

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="h-9 w-64 bg-slate-200 rounded animate-pulse" />
        <div className="grid gap-1" style={{ gridTemplateColumns: "repeat(6, 60px)" }}>
          {Array.from({ length: 30 }).map((_, i) => (
            <div
              key={i}
              className="w-[60px] h-[60px] rounded-lg bg-slate-200 animate-pulse"
            />
          ))}
        </div>
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-20 bg-slate-200 rounded-xl animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error || logs.length === 0) {
    return (
      <div className="max-w-4xl mx-auto space-y-8">
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-instrument text-3xl text-[var(--text)]"
        >
          30-Day Health History
        </motion.h1>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white rounded-xl border border-[var(--border)] p-12 text-center"
        >
          <p className="text-[var(--muted)] font-ibm">
            No history data yet. Log some meals to see your health calendar.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="font-instrument text-3xl text-[var(--text)]"
      >
        30-Day Health History
      </motion.h1>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <HealthCalendar logs={logs} />
      </motion.div>

      {/* Summary stats row */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-4 gap-4"
      >
        <div className="bg-white rounded-xl border border-[var(--border)] p-4">
          <p className="text-xs font-ibm uppercase tracking-wider text-[var(--muted)]">
            Avg Mood
          </p>
          <p className="text-xl font-semibold text-[var(--text)] mt-1 font-ibm">
            {avgMood.toFixed(1)}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-[var(--border)] p-4">
          <p className="text-xs font-ibm uppercase tracking-wider text-[var(--muted)]">
            Avg Sleep
          </p>
          <p className="text-xl font-semibold text-[var(--text)] mt-1 font-ibm">
            {avgSleep.toFixed(1)}h
          </p>
        </div>
        <div className="bg-white rounded-xl border border-[var(--border)] p-4">
          <p className="text-xs font-ibm uppercase tracking-wider text-[var(--muted)]">
            Avg Calories
          </p>
          <p className="text-xl font-semibold text-[var(--text)] mt-1 font-ibm">
            {Math.round(avgCalories)}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-[var(--border)] p-4">
          <p className="text-xs font-ibm uppercase tracking-wider text-[var(--muted)]">
            Anomaly Days
          </p>
          <p className="text-xl font-semibold text-[var(--red)] mt-1 font-ibm">
            {anomalyDays}
          </p>
        </div>
      </motion.div>

      {/* Color legend */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex items-center gap-6 text-sm font-ibm text-[var(--muted)]"
      >
        <span className="font-medium text-[var(--text)]">Legend:</span>
        <span className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-emerald-500/90" />
          Good (mood &gt; 0.5, MDI &gt; 0.5)
        </span>
        <span className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-amber-400/90" />
          Moderate
        </span>
        <span className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-red-500/90" />
          Poor
        </span>
      </motion.div>
    </div>
  );
}
