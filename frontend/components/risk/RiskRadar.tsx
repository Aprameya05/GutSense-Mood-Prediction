"use client";

const AXIS_ORDER = [
  "persistent_brain_fog",
  "chronic_sleep_debt",
  "mood_instability",
  "metabolic_dysregulation",
  "inflammation_persistence",
  "circadian_disruption",
  "combined_neuro_stress",
  "b12_deficiency_signal",
] as const;

const LABELS: Record<string, string> = {
  persistent_brain_fog: "Brain Fog",
  chronic_sleep_debt: "Sleep Debt",
  mood_instability: "Mood",
  metabolic_dysregulation: "Metabolic",
  inflammation_persistence: "Inflammation",
  circadian_disruption: "Circadian",
  combined_neuro_stress: "Neuro Stress",
  b12_deficiency_signal: "B12",
};

const riskFlagDetails: Record<string, { name: string }> = {
  persistent_brain_fog: { name: "Persistent Brain Fog" },
  chronic_sleep_debt: { name: "Chronic Sleep Debt" },
  mood_instability: { name: "Mood Instability" },
  metabolic_dysregulation: { name: "Metabolic Dysregulation" },
  inflammation_persistence: { name: "Chronic Inflammation" },
  circadian_disruption: { name: "Circadian Disruption" },
  combined_neuro_stress: { name: "Elevated Neurological Stress" },
  b12_deficiency_signal: { name: "B12 Deficiency Signal" },
};

const SIZE = 350;
const CX = SIZE / 2;
const CY = SIZE / 2;
const RADIUS = 130;

function polarToCartesian(angleDeg: number, r: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: CX + r * Math.cos(rad),
    y: CY + r * Math.sin(rad),
  };
}

export type RiskData = {
  neurological_risk_level?: string;
  active_flags: string[];
  risk_count?: number;
};

interface RiskRadarProps {
  riskData: RiskData;
}

export default function RiskRadar({ riskData }: RiskRadarProps) {
  const activeFlags = new Set(riskData?.active_flags ?? []);
  const numAxes = AXIS_ORDER.length;
  const angleStep = 360 / numAxes;

  return (
    <svg width={SIZE} height={SIZE} className="mx-auto">
      {/* Octagon grid lines at 33%, 66%, 100% */}
      {[0.33, 0.66, 1].map((scale) => (
        <polygon
          key={scale}
          points={AXIS_ORDER
            .map((_, i) => polarToCartesian(i * angleStep, RADIUS * scale))
            .map((p) => `${p.x},${p.y}`)
            .join(" ")}
          fill="none"
          stroke="var(--border)"
          strokeWidth={1}
        />
      ))}

      {/* Axis lines from center */}
      {AXIS_ORDER.map((flagId, i) => {
        const end = polarToCartesian(i * angleStep, RADIUS);
        return (
          <line
            key={flagId}
            x1={CX}
            y1={CY}
            x2={end.x}
            y2={end.y}
            stroke="var(--border)"
            strokeWidth={1}
          />
        );
      })}

      {/* Dots at low/med/high positions - active flags get red dot at high */}
      {AXIS_ORDER.map((flagId, i) => {
        const isActive = activeFlags.has(flagId);
        const angle = i * angleStep;
        const dotRadius = isActive ? RADIUS : RADIUS * 0.33;
        const pos = polarToCartesian(angle, dotRadius);

        return (
          <g key={flagId}>
            {!isActive && (
              <circle
                cx={pos.x}
                cy={pos.y}
                r={4}
                fill="#94A3B8"
                opacity={0.7}
              />
            )}
            {isActive && (
              <>
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={8}
                  fill="#EF4444"
                  opacity={0.3}
                  className="animate-pulse"
                />
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={5}
                  fill="#EF4444"
                />
              </>
            )}
          </g>
        );
      })}

      {/* Labels at each axis tip */}
      {AXIS_ORDER.map((flagId, i) => {
        const angle = i * angleStep;
        const labelRadius = RADIUS + 22;
        const pos = polarToCartesian(angle, labelRadius);
        const label = LABELS[flagId] ?? riskFlagDetails[flagId]?.name ?? flagId;

        return (
          <text
            key={flagId}
            x={pos.x}
            y={pos.y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-[10px] font-ibm fill-[var(--muted)]"
          >
            {label}
          </text>
        );
      })}
    </svg>
  );
}
