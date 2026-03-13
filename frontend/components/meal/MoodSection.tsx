"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import MoodCharacter from "./MoodCharacter";
import { submitMood, USER_ID, TODAY } from "@/lib/api";
import { cn } from "@/lib/utils";

const EMOJIS = ["😄", "🙂", "😐", "😟", "😔", "😴", "🤯"] as const;

const COGNITIVE_OPTIONS = [
  { value: "clear", label: "Clear" },
  { value: "mild_fog", label: "Mild fog" },
  { value: "brain_fog", label: "Brain fog" },
] as const;

const ENERGY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "moderate", label: "Medium" },
  { value: "high", label: "High" },
] as const;

const ANXIETY_OPTIONS = [
  { value: "none", label: "None" },
  { value: "mild", label: "Low" },
  { value: "moderate", label: "Moderate" },
  { value: "high", label: "High" },
] as const;

const MOOD_LABEL_TO_INDEX: Record<string, number> = {
  very_happy: 0,
  happy: 1,
  neutral: 2,
  worried: 3,
  sad: 4,
  sleepy: 5,
  overwhelmed: 6,
};

interface Props {
  stage2Totals?: Record<string, unknown>;
  profile?: Record<string, unknown>;
  mealTimestamp?: string;
  onResult?: (data: { stage4: Record<string, unknown>; stage5: Record<string, unknown> }) => void;
}

export default function MoodSection({
  stage2Totals,
  profile,
  mealTimestamp,
  onResult,
}: Props) {
  const [selectedEmoji, setSelectedEmoji] = useState<number | null>(null);
  const [moodSlider, setMoodSlider] = useState(5);
  const [cognitiveState, setCognitiveState] = useState<"clear" | "mild_fog" | "brain_fog" | null>(null);
  const [energyLevel, setEnergyLevel] = useState<"low" | "moderate" | "high" | null>(null);
  const [anxietyLevel, setAnxietyLevel] = useState<"none" | "mild" | "moderate" | "high" | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ stage4: Record<string, unknown>; stage5: Record<string, unknown> } | null>(null);

  const canSubmit =
    selectedEmoji !== null &&
    cognitiveState !== null &&
    energyLevel !== null &&
    anxietyLevel !== null;

  async function handleSubmit() {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      const res = await submitMood({
        user_id: USER_ID,
        date: TODAY,
        meal_timestamp: mealTimestamp ?? new Date().toISOString(),
        stage2_totals: (stage2Totals ?? {}) as {
          calories_kcal?: number;
          carbs_g?: number;
          protein_g?: number;
          fat_g?: number;
          fiber_g?: number;
          glycemic_load?: string;
          tryptophan_mg?: number;
          omega3_mg?: number;
          iron_mg?: number;
          magnesium_mg?: number;
          b6_mg?: number;
          b12_mcg?: number;
          zinc_mg?: number;
        },
        stage0_profile: profile ?? {},
        mood_input: {
          mood_emoji: EMOJIS[selectedEmoji!],
          mood_rating: moodSlider,
          cognitive_state: cognitiveState!,
          energy_level: energyLevel!,
          anxiety_level: anxietyLevel!,
        },
      });
      setResult(res);
      onResult?.(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit mood");
    } finally {
      setLoading(false);
    }
  }

  const moodCharacterIndex =
    result?.stage4?.mood_label != null
      ? MOOD_LABEL_TO_INDEX[String(result.stage4.mood_label)] ?? 2
      : selectedEmoji ?? 2;

  return (
    <section className="space-y-6">
      <h3 className="font-instrument text-xl text-[var(--text)]">
        Mood & Cognition
      </h3>

      {!result ? (
        <div className="flex flex-col gap-6">
          {/* Emoji picker */}
          <div className="space-y-2">
            <p className="font-ibm text-xs text-[var(--muted)]">How are you feeling?</p>
            <div className="flex gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1">
              {EMOJIS.map((emoji, idx) => (
                <motion.button
                  key={emoji}
                  type="button"
                  onClick={() => setSelectedEmoji(idx)}
                  className={cn(
                    "relative flex h-10 w-10 items-center justify-center rounded-md text-xl transition-colors",
                    selectedEmoji === idx
                      ? "bg-[var(--blue)]/15 ring-2 ring-[var(--blue)]"
                      : "hover:bg-[var(--border)]/50"
                  )}
                  whileTap={{ scale: 0.95 }}
                  animate={{
                    scale: selectedEmoji === idx ? 1.1 : 1,
                  }}
                  transition={{ type: "spring", stiffness: 400, damping: 24 }}
                >
                  {emoji}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Mood slider */}
          <div className="w-full max-w-[240px] space-y-2">
            <div className="flex justify-between">
              <span className="font-ibm text-xs text-[var(--muted)]">
                Mood (1–10)
              </span>
              <span className="font-ibm text-sm text-[var(--text)]">
                {moodSlider}
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              value={moodSlider}
              onChange={(e) => setMoodSlider(Number(e.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-[var(--border)] [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--blue)] [&::-webkit-slider-thumb]:shadow-sm"
            />
          </div>

          {/* Cognitive state */}
          <div className="space-y-2">
            <span className="font-ibm text-xs text-[var(--muted)]">
              Cognitive state
            </span>
            <div className="flex gap-2">
              {COGNITIVE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setCognitiveState(opt.value)}
                  className={cn(
                    "rounded-lg border px-4 py-2 font-ibm text-sm transition-colors",
                    cognitiveState === opt.value
                      ? "border-[var(--blue)] bg-[var(--blue)]/10 text-[var(--blue)]"
                      : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--muted)]"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Energy level */}
          <div className="space-y-2">
            <span className="font-ibm text-xs text-[var(--muted)]">
              Energy level
            </span>
            <div className="flex gap-2">
              {ENERGY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setEnergyLevel(opt.value)}
                  className={cn(
                    "rounded-lg border px-4 py-2 font-ibm text-sm capitalize transition-colors",
                    energyLevel === opt.value
                      ? "border-[var(--blue)] bg-[var(--blue)]/10 text-[var(--blue)]"
                      : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--muted)]"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Anxiety level */}
          <div className="space-y-2">
            <span className="font-ibm text-xs text-[var(--muted)]">
              Anxiety level
            </span>
            <div className="flex gap-2">
              {ANXIETY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setAnxietyLevel(opt.value)}
                  className={cn(
                    "rounded-lg border px-4 py-2 font-ibm text-sm transition-colors",
                    anxietyLevel === opt.value
                      ? "border-[var(--blue)] bg-[var(--blue)]/10 text-[var(--blue)]"
                      : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--muted)]"
                  )}
                >
                  {opt.label}
                </button>
              ))}
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
              "Submit Mood"
            )}
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <MoodCharacter mood={moodCharacterIndex} />
          <div className="text-center">
            <p className="font-instrument text-lg text-[var(--text)]">
              {String(result.stage4.mood_label ?? "neutral").replace(/_/g, " ")}
            </p>
            <p className="font-ibm text-sm text-[var(--muted)]">
              Mood score: {String(result.stage4.mood_score ?? "—")}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
