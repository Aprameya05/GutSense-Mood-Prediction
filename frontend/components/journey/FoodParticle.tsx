"use client";

import { motion } from "framer-motion";
import { getPositionAtProgress } from "./AnatomySvg";

interface FoodParticleProps {
  progress: number;
}

function getParticleStyle(progress: number): { color: string; size: number } {
  if (progress <= 0.1) return { color: "#F97316", size: 12 };
  if (progress <= 0.25) return { color: "#F97316", size: 10 };
  if (progress <= 0.45) return { color: "#84CC16", size: 8 };
  if (progress <= 0.7) return { color: "#F87171", size: 6 };
  return { color: "#92400E", size: 5 };
}

const SVG_WIDTH = 400;
const SVG_HEIGHT = 700;

export default function FoodParticle({ progress }: FoodParticleProps) {
  const pos = getPositionAtProgress(progress);
  const { color, size } = getParticleStyle(progress);
  const showAbsorptionDots = progress > 0.45 && progress <= 0.7;
  const leftPct = (pos.x / SVG_WIDTH) * 100;
  const topPct = (pos.y / SVG_HEIGHT) * 100;

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Main particle */}
      <motion.div
        className="absolute rounded-full -translate-x-1/2 -translate-y-1/2"
        style={{
          left: `${leftPct}%`,
          top: `${topPct}%`,
          width: size,
          height: size,
          backgroundColor: color,
          boxShadow: `0 0 ${size}px ${color}40`,
        }}
        animate={{ x: 0, y: 0 }}
        transition={{ type: "tween", duration: 0.15 }}
      />

      {/* Stomach: multiple smaller particles */}
      {progress > 0.25 && progress <= 0.45 && (
        <>
          <motion.div
            className="absolute rounded-full bg-amber-400"
            style={{
              left: `calc(${leftPct}% - 4px + 8px)`,
              top: `calc(${topPct}% - 4px)`,
              width: 4,
              height: 4,
            }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 0.8, scale: 1 }}
            transition={{ duration: 0.2 }}
          />
          <motion.div
            className="absolute rounded-full bg-amber-400"
            style={{
              left: `calc(${leftPct}% - 10px)`,
              top: `calc(${topPct}% + 1px)`,
              width: 4,
              height: 4,
            }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 0.8, scale: 1 }}
            transition={{ duration: 0.2, delay: 0.05 }}
          />
        </>
      )}

      {/* Small intestine: nutrient absorption dots peeling off */}
      {showAbsorptionDots && (
        <>
          <motion.div
            className="absolute rounded-full bg-[var(--blue)]"
            style={{
              left: `calc(${leftPct}% + 13px)`,
              top: `calc(${topPct}% - 12px)`,
              width: 3,
              height: 3,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            transition={{ duration: 0.3 }}
          />
          <motion.div
            className="absolute rounded-full bg-[var(--green)]"
            style={{
              left: `calc(${leftPct}% - 14px)`,
              top: `calc(${topPct}% + 6px)`,
              width: 3,
              height: 3,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          />
        </>
      )}
    </div>
  );
}
