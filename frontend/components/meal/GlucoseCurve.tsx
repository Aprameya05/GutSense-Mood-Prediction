"use client";

import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

const WIDTH = 600;
const HEIGHT = 300;
const MARGIN = { top: 24, right: 24, bottom: 36, left: 48 };

interface Stage5Data {
  estimated_glucose_spike: string;
  spike_delta_mg_dl: number;
  fiber_attenuation_factor: number;
  energy_crash_probability: number;
  late_meal_penalty_applied: boolean;
  insulin_demand_proxy: string;
}

interface Props {
  stage5?: Stage5Data | null;
}

type DataPoint = {
  time: number;
  glucose: number;
  attenuated: number;
  label: string;
};

function generateCurveData(
  spikeDelta: number,
  fiberAttenuation: number
): DataPoint[] {
  const baseline = 90;
  return Array.from({ length: 48 }, (_, i) => {
    const t = (i / 47) * 4;
    const raw =
      baseline +
      spikeDelta * Math.exp(-0.5 * ((t - 1.2) / 0.5) ** 2);
    const attenuated =
      baseline +
      spikeDelta *
        fiberAttenuation *
        Math.exp(-0.5 * ((t - 1.2) / 0.55) ** 2);
    return {
      time: Math.round(t * 100) / 100,
      glucose: Math.round(raw * 10) / 10,
      attenuated: Math.round(attenuated * 10) / 10,
      label: `${Math.floor(t)}h ${Math.round((t % 1) * 60)}m`,
    };
  });
}

