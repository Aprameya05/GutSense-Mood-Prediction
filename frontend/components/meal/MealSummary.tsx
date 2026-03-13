"use client";

import { useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Flame, Activity, Dna, Smile, TrendingUp, AlertTriangle } from "lucide-react";

const PARTICLE_COLORS = [
  "#0EA5E9",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#F43F5E",
];

function createParticleBurst(
  buttonRect: DOMRect,
  onComplete: () => void
): void {
  const canvas = document.createElement("canvas");
  canvas.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 9999;
  `;
  document.body.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    canvas.remove();
    onComplete();
    return;
  }

  const centerX = buttonRect.left + buttonRect.width / 2;
  const centerY = buttonRect.top + buttonRect.height / 2;

  const particleCount = 40;
  const particles: Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    color: string;
    size: number;
    life: number;
    decay: number;
  }> = [];

  for (let i = 0; i < particleCount; i++) {
    const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.5;
    const speed = 3 + Math.random() * 6;
    particles.push({
      x: centerX,
      y: centerY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
      size: 4 + Math.random() * 6,
      life: 1,
      decay: 0.015 + Math.random() * 0.01,
    });
  }

  let animationId: number;

  const animate = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let allDead = true;
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.15;
      p.life -= p.decay;

      if (p.life > 0) {
        allDead = false;
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    if (!allDead) {
      animationId = requestAnimationFrame(animate);
    } else {
      canvas.remove();
      onComplete();
    }
  };

  animationId = requestAnimationFrame(animate);
}

function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, " ");
}

interface Props {
  stage1?: unknown;
  stage2?: {
    totals?: {
      calories_kcal?: number;
      glycemic_load?: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  stage3?: {
    microbiome_diversity_index?: number;
    [key: string]: unknown;
  };
  stage4?: {
    mood_label?: string;
    emoji_used?: string;
    [key: string]: unknown;
  };
  stage5?: {
    spike_delta_mg_dl?: number;
    energy_crash_probability?: number;
    [key: string]: unknown;
  };
  onSave?: () => void | Promise<void>;
}

export default function MealSummary({
  stage1,
  stage2,
  stage3,
  stage4,
  stage5,
  onSave,
}: Props) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const calories =
    stage2?.totals?.calories_kcal != null
      ? `${stage2.totals.calories_kcal} kcal`
      : "—";
  const glycemicLoad =
    stage2?.totals?.glycemic_load != null
      ? capitalize(String(stage2.totals.glycemic_load))
      : "—";
  const gutScore =
    stage3?.microbiome_diversity_index != null
      ? `${stage3.microbiome_diversity_index.toFixed(2)} MDI`
      : "—";
  const mood =
    stage4?.mood_label != null && stage4?.emoji_used != null
      ? `${capitalize(String(stage4.mood_label))} (${stage4.emoji_used})`
      : "—";
  const glucose =
    stage5?.spike_delta_mg_dl != null
      ? `+${stage5.spike_delta_mg_dl} mg/dL`
      : "—";
  const crashRisk =
    stage5?.energy_crash_probability != null
      ? `${Math.round(stage5.energy_crash_probability * 100)}%`
      : "—";

  const summaryItems = [
    { key: "calories", label: "Calories", value: calories, icon: Flame, color: "bg-amber-100 text-amber-600" },
    { key: "glycemic", label: "Glycemic Load", value: glycemicLoad, icon: Activity, color: "bg-sky-100 text-sky-600" },
    { key: "gut", label: "Gut Score", value: gutScore, icon: Dna, color: "bg-emerald-100 text-emerald-600" },
    { key: "mood", label: "Mood", value: mood, icon: Smile, color: "bg-violet-100 text-violet-600" },
    { key: "glucose", label: "Glucose", value: glucose, icon: TrendingUp, color: "bg-rose-100 text-rose-600" },
    { key: "crash", label: "Crash Risk", value: crashRisk, icon: AlertTriangle, color: "bg-orange-100 text-orange-600" },
  ];

  const handleSave = useCallback(async () => {
    if (isSaved || isSaving) return;
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;

    setIsSaving(true);
    try {
      const result = onSave?.();
      if (result instanceof Promise) {
        await result;
      }
      createParticleBurst(rect, () => {
        setIsSaved(true);
        toast.success("Meal logged successfully!");
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save meal");
    } finally {
      setIsSaving(false);
    }
  }, [isSaved, isSaving, onSave]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, type: "spring", stiffness: 100 }}
      className="rounded-2xl border border-[var(--border)] bg-white p-6"
    >
      <h3 className="mb-4 font-instrument text-xl text-[var(--text)]">
        Meal Summary
      </h3>
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {summaryItems.map((item, i) => (
          <motion.div
            key={item.key}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05, type: "spring", stiffness: 300 }}
            className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
          >
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${item.color}`}
            >
              <item.icon className="h-4 w-4" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-ibm text-[var(--muted)]">{item.label}</p>
              <p className="truncate text-sm font-medium text-[var(--text)]">
                {item.value}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
      <div className="flex justify-center">
        <motion.button
          ref={buttonRef}
          onClick={() => void handleSave()}
          disabled={isSaved || isSaving}
          whileHover={!isSaved && !isSaving ? { scale: 1.02 } : {}}
          whileTap={!isSaved && !isSaving ? { scale: 0.98 } : {}}
          className={`rounded-xl px-8 py-4 font-medium transition-colors ${
            isSaved
              ? "cursor-default bg-emerald-100 text-emerald-700"
              : "bg-[var(--blue)] text-white hover:bg-blue-600"
          }`}
        >
          {isSaved
            ? "Meal logged successfully!"
            : isSaving
              ? "Saving…"
              : "Save Meal Log"}
        </motion.button>
      </div>
    </motion.div>
  );
}
