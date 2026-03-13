"use client";

import { motion } from "framer-motion";
import {
  Smile,
  Moon,
  Flame,
  Dna,
  Brain,
  Activity,
  UtensilsCrossed,
  TrendingUp,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import StatCard from "@/components/dashboard/StatCard";
import ScrollReveal from "@/components/shared/ScrollReveal";
import {
  demoStage3,
  demoStage4,
  demoStage5,
  demoStage6,
  demoStage8,
  demoStage9,
  demoStage10,
  demoUser,
  demoHistory,
} from "@/lib/demoData";
import Link from "next/link";

const stats = [
  {
    title: "Mood Score",
    value: 6.2,
    suffix: "/ 10",
    decimals: 1,
    icon: Smile,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    subtitle: demoStage4.mood_label,
  },
  {
    title: "Sleep",
    value: demoStage6.sleep_hours,
    suffix: "hrs",
    decimals: 1,
    icon: Moon,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    subtitle: `Debt: ${demoStage6.sleep_debt}h`,
  },
  {
    title: "Calories Today",
    value: demoHistory[demoHistory.length - 1].calories,
    suffix: "kcal",
    decimals: 0,
    icon: Flame,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    subtitle: `TDEE: ${demoUser.tdee_kcal}`,
  },
  {
    title: "Gut Diversity (MDI)",
    value: demoStage3.microbiome_diversity_index,
    suffix: "",
    decimals: 2,
    icon: Dna,
    color: "text-violet-600",
    bgColor: "bg-violet-50",
    subtitle: "Fiber: 18.3g today",
  },
  {
    title: "Neuro Stress",
    value: demoStage6.neurological_stress_proxy,
    suffix: "",
    decimals: 2,
    icon: Brain,
    color: "text-rose-500",
    bgColor: "bg-rose-50",
    subtitle: `CRI: ${demoStage6.circadian_regularity_index}`,
  },
  {
    title: "Glucose Spike",
    value: demoStage5.spike_delta_mg_dl,
    suffix: "mg/dL",
    decimals: 0,
    icon: Activity,
    color: "text-sky-600",
    bgColor: "bg-sky-50",
    subtitle: demoStage5.estimated_glucose_spike,
  },
];

const trafficLight: { label: string; color: string; glow: string }[] = [
  { label: "Gut", color: demoStage3.microbiome_diversity_index > 0.6 ? "bg-emerald-500" : demoStage3.microbiome_diversity_index > 0.4 ? "bg-amber-400" : "bg-red-500", glow: "shadow-emerald-400/40" },
  { label: "Meta", color: demoStage5.energy_crash_probability < 0.4 ? "bg-emerald-500" : "bg-amber-400", glow: "shadow-amber-400/40" },
  { label: "Sleep", color: demoStage6.sleep_debt < 1 ? "bg-emerald-500" : demoStage6.sleep_debt < 2 ? "bg-amber-400" : "bg-red-500", glow: "shadow-emerald-400/40" },
];

const quickActions = [
  { label: "Log a Meal", href: "/meal/log", icon: UtensilsCrossed },
  { label: "View Trends", href: "/trends", icon: TrendingUp },
  { label: "Check Risk", href: "/risk", icon: ShieldCheck },
];

export default function DashboardPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-instrument text-3xl text-[var(--text)]">
            Good afternoon, {demoUser.name}
          </h1>
          <p className="text-sm text-[var(--muted)] mt-1 font-ibm">
            Day 30 of tracking · {demoHistory.length} entries logged
          </p>
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, type: "spring" }}
          className={`px-4 py-2 rounded-full text-sm font-medium ${
            (demoStage9.neurological_risk_level as string) === "none"
              ? "bg-emerald-50 text-emerald-700"
              : (demoStage9.neurological_risk_level as string) === "mild"
              ? "bg-amber-50 text-amber-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          Risk: {demoStage9.neurological_risk_level}
        </motion.div>
      </div>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-3 gap-4">
        {stats.map((s, i) => (
          <StatCard key={s.title} {...s} index={i} />
        ))}
      </div>

      {/* Middle Row: Traffic Light + Insights */}
      <div className="grid grid-cols-3 gap-4">
        {/* Traffic Light */}
        <ScrollReveal>
          <div className="bg-white rounded-2xl border border-[var(--border)] p-5">
            <h3 className="text-xs font-ibm uppercase tracking-wider text-[var(--muted)] mb-4">
              Health Status
            </h3>
            <div className="flex items-center gap-4 justify-center">
              {trafficLight.map((t) => (
                <div key={t.label} className="flex flex-col items-center gap-2">
                  <motion.div
                    className={`h-10 w-10 rounded-full ${t.color} shadow-lg ${t.glow}`}
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                  />
                  <span className="text-xs font-ibm text-[var(--muted)]">{t.label}</span>
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>

        {/* Top Insight */}
        <ScrollReveal delay={0.1} className="col-span-2">
          <div className="bg-white rounded-2xl border border-[var(--border)] p-5 h-full">
            <h3 className="text-xs font-ibm uppercase tracking-wider text-[var(--muted)] mb-3">
              Top Insight
            </h3>
            <p className="text-sm text-[var(--text)] leading-relaxed font-jakarta">
              {demoStage10.top_insight}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {demoStage10.insights.slice(0, 2).map((insight, i) => (
                <span
                  key={i}
                  className="inline-block text-xs bg-blue-50 text-blue-700 rounded-full px-3 py-1"
                >
                  {insight.slice(0, 60)}...
                </span>
              ))}
            </div>
          </div>
        </ScrollReveal>
      </div>

      {/* Quick Actions */}
      <ScrollReveal delay={0.2}>
        <div className="grid grid-cols-3 gap-4">
          {quickActions.map((action) => (
            <Link key={action.href} href={action.href}>
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="bg-white rounded-2xl border border-[var(--border)] p-5 flex items-center gap-4 cursor-pointer shimmer-hover group"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 group-hover:bg-blue-50 transition-colors">
                  <action.icon className="h-5 w-5 text-[var(--muted)] group-hover:text-[var(--blue)] transition-colors" strokeWidth={1.8} />
                </div>
                <span className="text-sm font-medium text-[var(--text)] flex-1">
                  {action.label}
                </span>
                <ArrowRight className="h-4 w-4 text-[var(--muted)] group-hover:text-[var(--blue)] group-hover:translate-x-1 transition-all" />
              </motion.div>
            </Link>
          ))}
        </div>
      </ScrollReveal>

      {/* Disclaimer */}
      <p className="text-xs text-[var(--muted)] text-center font-ibm">
        {demoStage10.disclaimer}
      </p>
    </div>
  );
}
