"use client";

import { useState, useMemo } from "react";
import { motion, LayoutGroup } from "framer-motion";
import GaugeChart from "@/components/shared/GaugeChart";
import { submitDigestion, USER_ID, TODAY } from "@/lib/api";
import { cn } from "@/lib/utils";

const BRISTOL_TYPES = [
  { id: 1, label: "1", desc: "Hard lumps" },
  { id: 2, label: "2", desc: "Lumpy sausage" },
  { id: 3, label: "3", desc: "Sausage, cracked" },
  { id: 4, label: "4", desc: "Ideal" },
  { id: 5, label: "5", desc: "Soft blobs" },
  { id: 6, label: "6", desc: "Mushy" },
  { id: 7, label: "7", desc: "Liquid" },
];

const BLOATING_OPTIONS = [
  { value: "none", label: "None" },
  { value: "mild", label: "Mild" },
  { value: "moderate", label: "Moderate" },
  { value: "severe", label: "Severe" },
] as const;

const GAS_OPTIONS = [
  { value: "none", label: "None" },
  { value: "mild", label: "Mild" },
  { value: "moderate", label: "Moderate" },
  { value: "severe", label: "Severe" },
] as const;

const DIGESTION_QUALITY_OPTIONS = [
  { value: "poor", label: "Poor" },
  { value: "fair", label: "Fair" },
  { value: "good", label: "Good" },
  { value: "excellent", label: "Excellent" },
] as const;

const PETRI_COLORS = [
  "#10B981", "#0D9488", "#14B8A6", "#2DD4BF", "#5EEAD4",
  "#0EA5E9", "#0284C7", "#0369A1", "#38BDF8", "#7DD3FC",
  "#059669", "#047857", "#0F766E", "#0D9488", "#2DD4BF",
];

