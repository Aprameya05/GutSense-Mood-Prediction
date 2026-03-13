"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, Play, Pause } from "lucide-react";
import AnatomySvg from "@/components/journey/AnatomySvg";
import FoodParticle from "@/components/journey/FoodParticle";
import TimelineScrubber from "@/components/journey/TimelineScrubber";

const STAGE_INFO: Record<
  string,
  { title: string; description: string }
> = {
  mouth: {
    title: "Mouth",
    description: "Mechanical breakdown, saliva enzymes",
  },
  esophagus: {
    title: "Esophagus",
    description: "Peristalsis wave transport",
  },
  stomach: {
    title: "Stomach",
    description: "Acid digestion (pH 1.5-3.5), protein denaturation",
  },
  "small-intestine": {
    title: "Small Intestine",
    description: "Nutrient absorption: carbs, proteins, fats, vitamins",
  },
  "large-intestine": {
    title: "Large Intestine",
    description: "Water absorption, bacterial fermentation, SCFA production",
  },
};

function getStageId(progress: number): string {
  if (progress <= 0.1) return "mouth";
  if (progress <= 0.25) return "esophagus";
  if (progress <= 0.45) return "stomach";
  if (progress <= 0.7) return "small-intestine";
  return "large-intestine";
}

const ANIMATION_DURATION_MS = 15000;

export default function DigestiveJourneyPage() {
  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const startProgressRef = useRef<number>(0);

  const play = useCallback(() => {
    if (isPlaying) return;
    const start = progress >= 1 ? 0 : progress;
    if (progress >= 1) setProgress(0);
    startProgressRef.current = start;
    setIsPlaying(true);
    startTimeRef.current = performance.now();
    const remaining = 1 - start;
    const durationMs = Math.max(100, remaining * ANIMATION_DURATION_MS);

    const tick = (now: number) => {
      const elapsed = now - startTimeRef.current;
      const newProgress = Math.min(
        1,
        startProgressRef.current + (elapsed / durationMs) * remaining
      );
      setProgress(newProgress);
      if (newProgress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setIsPlaying(false);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [isPlaying, progress]);

  const pause = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const stageId = getStageId(progress);
  const stageInfo = STAGE_INFO[stageId];

  return (
    <div className="max-w-6xl mx-auto">
      {/* Back link */}
      <Link
        href="/meal/log"
        className="inline-flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--blue)] font-ibm mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Log Meal
      </Link>

      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10"
      >
        <h1 className="font-instrument text-3xl text-[var(--text)]">
          Digestive Journey
        </h1>
        <p className="text-sm text-[var(--muted)] mt-1 font-ibm">
          Watch your meal travel through the digestive system
        </p>
      </motion.div>

      <div className="flex flex-col lg:flex-row gap-10 items-start">
        {/* Left: Anatomy + Particle */}
        <div className="flex-1 flex flex-col items-center">
          <div className="relative w-full max-w-[400px] aspect-[4/7]">
            <AnatomySvg />
            <FoodParticle progress={progress} />
          </div>

          {/* Play / Pause */}
          <button
            onClick={isPlaying ? pause : play}
            className="mt-6 flex items-center gap-2 px-6 py-2.5 rounded-full bg-[var(--blue)] text-white font-medium hover:bg-[var(--blue)]/90 transition-colors"
          >
            {isPlaying ? (
              <>
                <Pause className="h-4 w-4" />
                Pause
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Play
              </>
            )}
          </button>

          {/* Timeline */}
          <div className="mt-8 w-full max-w-2xl pb-10">
            <TimelineScrubber progress={progress} onProgressChange={setProgress} />
          </div>
        </div>

        {/* Right: Stage info panel */}
        <motion.div
          layout
          className="w-full lg:w-80 flex-shrink-0"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="bg-white rounded-2xl border border-[var(--border)] p-6 sticky top-24">
            <h3 className="font-instrument text-lg text-[var(--text)] mb-2">
              What&apos;s happening
            </h3>
            <AnimatePresence mode="wait">
              <motion.div
                key={stageId}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <p className="font-medium text-[var(--text)] font-jakarta">
                  {stageInfo?.title}
                </p>
                <p className="text-sm text-[var(--muted)] mt-1 font-ibm">
                  {stageInfo?.description}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