export default function GlucoseCurve({ stage5 }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    text: string;
  } | null>(null);

  useEffect(() => {
    if (!svgRef.current || !stage5) return;

    const data = generateCurveData(
      stage5.spike_delta_mg_dl,
      stage5.fiber_attenuation_factor
    );
    const innerWidth = WIDTH - MARGIN.left - MARGIN.right;
    const innerHeight = HEIGHT - MARGIN.top - MARGIN.bottom;

    const xScale = d3.scaleLinear().domain([0, 4]).range([0, innerWidth]);
    const yScale = d3.scaleLinear().domain([80, 150]).range([innerHeight, 0]);

    const lineGen = d3
      .line<DataPoint>()
      .x((d) => xScale(d.time))
      .y((d) => yScale(d.glucose));

    const attenuatedLineGen = d3
      .line<DataPoint>()
      .x((d) => xScale(d.time))
      .y((d) => yScale(d.attenuated));

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const defs = svg.append("defs");

    const gradient = defs
      .append("linearGradient")
      .attr("id", "glucose-gradient")
      .attr("x1", "0%")
      .attr("y1", "0")
      .attr("x2", "100%")
      .attr("y2", "0");
    gradient.append("stop").attr("offset", "0%").attr("stop-color", "#0EA5E9");
    gradient.append("stop").attr("offset", "30%").attr("stop-color", "#EF4444");
    gradient.append("stop").attr("offset", "100%").attr("stop-color", "#0EA5E9");

    const g = svg
      .append("g")
      .attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

    g.append("g")
      .attr("class", "grid")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(
        d3
          .axisBottom(xScale)
          .ticks(9)
          .tickSize(-innerHeight)
          .tickFormat(() => "")
      )
      .selectAll(".tick line")
      .attr("stroke", "#E2E8F0")
      .attr("stroke-opacity", 0.8);

    g.append("g")
      .attr("class", "grid")
      .call(
        d3
          .axisLeft(yScale)
          .ticks(7)
          .tickSize(-innerWidth)
          .tickFormat(() => "")
      )
      .selectAll(".tick line")
      .attr("stroke", "#E2E8F0")
      .attr("stroke-opacity", 0.8);

    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale).ticks(9).tickFormat((d) => `${d}h`))
      .attr("font-family", "IBM Plex Mono, monospace")
      .attr("font-size", "11")
      .attr("color", "#64748B");

    g.append("g")
      .call(d3.axisLeft(yScale).ticks(7).tickFormat((d) => `${d}`))
      .attr("font-family", "IBM Plex Mono, monospace")
      .attr("font-size", "11")
      .attr("color", "#64748B");

    const mainPath = g
      .append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "url(#glucose-gradient)")
      .attr("stroke-width", 2.5)
      .attr("stroke-linecap", "round")
      .attr("stroke-linejoin", "round")
      .attr("d", lineGen(data) ?? "");

    const mainPathEl = mainPath.node() as SVGPathElement;
    if (mainPathEl) {
      const len = mainPathEl.getTotalLength();
      mainPath
        .attr("stroke-dasharray", len)
        .attr("stroke-dashoffset", len)
        .transition()
        .duration(2000)
        .ease(d3.easeCubicOut)
        .attr("stroke-dashoffset", 0);
    }

    const attenuatedPath = g
      .append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "#10B981")
      .attr("stroke-width", 1.5)
      .attr("stroke-linecap", "round")
      .attr("stroke-linejoin", "round")
      .attr("d", attenuatedLineGen(data) ?? "");

    const attenuatedPathEl = attenuatedPath.node() as SVGPathElement;
    if (attenuatedPathEl) {
      const len = attenuatedPathEl.getTotalLength();
      attenuatedPath
        .attr("stroke-dasharray", len)
        .attr("stroke-dashoffset", len)
        .transition()
        .duration(2000)
        .delay(200)
        .ease(d3.easeCubicOut)
        .attr("stroke-dashoffset", 0)
        .on("end", function () {
          d3.select(this).attr("stroke-dasharray", "6,4");
        });
    }

    const peakIdx = data.reduce(
      (best, d, i) => (d.glucose > data[best].glucose ? i : best),
      0
    );
    const peakPoint = data[peakIdx];

    g.append("g")
      .attr(
        "transform",
        `translate(${xScale(peakPoint.time)},${yScale(peakPoint.glucose)})`
      )
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "-8")
      .attr("font-size", "11")
      .attr("font-family", "IBM Plex Mono, monospace")
      .attr("fill", "#64748B")
      .text(`Peak: +${stage5.spike_delta_mg_dl} mg/dL`);

    const bisect = d3.bisector((d: DataPoint) => d.time).left;
    const overlay = g
      .append("rect")
      .attr("width", innerWidth)
      .attr("height", innerHeight)
      .attr("fill", "transparent")
      .style("cursor", "crosshair");

    overlay
      .on("mousemove", function (event) {
        const [x] = d3.pointer(event, this);
        const t = xScale.invert(x);
        const i = Math.min(bisect(data, t), data.length - 1);
        const d = data[i];
        setTooltip({
          x: event.clientX,
          y: event.clientY,
          text: `${d.label}: ${d.glucose.toFixed(1)} mg/dL`,
        });
      })
      .on("mouseleave", () => setTooltip(null));

    return () => {
      overlay.on("mousemove", null).on("mouseleave", null);
    };
  }, [stage5]);

  if (!stage5) {
    return (
      <div className="relative w-full max-w-[600px] rounded-xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center">
        <p className="font-ibm text-sm text-[var(--muted)]">
          Complete mood submission to see glucose response
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-[600px]">
      <svg
        ref={svgRef}
        width="100%"
        height={300}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
        className="block"
      />
      {tooltip && (
        <div
          className="pointer-events-none fixed z-50 rounded-md bg-[#0F172A] px-3 py-2 text-xs text-white font-ibm shadow-lg"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: "translate(-50%, -100%) translateY(-8px)",
          }}
        >
          {tooltip.text}
        </div>
      )}
      <p className="mt-3 font-ibm text-sm text-[var(--muted)]">
        Fiber Attenuation Factor: {stage5.fiber_attenuation_factor}
      </p>
    </div>
  );
}
