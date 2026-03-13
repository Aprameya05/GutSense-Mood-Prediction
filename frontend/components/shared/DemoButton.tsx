"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Check, Loader2 } from "lucide-react";

const STAGES = [
  { id: 0, label: "User Profile", duration: 400 },
  { id: 1, label: "Food Identification", duration: 1200 },
  { id: 2, label: "Nutritional Calibration", duration: 800 },
  { id: 3, label: "Gut Microbiome Proxy", duration: 600 },
  { id: 4, label: "Mood & Cognition", duration: 500 },
  { id: 5, label: "Metabolic Response", duration: 600 },
  { id: 6, label: "Sleep & Physiology", duration: 500 },
  { id: 7, label: "Pattern Analysis", duration: 700 },
  { id: 8, label: "Baseline Creation", duration: 400 },
  { id: 9, label: "Risk Detection", duration: 500 },
  { id: 10, label: "Insight Generation", duration: 1000 },
];

export default function DemoButton() {
  const [running, setRunning] = useState(false);
  const [currentStage, setCurrentStage] = useState(-1);
  const [completedStages, setCompletedStages] = useState<number[]>([]);
  const [showPanel, setShowPanel] = useState(false);

  useEffect(() => {
    if (!running || currentStage >= STAGES.length) return;

    if (currentStage === -1) {
      setCurrentStage(0);
      return;
    }

    const timer = setTimeout(() => {
      setCompletedStages((prev) => [...prev, STAGES[currentStage].id]);
      if (currentStage < STAGES.length - 1) {
        setCurrentStage((prev) => prev + 1);
      } else {
        setRunning(false);
      }
    }, STAGES[currentStage].duration);

    return () => clearTimeout(timer);
  }, [running, currentStage]);

  const startDemo = () => {
    setRunning(true);
    setCurrentStage(-1);
    setCompletedStages([]);
    setShowPanel(true);
  };

  const allDone = completedStages.length === STAGES.length;

  return (
    <>
      {/* Floating button */}
      <motion.button
        onClick={startDemo}
        disabled={running}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={!running ? { scale: 1.05 } : {}}
        whileTap={!running ? { scale: 0.95 } : {}}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-[var(--blue)] px-5 py-3 text-white text-sm font-medium shadow-lg shadow-blue-200/50 disabled:opacity-70"
      >
        {running ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : allDone ? (
          <Check className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
        {running ? "Running Pipeline..." : allDone ? "Demo Complete" : "Run Dosa Demo"}
      </motion.button>

      {/* Stage progress panel */}
      <AnimatePresence>
        {showPanel && (
          <motion.div
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 60 }}
            className="fixed bottom-20 right-6 z-50 w-64 rounded-2xl border border-[var(--border)] bg-white p-4 shadow-xl"
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-ibm uppercase tracking-wider text-[var(--muted)]">
                Pipeline Stages
              </h4>
              <button
                onClick={() => setShowPanel(false)}
                className="text-xs text-[var(--muted)] hover:text-[var(--text)]"
              >
                Hide
              </button>
            </div>
            <div className="space-y-1.5">
              {STAGES.map((stage) => {
                const isComplete = completedStages.includes(stage.id);
                const isCurrent = currentStage >= 0 && STAGES[currentStage]?.id === stage.id && running;

                return (
                  <motion.div
                    key={stage.id}
                    initial={{ opacity: 0.5 }}
                    animate={{
                      opacity: isComplete || isCurrent ? 1 : 0.5,
                    }}
                    className="flex items-center gap-2"
                  >
                    <div className="relative flex h-5 w-5 items-center justify-center">
                      {isComplete ? (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500"
                        >
                          <Check className="h-3 w-3 text-white" strokeWidth={3} />
                        </motion.div>
                      ) : isCurrent ? (
                        <Loader2 className="h-4 w-4 text-[var(--blue)] animate-spin" />
                      ) : (
                        <div className="h-2 w-2 rounded-full bg-slate-200" />
                      )}
                    </div>
                    <span
                      className={`text-xs ${
                        isComplete
                          ? "text-emerald-700 font-medium"
                          : isCurrent
                          ? "text-[var(--blue)] font-medium"
                          : "text-[var(--muted)]"
                      }`}
                    >
                      {stage.label}
                    </span>
                  </motion.div>
                );
              })}
            </div>
            {allDone && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 pt-3 border-t border-[var(--border)] text-center"
              >
                <span className="text-xs text-emerald-600 font-medium">
                  All 11 stages complete
                </span>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
