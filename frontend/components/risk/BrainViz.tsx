"use client";

import { motion } from "framer-motion";

interface BrainVizProps {
  stressProxy: number;
  activeFlags: string[];
}

export default function BrainViz({ stressProxy, activeFlags }: BrainVizProps) {
  const activeRegion = activeFlags.includes("b12_deficiency_signal")
    ? "frontal"
    : null;

  return (
    <div className="relative w-[300px] h-[250px] mx-auto">
      <svg viewBox="0 0 300 250" className="w-full h-full">
        {/* Brain side-view silhouette - simplified outline */}
        <path
          d="M 80 50 Q 150 25 220 55 Q 250 95 235 140 Q 215 185 165 210 Q 115 225 75 205 Q 40 175 45 120 Q 50 75 80 50 Z"
          fill="#F1F5F9"
          stroke="#CBD5E1"
          strokeWidth={2}
        />
        {/* Frontal lobe (cognitive) - top front */}
        <g>
          {activeRegion === "frontal" ? (
            <motion.ellipse
              cx="130"
              cy="75"
              rx="45"
              ry="35"
              fill="#F59E0B"
              opacity={0.5}
              animate={{ opacity: [0.35, 0.6, 0.35] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
          ) : (
            <ellipse
              cx="130"
              cy="75"
              rx="45"
              ry="35"
              fill="#E2E8F0"
              stroke="#CBD5E1"
              strokeWidth={1}
            />
          )}
        </g>
        {/* Temporal lobe (mood) - middle side */}
        <ellipse
          cx="75"
          cy="130"
          rx="35"
          ry="50"
          fill="#E2E8F0"
          stroke="#CBD5E1"
          strokeWidth={1}
        />
        {/* Parietal lobe (sensory) - top back */}
        <ellipse
          cx="195"
          cy="120"
          rx="40"
          ry="45"
          fill="#E2E8F0"
          stroke="#CBD5E1"
          strokeWidth={1}
        />
        {/* Occipital lobe (sleep) - back */}
        <ellipse
          cx="200"
          cy="185"
          rx="35"
          ry="40"
          fill="#E2E8F0"
          stroke="#CBD5E1"
          strokeWidth={1}
        />
      </svg>
    </div>
  );
}
