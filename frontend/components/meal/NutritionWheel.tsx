"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { demoStage2 } from "@/lib/demoData";

const SIZE = 320;
const INNER_RADIUS = 70;
const INNER_THICKNESS = 35;
const OUTER_RADIUS = 115;
const OUTER_THICKNESS = 45;

const MACRO_COLORS: Record<string, string> = {
  carbs: "#0EA5E9",
  protein: "#10B981",
  fat: "#F59E0B",
};

const MICRO_COLORS: Record<string, string> = {
  iron: "#F43F5E",
  magnesium: "#8B5CF6",
  zinc: "#14B8A6",
  b6: "#F97316",
  tryptophan: "#6366F1",
};

type MacroItem = { key: string; value: number; unit: string; label: string };
type MicroItem = { key: string; value: number; unit: string; label: string };

interface NutritionTotals {
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
}

interface Props {
  totals?: NutritionTotals;
}

export default function NutritionWheel({ totals: propTotals }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const totals = propTotals ?? demoStage2.totals;
    const macros: MacroItem[] = [
      { key: "carbs", value: totals.carbs_g, unit: "g", label: "Carbs" },
      { key: "protein", value: totals.protein_g, unit: "g", label: "Protein" },
      { key: "fat", value: totals.fat_g, unit: "g", label: "Fat" },
    ];
    const micros: MicroItem[] = [
      { key: "iron", value: totals.iron_mg, unit: "mg", label: "Iron" },
      { key: "magnesium", value: totals.magnesium_mg, unit: "mg", label: "Magnesium" },
      { key: "zinc", value: totals.zinc_mg, unit: "mg", label: "Zinc" },
      { key: "b6", value: totals.b6_mg, unit: "mg", label: "B6" },
      { key: "tryptophan", value: totals.tryptophan_mg, unit: "mg", label: "Tryptophan" },
    ];

    const centerX = SIZE / 2;
    const centerY = SIZE / 2;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const macroPie = d3.pie<MacroItem>().value((d) => d.value).sort(null);
    const microPie = d3.pie<MicroItem>().value((d) => d.value).sort(null);

    const innerArc = d3
      .arc<d3.PieArcDatum<MacroItem>>()
      .innerRadius(INNER_RADIUS)
      .outerRadius(INNER_RADIUS + INNER_THICKNESS)
      .cornerRadius(4);

    const outerArc = d3
      .arc<d3.PieArcDatum<MicroItem>>()
      .innerRadius(OUTER_RADIUS)
      .outerRadius(OUTER_RADIUS + OUTER_THICKNESS)
      .cornerRadius(4);

    const macroData = macroPie(macros);
    const microData = microPie(micros);

    const macroGroup = svg
      .append("g")
      .attr("transform", `translate(${centerX},${centerY})`);

    const microGroup = svg
      .append("g")
      .attr("transform", `translate(${centerX},${centerY})`);

    const arcTween = (d: d3.PieArcDatum<MacroItem | MicroItem>) => {
      const interpolate = d3.interpolate({ startAngle: d.startAngle, endAngle: d.startAngle }, d);
      return (t: number) => innerArc(interpolate(t) as d3.PieArcDatum<MacroItem>) ?? "";
    };

    const outerArcTween = (d: d3.PieArcDatum<MicroItem>) => {
      const interpolate = d3.interpolate({ startAngle: d.startAngle, endAngle: d.startAngle }, d);
      return (t: number) => outerArc(interpolate(t) as d3.PieArcDatum<MicroItem>) ?? "";
    };

    const tooltip = d3
      .select("body")
      .append("div")
      .attr("class", "nutrition-wheel-tooltip")
      .style("position", "absolute")
      .style("visibility", "hidden")
      .style("background", "#0F172A")
      .style("color", "#fff")
      .style("padding", "6px 10px")
      .style("border-radius", "6px")
      .style("font-size", "12px")
      .style("font-family", "IBM Plex Mono, monospace")
      .style("pointer-events", "none")
      .style("z-index", "1000")
      .style("box-shadow", "0 4px 12px rgba(0,0,0,0.15)");

    macroGroup
      .selectAll("path")
      .data(macroData)
      .join("path")
      .attr("fill", (d) => MACRO_COLORS[(d.data as MacroItem).key] ?? "#94A3B8")
      .attr("d", (d) => {
        const zero = { ...d, startAngle: d.startAngle, endAngle: d.startAngle };
        return innerArc(zero as d3.PieArcDatum<MacroItem>) ?? "";
      })
      .style("cursor", "pointer")
      .on("mouseenter", function (event, d) {
        const data = d.data as MacroItem;
        tooltip
          .style("visibility", "visible")
          .text(`${data.label}: ${data.value}${data.unit}`);
      })
      .on("mousemove", function (event) {
        tooltip
          .style("top", `${event.pageY + 10}px`)
          .style("left", `${event.pageX + 10}px`);
      })
      .on("mouseleave", () => tooltip.style("visibility", "hidden"))
      .transition()
      .duration(800)
      .ease(d3.easeCubicOut)
      .attrTween("d", arcTween as (d: d3.PieArcDatum<MacroItem>) => (t: number) => string);

    microGroup
      .selectAll("path")
      .data(microData)
      .join("path")
      .attr("fill", (d) => MICRO_COLORS[(d.data as MicroItem).key] ?? "#94A3B8")
      .attr("d", (d) => {
        const zero = { ...d, startAngle: d.startAngle, endAngle: d.startAngle };
        return outerArc(zero as d3.PieArcDatum<MicroItem>) ?? "";
      })
      .style("cursor", "pointer")
      .on("mouseenter", function (event, d) {
        const data = d.data as MicroItem;
        tooltip
          .style("visibility", "visible")
          .text(`${data.label}: ${data.value}${data.unit}`);
      })
      .on("mousemove", function (event) {
        tooltip
          .style("top", `${event.pageY + 10}px`)
          .style("left", `${event.pageX + 10}px`);
      })
      .on("mouseleave", () => tooltip.style("visibility", "hidden"))
      .transition()
      .duration(800)
      .delay(150)
      .ease(d3.easeCubicOut)
      .attrTween("d", outerArcTween);

    const centerGroup = svg.append("g").attr("transform", `translate(${centerX},${centerY})`);
    centerGroup
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "-0.2em")
      .attr("fill", "#0F172A")
      .attr("font-size", "36")
      .attr("font-weight", "600")
      .attr("font-family", "IBM Plex Mono, monospace")
      .text(String(totals.calories_kcal));
    centerGroup
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "1.2em")
      .attr("fill", "#64748B")
      .attr("font-size", "12")
      .attr("font-family", "Plus Jakarta Sans, system-ui, sans-serif")
      .text("kcal");

    return () => {
      tooltip.remove();
    };
  }, [propTotals]);

  return (
    <div className="rounded-xl bg-white p-4">
      <svg
        ref={svgRef}
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="block"
      />
    </div>
  );
}
