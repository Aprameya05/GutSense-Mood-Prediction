"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import {
  analyzeMealWithBioSense,
  BioSenseAnalysis,
} from "@/lib/biosenseClient";

type HistoryEntry = {
  id: string;
  createdAt: string;
  label: string;
  healthScore: number;
};

type BioSenseContextValue = {
  analysis: BioSenseAnalysis | null;
  isAnalyzing: boolean;
  error: string | null;
  history: HistoryEntry[];
  runAnalysis: (file: File) => Promise<void>;
};

const BioSenseContext = createContext<BioSenseContextValue | undefined>(
  undefined,
);

export function BioSenseProvider({ children }: { children: ReactNode }) {
  const [analysis, setAnalysis] = useState<BioSenseAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  async function runAnalysis(file: File) {
    setIsAnalyzing(true);
    setError(null);
    try {
      const result = await analyzeMealWithBioSense(file);
      setAnalysis(result);

      const label = result.foods?.[0]?.food_item || "Meal";
      const id = `${Date.now()}`;
      const createdAt = new Date().toISOString();

      setHistory((prev) => [
        {
          id,
          createdAt,
          label,
          healthScore: result.health.overall_score,
        },
        ...prev,
      ]);
    } catch (err: any) {
      setError(err?.message ?? "Failed to run BioSense pipeline.");
      setAnalysis(null);
    } finally {
      setIsAnalyzing(false);
    }
  }

  return (
    <BioSenseContext.Provider
      value={{ analysis, isAnalyzing, error, history, runAnalysis }}
    >
      {children}
    </BioSenseContext.Provider>
  );
}

export function useBioSense() {
  const ctx = useContext(BioSenseContext);
  if (!ctx) {
    throw new Error("useBioSense must be used within BioSenseProvider");
  }
  return ctx;
}

