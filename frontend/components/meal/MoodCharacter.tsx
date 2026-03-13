"use client";

import { motion } from "framer-motion";

const MOOD_CONFIG = [
  { eyesScale: 1.15, browAngle: 12, mouthCurve: 0.4, auraColor: "var(--green)" },   // 0: 😄 very happy
  { eyesScale: 1.05, browAngle: 6, mouthCurve: 0.2, auraColor: "var(--green)" },    // 1: 🙂 happy
  { eyesScale: 1, browAngle: 0, mouthCurve: 0, auraColor: "var(--muted)" },         // 2: 😐 neutral
  { eyesScale: 0.9, browAngle: -4, mouthCurve: -0.15, auraColor: "var(--amber)" }, // 3: 😟 worried
  { eyesScale: 0.8, browAngle: -8, mouthCurve: -0.35, auraColor: "var(--red)" },    // 4: 😢 sad
  { eyesScale: 0.85, browAngle: -12, mouthCurve: -0.25, auraColor: "var(--red)" }, // 5: 😡 angry
  { eyesScale: 1.1, browAngle: 8, mouthCurve: -0.1, auraColor: "var(--red)" },      // 6: 🤯 overwhelmed
];

export default function MoodCharacter({ mood = 1 }: { mood?: number }) {
  const idx = Math.max(0, Math.min(6, Math.round(mood)));
  const config = MOOD_CONFIG[idx];

  return (
    <div className="relative flex h-[160px] w-[160px] items-center justify-center">
      <svg
        width={160}
        height={160}
        viewBox="0 0 160 160"
        className="overflow-visible"
      >
        {/* Aura / halo behind face */}
        <motion.circle
          cx={80}
          cy={80}
          r={70}
          fill="none"
          stroke={config.auraColor}
          strokeWidth={2}
          strokeOpacity={0.4}
          initial={false}
          animate={{
            stroke: config.auraColor,
            strokeOpacity: 0.4,
          }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />

        {/* Face outline - minimal, no fill */}
        <circle
          cx={80}
          cy={80}
          r={50}
          fill="none"
          stroke="var(--text)"
          strokeWidth={1.5}
          strokeOpacity={0.6}
        />

        {/* Left eye */}
        <motion.g
          transform="translate(60, 70)"
          initial={false}
          animate={{ scale: config.eyesScale }}
          transition={{ type: "spring", stiffness: 300, damping: 24 }}
        >
          <circle
            r={6}
            fill="none"
            stroke="var(--text)"
            strokeWidth={1.5}
            strokeOpacity={0.8}
          />
        </motion.g>

        {/* Right eye */}
        <motion.g
          transform="translate(100, 70)"
          initial={false}
          animate={{ scale: config.eyesScale }}
          transition={{ type: "spring", stiffness: 300, damping: 24 }}
        >
          <circle
            r={6}
            fill="none"
            stroke="var(--text)"
            strokeWidth={1.5}
            strokeOpacity={0.8}
          />
        </motion.g>

        {/* Left eyebrow */}
        <motion.path
          d="M 55 58 Q 60 52 65 58"
          fill="none"
          stroke="var(--text)"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeOpacity={0.8}
          initial={false}
          animate={{
            d: `M 55 ${58 - config.browAngle * 0.5} Q 60 ${52 - config.browAngle} 65 ${58 - config.browAngle * 0.5}`,
          }}
          transition={{ type: "spring", stiffness: 300, damping: 24 }}
        />

        {/* Right eyebrow */}
        <motion.path
          d="M 95 58 Q 100 52 105 58"
          fill="none"
          stroke="var(--text)"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeOpacity={0.8}
          initial={false}
          animate={{
            d: `M 95 ${58 - config.browAngle * 0.5} Q 100 ${52 - config.browAngle} 105 ${58 - config.browAngle * 0.5}`,
          }}
          transition={{ type: "spring", stiffness: 300, damping: 24 }}
        />

        {/* Mouth - curves up for happy, straight for neutral, down for sad */}
        <motion.path
          fill="none"
          stroke="var(--text)"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeOpacity={0.8}
          initial={false}
          animate={{
            d: `M 55 100 Q 80 ${100 + config.mouthCurve * 25} 105 100`,
          }}
          transition={{ type: "spring", stiffness: 300, damping: 24 }}
        />
      </svg>
    </div>
  );
}
