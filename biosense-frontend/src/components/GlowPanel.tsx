"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

export function GlowPanel({
  title,
  subtitle,
  right,
  tone = "emerald",
  children,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  tone?: "emerald" | "cyan" | "blue";
  children: ReactNode;
}) {
  const glow =
    tone === "cyan"
      ? "glow-cyan"
      : tone === "blue"
      ? "shadow-lg shadow-blue-500/20"
      : "glow-emerald";

  return (
    <motion.section
      initial={{ opacity: 0, y: 14, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className={`glass-surface ${glow} rounded-2xl`}
    >
      <header className="flex items-start justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.26em] text-white/50">
            {title}
          </div>
          {subtitle ? (
            <div className="mt-1 text-xs text-white/60">{subtitle}</div>
          ) : null}
        </div>
        {right ? <div className="pt-0.5">{right}</div> : null}
      </header>
      <div className="p-4">{children}</div>
    </motion.section>
  );
}

