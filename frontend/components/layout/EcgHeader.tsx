"use client";

import { useEffect, useRef } from "react";

export default function EcgHeader() {
  const pathRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    const path = pathRef.current;
    if (!path) return;
    const length = path.getTotalLength();
    path.style.strokeDasharray = `${length}`;
    path.style.strokeDashoffset = `${length}`;

    let start: number | null = null;
    const duration = 3000;

    function animate(ts: number) {
      if (!start) start = ts;
      const elapsed = (ts - start) % duration;
      const progress = elapsed / duration;
      path!.style.strokeDashoffset = `${length * (1 - progress)}`;
      requestAnimationFrame(animate);
    }
    const raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, []);

  const ecgPath = [
    "M0,20",
    "L80,20",
    "L85,18 L90,22 L95,20",
    "L120,20",
    "L125,20 L128,8 L132,32 L135,2 L138,38 L141,20",
    "L160,20",
    "L170,14 L180,20",
    "L260,20",
    "L265,18 L270,22 L275,20",
    "L300,20",
    "L305,20 L308,8 L312,32 L315,2 L318,38 L321,20",
    "L340,20",
    "L350,14 L360,20",
    "L440,20",
    "L445,18 L450,22 L455,20",
    "L480,20",
    "L485,20 L488,8 L492,32 L495,2 L498,38 L501,20",
    "L520,20",
    "L530,14 L540,20",
    "L600,20",
  ].join(" ");

  return (
    <div className="h-[3px] w-full overflow-hidden relative">
      <svg
        viewBox="0 0 600 40"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-10 -top-[18px]"
      >
        <path
          ref={pathRef}
          d={ecgPath}
          fill="none"
          stroke="var(--blue)"
          strokeWidth="1.5"
          opacity="0.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
