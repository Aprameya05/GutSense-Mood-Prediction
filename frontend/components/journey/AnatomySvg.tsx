"use client";

const SVG_WIDTH = 400;
const SVG_HEIGHT = 700;

/** Key points along the digestive path for particle animation (x, y) */
export const DIGESTIVE_PATH: Array<{ progress: number; x: number; y: number }> = [
  { progress: 0, x: 200, y: 35 },
  { progress: 0.1, x: 200, y: 70 },
  { progress: 0.25, x: 200, y: 140 },
  { progress: 0.45, x: 200, y: 280 },
  { progress: 0.55, x: 180, y: 360 },
  { progress: 0.65, x: 220, y: 420 },
  { progress: 0.7, x: 200, y: 480 },
  { progress: 0.85, x: 200, y: 580 },
  { progress: 1, x: 200, y: 660 },
];

export function getPositionAtProgress(progress: number): { x: number; y: number } {
  const clamped = Math.max(0, Math.min(1, progress));
  const idx = DIGESTIVE_PATH.findIndex((p) => p.progress >= clamped);
  if (idx <= 0) return DIGESTIVE_PATH[0];
  const prev = DIGESTIVE_PATH[idx - 1];
  const next = DIGESTIVE_PATH[idx];
  const t = (clamped - prev.progress) / (next.progress - prev.progress);
  return {
    x: prev.x + (next.x - prev.x) * t,
    y: prev.y + (next.y - prev.y) * t,
  };
}

export default function AnatomySvg() {
  return (
    <svg
      width={SVG_WIDTH}
      height={SVG_HEIGHT}
      viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
      className="w-full max-w-[400px] h-auto"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Liver - dark red blob, upper right */}
      <path
        id="liver"
        d="M 260 60 Q 320 80 340 140 Q 350 200 320 260 Q 280 300 240 280 Q 200 260 220 200 Q 240 120 260 60 Z"
        fill="#DC2626"
        fillOpacity={0.5}
        stroke="#991B1B"
        strokeWidth={1.5}
      />

      {/* Large intestine - frame shape */}
      <path
        id="large-intestine"
        d="M 120 420 L 120 520 L 160 600 L 280 640 L 400 600 L 400 520 L 360 440 L 280 420 L 200 420 L 120 420 M 280 420 L 280 520 L 320 580 L 280 640 M 280 520 L 120 520 M 280 520 L 400 520"
        fill="var(--organ-violet)"
        fillOpacity={0.5}
        stroke="#6366F1"
        strokeWidth={1.5}
      />

      {/* Small intestine - coiled tube */}
      <path
        id="small-intestine"
        d="M 200 280 Q 120 300 140 380 Q 160 420 200 400 Q 280 360 260 420 Q 240 480 200 460 Q 160 440 180 500 Q 200 540 240 520"
        fill="var(--organ-pink)"
        fillOpacity={0.5}
        stroke="#EF4444"
        strokeWidth={1.5}
      />

      {/* Stomach - curved pouch */}
      <path
        id="stomach"
        d="M 180 140 L 200 140 Q 260 140 280 200 Q 300 300 260 360 Q 220 400 180 360 Q 140 300 160 200 Q 180 140 200 140"
        fill="var(--organ-gold)"
        fillOpacity={0.5}
        stroke="#D97706"
        strokeWidth={1.5}
      />

      {/* Esophagus - pink-red tube */}
      <ellipse id="esophagus" cx="200" cy="105" rx="20" ry="45" fill="#FCA5A5" fillOpacity={0.6} stroke="#E11D48" strokeWidth={1.5} />

      {/* Mouth - light pink */}
      <ellipse id="mouth" cx="200" cy="35" rx="50" ry="25" fill="#FECACA" fillOpacity={0.8} stroke="#F472B6" strokeWidth={1.5} />
    </svg>
  );
}
