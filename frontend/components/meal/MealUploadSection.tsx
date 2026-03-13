"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Check, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MealApiResult {
  stage1: {
    food_items: string[];
    en_pred: string;
    confidence: number;
    source: string;
    descriptions?: string[];
    timestamp?: string;
  };
  stage2: {
    items: Array<Record<string, any>>;
    totals: {
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
    };
    timestamp?: string;
  };
}

type UploadState = "idle" | "scanning" | "scanned" | "error";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Props {
  onResult?: (result: MealApiResult) => void;
}

export default function MealUploadSection({ onResult }: Props) {
  const [state, setState] = useState<UploadState>("idle");
  const [identifiedName, setIdentifiedName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;
      setState("scanning");
      setErrorMsg("");

      const formData = new FormData();
      formData.append("image", acceptedFiles[0]);
      formData.append("user_id", "balaji_001");

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 120_000);

        const res = await fetch(`${API_BASE}/api/meals/log`, {
          method: "POST",
          body: formData,
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(
            err.detail?.error || (typeof err.detail === "string" ? err.detail : `Server error ${res.status}`)
          );
        }

        const data = await res.json();

        const totalsRaw = data.stage2?.totals || {};
        const normalized: MealApiResult = {
          stage1: data.stage1,
          stage2: {
            items: data.stage2?.items || [],
            totals: {
              calories_kcal: totalsRaw.calories_kcal ?? 0,
              carbs_g: totalsRaw.carbs_g ?? totalsRaw.carbohydrates_g ?? 0,
              protein_g: totalsRaw.protein_g ?? 0,
              fat_g: totalsRaw.fat_g ?? 0,
              fiber_g: totalsRaw.fiber_g ?? 0,
              glycemic_load: totalsRaw.glycemic_load ?? "unknown",
              tryptophan_mg: totalsRaw.tryptophan_mg ?? 0,
              omega3_mg: totalsRaw.omega3_mg ?? 0,
              iron_mg: totalsRaw.iron_mg ?? 0,
              magnesium_mg: totalsRaw.magnesium_mg ?? 0,
              b6_mg: totalsRaw.b6_mg ?? totalsRaw.vitamin_b6_mg ?? 0,
              b12_mcg: totalsRaw.b12_mcg ?? totalsRaw.vitamin_b12_ug ?? 0,
              zinc_mg: totalsRaw.zinc_mg ?? 0,
            },
            timestamp: data.stage2?.timestamp,
          },
        };

        const foods = normalized.stage1.food_items;
        setIdentifiedName(
          foods.length > 0 ? foods.join(", ") : normalized.stage1.en_pred
        );
        setState("scanned");
        onResult?.(normalized);
      } catch (err: any) {
        console.error("Meal upload failed:", err);
        if (err.name === "AbortError") {
          setErrorMsg("Request timed out — the pipeline is still loading. Try again.");
        } else {
          setErrorMsg(err.message || "Failed to identify meal");
        }
        setState("error");
      }
    },
    [onResult]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".png", ".jpg", ".jpeg", ".webp"] },
    maxFiles: 1,
    disabled: state === "scanning",
  });

  const rootProps = getRootProps();

  const reset = () => {
    setState("idle");
    setIdentifiedName("");
    setErrorMsg("");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, type: "spring", stiffness: 100 }}
      className="w-full"
    >
      <AnimatePresence mode="wait">
        {state === "scanned" ? (
          <motion.div
            key="scanned"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-3 rounded-2xl border border-[var(--green)]/40 bg-[var(--green)]/5 px-6 py-4"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--green)] text-white">
              <Check className="h-5 w-5" strokeWidth={2.5} />
            </div>
            <span className="font-instrument text-lg text-[var(--text)] flex-1">
              {identifiedName} identified
            </span>
            <button
              onClick={reset}
              className="text-xs text-[var(--muted)] hover:text-[var(--text)] font-ibm underline"
            >
              Upload another
            </button>
          </motion.div>
        ) : state === "error" ? (
          <motion.div
            key="error"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-3 rounded-2xl border border-[var(--red)]/40 bg-[var(--red)]/5 px-6 py-4"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--red)] text-white">
              <AlertCircle className="h-5 w-5" strokeWidth={2.5} />
            </div>
            <div className="flex-1">
              <span className="font-instrument text-lg text-[var(--text)]">
                Identification failed
              </span>
              <p className="text-xs text-[var(--muted)] font-ibm mt-0.5">{errorMsg}</p>
            </div>
            <button
              onClick={reset}
              className="text-xs text-[var(--muted)] hover:text-[var(--text)] font-ibm underline"
            >
              Try again
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              {...rootProps}
              className={cn(
                "relative cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed px-8 py-16 transition-colors",
                isDragActive
                  ? "border-[var(--blue)] bg-[var(--blue)]/5"
                  : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--blue)]/60 hover:bg-[var(--blue)]/5",
                state === "scanning" && "pointer-events-none"
              )}
            >
              <input {...getInputProps()} />
              {state === "scanning" && (
                <div
                  className="absolute left-0 right-0 z-20 h-1 bg-[var(--blue)] shadow-[0_0_12px_var(--blue)]"
                  style={{ animation: "scan-beam 1.5s ease-in-out infinite" }}
                />
              )}
              <div className="relative z-10 flex flex-col items-center gap-4">
                <div
                  className={cn(
                    "rounded-full p-3 transition-colors",
                    isDragActive || state === "scanning"
                      ? "bg-[var(--blue)]/20 text-[var(--blue)]"
                      : "bg-[var(--border)]/50 text-[var(--muted)]"
                  )}
                >
                  {state === "scanning" ? (
                    <Loader2 className="h-8 w-8 animate-spin" />
                  ) : (
                    <Upload className="h-8 w-8" />
                  )}
                </div>
                <p className="text-center font-jakarta text-[var(--text)]">
                  {state === "scanning"
                    ? "Identifying your meal... (this may take 10-15s on first use)"
                    : "Drop meal image or click to upload"}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
