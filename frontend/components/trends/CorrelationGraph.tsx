"use client";

import { useRef, useEffect, useState } from "react";
import * as d3 from "d3";
import { demoStage7 } from "@/lib/demoData";

const NODE_RADIUS = 30;
const SVG_WIDTH = 600;
const SVG_HEIGHT = 500;

type NodeCategory = "nutrition" | "gut" | "neuro" | "metabolic";

interface GraphNode {
  id: string;
  label: string;
  category: NodeCategory;
}

interface GraphLink {
  source: string;
  target: string;
  r: number;
  p: number;
  significant: boolean;
}

const NODES: GraphNode[] = [
  { id: "glycemic_load", label: "glycemic_load", category: "metabolic" },
  { id: "fiber", label: "fiber", category: "nutrition" },
  { id: "sleep_quality", label: "sleep_quality", category: "neuro" },
  { id: "mood_score", label: "mood_score", category: "neuro" },
  { id: "MDI", label: "MDI", category: "gut" },
  { id: "IRS", label: "IRS", category: "gut" },
  { id: "tryptophan", label: "tryptophan", category: "nutrition" },
  { id: "cognitive_penalty", label: "cognitive_penalty", category: "neuro" },
];

const CATEGORY_COLORS: Record<NodeCategory, string> = {
  nutrition: "#0EA5E9",
  gut: "#10B981",
  neuro: "#818CF8",
  metabolic: "#F59E0B",
};

function pairToNodes(pair: string): { source: string; target: string } | null {
  const map: Record<string, string> = {
    glycemic_load: "glycemic_load",
    mood_score: "mood_score",
    fiber_g: "fiber",
    MDI: "MDI",
    late_meal: "sleep_quality",
    sleep_quality: "sleep_quality",
    tryptophan_mg: "tryptophan",
    next_day_mood: "mood_score",
    sleep_debt: "sleep_quality",
    cognitive_penalty: "cognitive_penalty",
    carbs_g: "glycemic_load",
    IRS: "IRS",
  };
  const [a, b] = pair.split(" ↔ ");
  const source = map[a?.trim() ?? ""] ?? a?.trim();
  const target = map[b?.trim() ?? ""] ?? b?.trim();
  if (!source || !target || source === target) return null;
  const ids = new Set(NODES.map((n) => n.id));
  if (ids.has(source) && ids.has(target)) return { source, target };
  return null;
}

interface CorrelationGraphProps {
  correlations?: Array<{ pair: string; r: number; p: number; significant: boolean }>;
}

export default function CorrelationGraph({ correlations: propCorrelations }: CorrelationGraphProps = {}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const rawCorrelations = propCorrelations ?? demoStage7.correlations;
    const links: GraphLink[] = rawCorrelations
      .map((c: any) => {
        const nodes = pairToNodes(c.pair);
        if (!nodes) return null;
        return { ...nodes, r: c.r, p: c.p, significant: c.significant };
      })
      .filter((l): l is GraphLink => l !== null);

    const nodeData = NODES.map((n) => ({ ...n }));
    const linkData = links.map((l) => ({
      ...l,
      source: nodeData.find((n) => n.id === l.source)!,
      target: nodeData.find((n) => n.id === l.target)!,
    }));

    const validLinks = linkData.filter((l) => l.source && l.target);

    const simulation = d3
      .forceSimulation(nodeData as d3.SimulationNodeDatum[])
      .force(
        "link",
        d3
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .forceLink(validLinks as any[])
          .id((d: any) => d.id)
          .distance(120)
          .strength((d: any) => Math.abs(d.r) * 0.3)
      )
      .force("charge", d3.forceManyBody().strength(-200))
      .force("center", d3.forceCenter(SVG_WIDTH / 2, SVG_HEIGHT / 2))
      .force("collision", d3.forceCollide().radius(NODE_RADIUS + 10));

    // Start nodes at center for entrance animation
    nodeData.forEach((n) => {
      (n as d3.SimulationNodeDatum & { x?: number; y?: number }).x = SVG_WIDTH / 2;
      (n as d3.SimulationNodeDatum & { y?: number }).y = SVG_HEIGHT / 2;
    });

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const g = svg.append("g");

    const link = g
      .append("g")
      .selectAll("line")
      .data(validLinks)
      .join("line")
      .attr("stroke-width", (d) => Math.max(1, Math.abs(d.r) * 8))
      .attr("stroke", (d) => (d.r >= 0 ? "#10B981" : "#EF4444"))
      .attr("stroke-opacity", 0.6)
      .attr("stroke-dasharray", (d) => (d.significant ? "none" : "5,5"));

    const node = g
      .append("g")
      .selectAll("g.node")
      .data(nodeData)
      .join("g")
      .attr("class", "node")
      .attr("cursor", "pointer")
      .call(
        d3
          .drag<any, any>()
          .on("start", (event: any, d: any) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event: any, d: any) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event: any, d: any) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      )
      .on("mouseenter", (_: any, d: any) => setHoveredNode(d.id))
      .on("mouseleave", () => setHoveredNode(null));

    node
      .append("circle")
      .attr("r", NODE_RADIUS)
      .attr("fill", (d) => CATEGORY_COLORS[d.category])
      .attr("stroke", "#fff")
      .attr("stroke-width", 2);

    node
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", 4)
      .attr("font-size", 10)
      .attr("font-family", "IBM Plex Mono, monospace")
      .attr("fill", "#fff")
      .text((d) => d.label);

    function ticked() {
      link
        .attr("x1", (d) => (d.source as d3.SimulationNodeDatum & { x?: number }).x ?? 0)
        .attr("y1", (d) => (d.source as d3.SimulationNodeDatum & { y?: number }).y ?? 0)
        .attr("x2", (d) => (d.target as d3.SimulationNodeDatum & { x?: number }).x ?? 0)
        .attr("y2", (d) => (d.target as d3.SimulationNodeDatum & { y?: number }).y ?? 0);
      node.attr("transform", (d) => {
        const x = (d as d3.SimulationNodeDatum & { x?: number }).x ?? 0;
        const y = (d as d3.SimulationNodeDatum & { y?: number }).y ?? 0;
        return `translate(${x},${y})`;
      });
    }

    simulation.on("tick", ticked);

    return () => {
      simulation.stop();
    };
  }, []);

  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    // Apply hover styles to links and nodes based on hoveredNode
    svg.selectAll("line").attr("stroke-opacity", function () {
      const line = d3.select(this);
      const data = line.datum() as { source: { id: string }; target: { id: string } };
      if (!hoveredNode) return 0.6;
      const connected =
        data.source?.id === hoveredNode || data.target?.id === hoveredNode;
      return connected ? 1 : 0.15;
    });
    svg.selectAll("g.node").each(function () {
      const g = d3.select(this);
      const data = g.datum() as { id: string };
      if (data?.id) {
        const isHovered = data.id === hoveredNode;
        g.select("circle").attr("opacity", hoveredNode ? (isHovered ? 1 : 0.4) : 1);
      }
    });
  }, [hoveredNode]);

  return (
    <svg
      ref={svgRef}
      width={SVG_WIDTH}
      height={SVG_HEIGHT}
      className="rounded-xl border border-[var(--border)] bg-white"
    />
  );
}
