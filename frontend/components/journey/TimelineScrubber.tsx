"use client";

const STAGES = [
  { id: "mouth", label: "Mouth", time: "0min", progress: 0 },
  { id: "esophagus", label: "Esophagus", time: "30s", progress: 0.1 },
  { id: "stomach", label: "Stomach", time: "2h", progress: 0.25 },
  { id: "small-intestine", label: "Small Intestine", time: "4h", progress: 0.45 },
  { id: "large-intestine", label: "Large Intestine", time: "12h", progress: 0.7 },
];

function getStageAtProgress(progress: number): (typeof STAGES)[0] {
  for (let i = STAGES.length - 1; i >= 0; i--) {
    if (progress >= STAGES[i].progress) return STAGES[i];
  }
  return STAGES[0];
}

function getElapsedTime(progress: number): string {
  if (progress <= 0.1) return "~0 min";
  if (progress <= 0.25) return "~30 sec";
  if (progress <= 0.45) return "~2 hours";
  if (progress <= 0.7) return "~4–6 hours";
  return "~12+ hours";
}

interface TimelineScrubberProps {
  progress: number;
  onProgressChange: (value: number) => void;
}

export default function TimelineScrubber({ progress, onProgressChange }: TimelineScrubberProps) {
  const stage = getStageAtProgress(progress);
  const elapsed = getElapsedTime(progress);

  return (
    <div className="journey-scrubber w-full max-w-2xl mx-auto space-y-3">
      <div className="flex justify-between items-center text-sm">
        <span className="font-ibm text-[var(--text)]">
          {stage.label} ({stage.time})
        </span>
        <span className="font-ibm text-[var(--muted)]">{elapsed} elapsed</span>
      </div>
      <div className="relative">
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={progress}
          onChange={(e) => onProgressChange(parseFloat(e.target.value))}
          className="w-full h-2 rounded-full appearance-none cursor-pointer bg-[var(--border)] accent-[var(--blue)]"
          style={{
            background: `linear-gradient(to right, var(--blue) 0%, var(--blue) ${progress * 100}%, var(--border) ${progress * 100}%, var(--border) 100%)`,
          }}
        />
        {/* Stage markers */}
        <div className="absolute -bottom-5 left-0 right-0 flex justify-between pointer-events-none px-1">
          {STAGES.map((s) => (
            <div
              key={s.id}
              className="absolute text-[10px] font-ibm text-[var(--muted)]"
              style={{ left: `${s.progress * 100}%`, transform: "translateX(-50%)" }}
            >
              {s.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
