"use client";

import { motion } from "framer-motion";

export default function GaugeChart({
  value,
  max = 1,
  color = "var(--blue)",
  size = 140,
  label,
  sublabel,
}: {
  value: number;
  max?: number;
  color?: string;
  size?: number;
  label?: string;
  sublabel?: string;
}) {
  const radius = size / 2 - 12;
  const cx = size / 2;
  const cy = size / 2;
  const startAngle = -210;
  const endAngle = 30;
  const totalAngle = endAngle - startAngle;
  const valueAngle = startAngle + (value / max) * totalAngle;

  const polarToCartesian = (angle: number) => {
    const rad = (angle * Math.PI) / 180;
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  };

  const describeArc = (start: number, end: number) => {
    const s = polarToCartesian(start);
    const e = polarToCartesian(end);
    const largeArc = end - start > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${radius} ${radius} 0 ${largeArc} 1 ${e.x} ${e.y}`;
  };

  const needleEnd = polarToCartesian(valueAngle);

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size * 0.7} viewBox={`0 0 ${size} ${size * 0.75}`}>
        {/* Track */}
        <path d={describeArc(startAngle, endAngle)} fill="none" stroke="#E2E8F0" strokeWidth="8" strokeLinecap="round" />
        {/* Value arc */}
        <motion.path
          d={describeArc(startAngle, valueAngle)}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
        {/* Needle */}
        <motion.line
          x1={cx}
          y1={cy}
          x2={needleEnd.x}
          y2={needleEnd.y}
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          initial={{ rotate: startAngle, originX: `${cx}px`, originY: `${cy}px` }}
          whileInView={{ rotate: valueAngle }}
          viewport={{ once: true }}
          transition={{ type: "spring", stiffness: 80, damping: 12, duration: 1.5 }}
        />
        <circle cx={cx} cy={cy} r="4" fill={color} />
      </svg>
      {label && <div className="text-sm font-semibold text-[var(--text)] mt-1">{label}</div>}
      {sublabel && <div className="text-xs text-[var(--muted)] font-ibm">{sublabel}</div>}
    </div>
  );
}
