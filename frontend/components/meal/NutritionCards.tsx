"use client";

import { motion } from "framer-motion";
import CountUp from "@/components/shared/CountUp";
import { demoStage2, nutrientRDA } from "@/lib/demoData";

const NUTRIENT_LABELS: Record<string, string> = {
  calories_kcal: "Calories",
  carbs_g: "Carbs",
  protein_g: "Protein",
  fat_g: "Fat",
  fiber_g: "Fiber",
  glycemic_load: "Glycemic Load",
  tryptophan_mg: "Tryptophan",
  omega3_mg: "Omega-3",
  iron_mg: "Iron",
  magnesium_mg: "Magnesium",
  b6_mg: "B6",
  b12_mcg: "B12",
  zinc_mg: "Zinc",
};

const NUTRIENT_ORDER: (keyof typeof demoStage2.totals)[] = [
  "calories_kcal",
  "carbs_g",
  "protein_g",
  "fat_g",
  "fiber_g",
  "glycemic_load",
  "tryptophan_mg",
  "omega3_mg",
  "iron_mg",
  "magnesium_mg",
  "b6_mg",
  "b12_mcg",
  "zinc_mg",
];

function getProgressColor(pct: number): string {
  if (pct >= 75) return "#10B981";
  if (pct >= 50) return "#F59E0B";
  return "#EF4444";
}

interface NutritionTotals {
  calories_kcal: number;
  carbs_g: number;
  protein_g: number;
  fat_g: number;
  fiber_g: number;
  glycemic_load: string;
  tryptophan_mg: number;
  omega3_mg: number;
  iron_mg: number;
  magnesium_mg: number;
  b6_mg: number;
  b12_mcg: number;
  zinc_mg: number;
}

interface Props {
  totals?: NutritionTotals;
}

export default function NutritionCards({ totals: propTotals }: Props) {
  const totals = propTotals ?? demoStage2.totals;

  const cards = NUTRIENT_ORDER.map((key) => {
    const value = totals[key];
    const rdaInfo = nutrientRDA[key as keyof typeof nutrientRDA];
    const label = NUTRIENT_LABELS[key] ?? key;
    const isGlycemic = key === "glycemic_load";
    const numericValue = typeof value === "number" ? value : 0;
    const rda = rdaInfo?.rda ?? 1;
    const unit = rdaInfo?.unit ?? "";
    const pct = isGlycemic ? 0 : Math.min(100, (numericValue / rda) * 100);

    return {
      key,
      label,
      value,
      numericValue,
      unit,
      rda,
      pct,
      isGlycemic,
    };
  });

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {cards.map((card, i) => (
        <motion.div
          key={card.key}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: i * 0.05 }}
          className="rounded-xl border border-[var(--border)] bg-white p-3 shadow-sm"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
            {card.label}
          </p>
          <div className="mt-1 font-ibm text-lg font-semibold text-[var(--text)]">
            {card.isGlycemic ? (
              <span className="capitalize">{String(card.value)}</span>
            ) : (
              <CountUp
                end={card.numericValue}
                decimals={card.unit === "mg" || card.unit === "µg" ? 1 : 0}
                suffix={` ${card.unit}`}
              />
            )}
          </div>
          {!card.isGlycemic && (
            <div className="mt-2">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--border)]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${card.pct}%` }}
                  transition={{ duration: 0.8, delay: 0.2 + i * 0.05 }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: getProgressColor(card.pct) }}
                />
              </div>
              <p className="mt-1 font-ibm text-xs text-[var(--muted)]">
                {card.pct.toFixed(0)}% RDA
              </p>
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
}