function PetriDish() {
  const dots = useMemo(() => {
    return Array.from({ length: 18 }, (_, i) => ({
      id: i,
      x: 15 + Math.random() * 70,
      y: 15 + Math.random() * 70,
      size: 4 + Math.random() * 4,
      color: PETRI_COLORS[i % PETRI_COLORS.length],
      delay: Math.random() * 3,
      duration: 3 + Math.random() * 4,
    }));
  }, []);

  return (
    <div className="relative flex justify-center">
      <div
        className="relative h-[200px] w-[200px] overflow-hidden rounded-full border-2 border-[var(--border)] bg-[var(--surface)]/80"
        style={{ boxShadow: "inset 0 0 20px rgba(0,0,0,0.05)" }}
      >
        {dots.map((dot) => (
          <div
            key={dot.id}
            className="absolute rounded-full"
            style={{
              left: `${dot.x}%`,
              top: `${dot.y}%`,
              width: dot.size,
              height: dot.size,
              backgroundColor: dot.color,
              opacity: 0.7,
              animation: `petri-drift ${dot.duration}s ease-in-out infinite`,
              animationDelay: `${dot.delay}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

interface Stage3Data {
  microbiome_diversity_index: number;
  inflammation_risk_score: number;
  digestion_stability_score: number;
  [key: string]: unknown;
}

interface DigestionSectionProps {
  onResult?: (stage3: Stage3Data) => void;
}

export default function DigestionSection({ onResult }: DigestionSectionProps) {
  const [bristolType, setBristolType] = useState<number | null>(null);
  const [bloating, setBloating] = useState<"none" | "mild" | "moderate" | "severe" | null>(null);
  const [gasDiscomfort, setGasDiscomfort] = useState<"none" | "mild" | "moderate" | "severe" | null>(null);
  const [digestionQuality, setDigestionQuality] = useState<"poor" | "fair" | "good" | "excellent" | null>(null);
  const [fermentedFoodToday, setFermentedFoodToday] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stage3, setStage3] = useState<Stage3Data | null>(null);

  const canSubmit =
    bristolType !== null &&
    bloating !== null &&
    gasDiscomfort !== null &&
    digestionQuality !== null;

  async function handleSubmit() {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      const res = await submitDigestion({
        user_id: USER_ID,
        date: TODAY,
        digestion: {
          bloating: bloating!,
          stool_quality: bristolType!,
          gas_discomfort: gasDiscomfort!,
          digestion_quality: digestionQuality!,
          fermented_food_today: fermentedFoodToday,
        },
      });
      setStage3(res.stage3);
      onResult?.(res.stage3);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit digestion");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="space-y-6">
      <h3 className="font-instrument text-xl text-[var(--text)]">
        Digestion & Gut Health
      </h3>

      {!stage3 ? (
        <>
          {/* Bristol scale picker */}
          <div className="space-y-2">
            <p className="font-ibm text-xs text-[var(--muted)]">
              Bristol Stool Scale
            </p>
            <LayoutGroup>
              <div className="flex flex-wrap gap-2">
                {BRISTOL_TYPES.map((t) => (
                  <motion.button
                    key={t.id}
                    type="button"
                    onClick={() => setBristolType(t.id)}
                    className={cn(
                      "relative rounded-lg border px-3 py-2 font-ibm text-sm transition-colors",
                      bristolType === t.id
                        ? "border-[var(--blue)] bg-[var(--blue)]/10 text-[var(--blue)]"
                        : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--muted)]"
                    )}
                  >
                    {bristolType === t.id && (
                      <motion.div
                        layoutId="bristol-indicator"
                        className="absolute inset-0 rounded-lg bg-[var(--blue)]/15"
                        initial={false}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10 font-semibold">{t.label}</span>
                    <span className="relative z-10 ml-1.5 opacity-80">
                      {t.desc}
                    </span>
                  </motion.button>
                ))}
              </div>
            </LayoutGroup>
          </div>

          {/* Bloating */}
          <div className="space-y-2">
            <p className="font-ibm text-xs text-[var(--muted)]">Bloating</p>
            <div className="flex flex-wrap gap-2">
              {BLOATING_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setBloating(opt.value)}
                  className={cn(
                    "rounded-lg border px-4 py-2 font-ibm text-sm transition-colors",
                    bloating === opt.value
                      ? "border-[var(--blue)] bg-[var(--blue)]/10 text-[var(--blue)]"
                      : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--muted)]"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Gas discomfort */}
          <div className="space-y-2">
            <p className="font-ibm text-xs text-[var(--muted)]">Gas discomfort</p>
            <div className="flex flex-wrap gap-2">
              {GAS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setGasDiscomfort(opt.value)}
                  className={cn(
                    "rounded-lg border px-4 py-2 font-ibm text-sm transition-colors",
                    gasDiscomfort === opt.value
                      ? "border-[var(--blue)] bg-[var(--blue)]/10 text-[var(--blue)]"
                      : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--muted)]"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Digestion quality */}
          <div className="space-y-2">
            <p className="font-ibm text-xs text-[var(--muted)]">Digestion quality</p>
            <div className="flex flex-wrap gap-2">
              {DIGESTION_QUALITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setDigestionQuality(opt.value)}
                  className={cn(
                    "rounded-lg border px-4 py-2 font-ibm text-sm transition-colors",
                    digestionQuality === opt.value
                      ? "border-[var(--blue)] bg-[var(--blue)]/10 text-[var(--blue)]"
                      : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--muted)]"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Fermented food toggle */}
          <div className="space-y-2">
            <p className="font-ibm text-xs text-[var(--muted)]">Fermented food today</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFermentedFoodToday(true)}
                className={cn(
                  "rounded-lg border px-4 py-2 font-ibm text-sm transition-colors",
                  fermentedFoodToday
                    ? "border-[var(--blue)] bg-[var(--blue)]/10 text-[var(--blue)]"
                    : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--muted)]"
                )}
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => setFermentedFoodToday(false)}
                className={cn(
                  "rounded-lg border px-4 py-2 font-ibm text-sm transition-colors",
                  !fermentedFoodToday
                    ? "border-[var(--blue)] bg-[var(--blue)]/10 text-[var(--blue)]"
                    : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--muted)]"
                )}
              >
                No
              </button>
            </div>
          </div>

          {error && (
            <p className="font-ibm text-sm text-[var(--red)]">{error}</p>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit || loading}
            className={cn(
              "flex items-center justify-center gap-2 rounded-xl border border-[var(--blue)] bg-[var(--blue)] px-6 py-3 font-ibm text-sm font-medium text-white transition-colors",
              (!canSubmit || loading) && "cursor-not-allowed opacity-60"
            )}
          >
            {loading ? (
              <>
                <svg
                  className="h-4 w-4 animate-spin"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Submitting…
              </>
            ) : (
              "Submit Digestion"
            )}
          </button>
        </>
      ) : (
        <>
          {/* Gauges */}
          <div className="flex flex-wrap justify-around gap-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
            <GaugeChart
              value={stage3.microbiome_diversity_index}
              color="var(--green)"
              label="Microbiome Diversity"
            />
            <GaugeChart
              value={stage3.inflammation_risk_score}
              color="var(--amber)"
              label="Inflammation Risk"
            />
            <GaugeChart
              value={stage3.digestion_stability_score}
              color="var(--blue)"
              label="Digestion Stability"
            />
          </div>

          {/* Petri dish */}
          <div className="space-y-2">
            <p className="font-ibm text-xs text-[var(--muted)] text-center">
              Microbiome diversity visualization
            </p>
            <PetriDish />
          </div>
        </>
      )}
    </section>
  );
}
