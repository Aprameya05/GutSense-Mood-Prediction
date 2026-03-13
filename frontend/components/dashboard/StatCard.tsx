"use client";

import { motion } from "framer-motion";
import CountUp from "@/components/shared/CountUp";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export default function StatCard({
  title,
  value,
  suffix = "",
  prefix = "",
  decimals = 0,
  icon: Icon,
  color,
  bgColor,
  index = 0,
  subtitle,
}: {
  title: string;
  value: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  index?: number;
  subtitle?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        delay: index * 0.1,
        type: "spring",
        stiffness: 120,
        damping: 14,
      }}
      whileHover={{ y: -6, boxShadow: "0 16px 48px rgba(15,23,42,0.1)" }}
      className="bg-white rounded-2xl border border-[var(--border)] p-5 cursor-default"
    >
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-ibm uppercase tracking-wider text-[var(--muted)]">
            {title}
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <CountUp
              end={value}
              decimals={decimals}
              prefix={prefix}
              suffix=""
              className={cn("text-3xl font-semibold tracking-tight", color)}
            />
            {suffix && (
              <span className="text-sm text-[var(--muted)] font-ibm">{suffix}</span>
            )}
          </div>
          {subtitle && (
            <span className="text-xs text-[var(--muted)] mt-0.5">{subtitle}</span>
          )}
        </div>
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", bgColor)}>
          <Icon className="h-5 w-5" style={{ color: color.startsWith("text-") ? undefined : color }} strokeWidth={1.8} />
        </div>
      </div>
    </motion.div>
  );
}
