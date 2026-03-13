"use client";

import { motion } from "framer-motion";

export type HealthLog = {
  date: string;
  mood_score: number;
  mood_emoji?: string;
  sleep_hours: number;
  mdi: number;
  irs: number;
  calories: number;
  anomaly?: boolean;
  [key: string]: unknown;
};

function getHealthColor(mood: number, mdi: number): string {
  if (mood > 0.5 && mdi > 0.5) return "bg-emerald-500/90";
  if (mood > 0 || mdi > 0.4) return "bg-amber-400/90";
  return "bg-red-500/90";
}

interface HealthCalendarProps {
  logs: HealthLog[];
}

export default function HealthCalendar({ logs }: HealthCalendarProps) {
  const cols = 6;
  const rows = 5;
  const cellSize = 60;

  if (!logs || logs.length === 0) {
    return (
      <div className="inline-flex flex-col gap-1 p-8 rounded-xl border border-[var(--border)] bg-slate-50/50">
        <p className="text-sm text-[var(--muted)] font-ibm text-center">
          No calendar data to display
        </p>
      </div>
    );
  }

  return (
    <div className="inline-flex flex-col gap-1">
      <div
        className="grid gap-1"
        style={{
          gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
          gridTemplateRows: `repeat(${rows}, ${cellSize}px)`,
        }}
      >
        {logs.map((day, i) => {
          const col = i % cols;
          const row = Math.floor(i / cols);
          const delay = (row * cols + col) * 0.02;
          const mood = day.mood_score ?? 0;
          const mdi = day.mdi ?? 0;
          const bgColor = getHealthColor(mood, mdi);

          return (
            <motion.div
              key={day.date}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay, duration: 0.2 }}
              whileHover={{ scale: 1.08 }}
              className={`
                group relative flex flex-col items-center justify-center rounded-lg
                border border-white/30 shadow-sm cursor-pointer
                ${bgColor} text-white
              `}
              style={{ width: cellSize, height: cellSize }}
            >
              <span className="text-sm font-ibm font-semibold">
                {new Date(day.date).getDate()}
              </span>
              {day.mood_emoji && (
                <span className="absolute top-0.5 right-0.5 text-xs">
                  {day.mood_emoji}
                </span>
              )}
              {day.anomaly && (
                <motion.span
                  animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-red-900"
                />
              )}
              {/* Tooltip on hover */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1.5 bg-slate-900 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none z-10 whitespace-nowrap transition-opacity">
                <div className="font-ibm">
                  <div>{day.date}</div>
                  <div>Calories: {day.calories ?? 0} kcal</div>
                  <div>Sleep: {day.sleep_hours ?? 0}h</div>
                  <div>Mood: {mood}</div>
                  <div>MDI: {mdi}</div>
                  <div>IRS: {day.irs ?? 0}</div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
