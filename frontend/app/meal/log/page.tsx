"use client";

import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import MealUploadSection, { type MealApiResult } from "@/components/meal/MealUploadSection";
import FoodReviewSection from "@/components/meal/FoodReviewSection";
import NutritionWheel from "@/components/meal/NutritionWheel";
import NutritionCards from "@/components/meal/NutritionCards";
import DigestionSection from "@/components/meal/DigestionSection";
import MoodSection from "@/components/meal/MoodSection";
import GlucoseCurve from "@/components/meal/GlucoseCurve";
import MealSummary from "@/components/meal/MealSummary";
import ScrollReveal from "@/components/shared/ScrollReveal";
import Link from "next/link";
import { MapPin } from "lucide-react";

const sections = [
  { id: "upload", label: "Upload" },
  { id: "review", label: "Review" },
  { id: "nutrition", label: "Nutrition" },
  { id: "digestion", label: "Digestion" },
  { id: "mood", label: "Mood" },
  { id: "glucose", label: "Glucose" },
  { id: "summary", label: "Summary" },
];

export default function MealLogPage() {
  const [activeSection, setActiveSection] = useState("upload");
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [apiResult, setApiResult] = useState<MealApiResult | null>(null);

  const scrollTo = (id: string) => {
    setActiveSection(id);
    sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleMealResult = useCallback((result: MealApiResult) => {
    setApiResult(result);
  }, []);

  const stage2Totals = apiResult?.stage2?.totals ?? undefined;

  return (
    <div className="max-w-5xl mx-auto">
      {/* Sticky section nav */}
      <div className="sticky top-0 z-30 bg-[var(--bg)]/95 backdrop-blur-sm border-b border-[var(--border)] -mx-8 px-8 py-3 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => scrollTo(s.id)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-full transition-all",
                  activeSection === s.id
                    ? "bg-[var(--blue)] text-white"
                    : "text-[var(--muted)] hover:bg-slate-100"
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
          <Link
            href="/meal/journey"
            className="flex items-center gap-1.5 text-xs text-[var(--blue)] hover:underline font-medium"
          >
            <MapPin className="h-3.5 w-3.5" />
            Digestive Journey
          </Link>
        </div>
      </div>

      {/* Page title */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="font-instrument text-3xl text-[var(--text)]">Log Meal</h1>
        <p className="text-sm text-[var(--muted)] mt-1 font-ibm">
          Analyze your meal through 6 pipeline stages
        </p>
      </motion.div>

      {/* Sections */}
      <div className="space-y-12">
        <div ref={(el) => { sectionRefs.current["upload"] = el; }}>
          <ScrollReveal>
            <MealUploadSection onResult={handleMealResult} />
          </ScrollReveal>
        </div>

        <div ref={(el) => { sectionRefs.current["review"] = el; }}>
          <ScrollReveal delay={0.05}>
            <FoodReviewSection
              foodItems={apiResult?.stage1.food_items}
              confidence={apiResult?.stage1.confidence}
              source={apiResult?.stage1.source}
              descriptions={apiResult?.stage1.descriptions}
            />
          </ScrollReveal>
        </div>

        <div ref={(el) => { sectionRefs.current["nutrition"] = el; }}>
          <ScrollReveal delay={0.05}>
            <div className="bg-white rounded-2xl border border-[var(--border)] p-6">
              <h2 className="font-instrument text-xl text-[var(--text)] mb-6">
                Nutritional Profile
              </h2>
              <div className="flex flex-col items-center gap-8">
                <NutritionWheel totals={stage2Totals} />
                <NutritionCards totals={stage2Totals} />
              </div>
            </div>
          </ScrollReveal>
        </div>

        <div ref={(el) => { sectionRefs.current["digestion"] = el; }}>
          <ScrollReveal delay={0.05}>
            <DigestionSection />
          </ScrollReveal>
        </div>

        <div ref={(el) => { sectionRefs.current["mood"] = el; }}>
          <ScrollReveal delay={0.05}>
            <MoodSection />
          </ScrollReveal>
        </div>

        <div ref={(el) => { sectionRefs.current["glucose"] = el; }}>
          <ScrollReveal delay={0.05}>
            <div className="bg-white rounded-2xl border border-[var(--border)] p-6">
              <h2 className="font-instrument text-xl text-[var(--text)] mb-6">
                Glucose Response
              </h2>
              <GlucoseCurve />
            </div>
          </ScrollReveal>
        </div>

        <div ref={(el) => { sectionRefs.current["summary"] = el; }}>
          <ScrollReveal delay={0.05}>
            <MealSummary />
          </ScrollReveal>
        </div>
      </div>
    </div>
  );
}
