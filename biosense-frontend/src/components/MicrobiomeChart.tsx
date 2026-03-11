"use client";

import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import { MicrobiomeState } from "@/lib/biosenseClient";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export function MicrobiomeChart({ microbiome }: { microbiome: MicrobiomeState }) {
  const labels = [
    "SCFA",
    "Diversity",
    "Probiotic",
    "Gut balance",
    "Inflammation",
  ];

  const values = [
    microbiome.scfa_score,
    microbiome.diversity_score,
    microbiome.probiotic_score,
    microbiome.gut_balance_score,
    Math.max(0, microbiome.inflammation_score),
  ];

  return (
    <Bar
      data={{
        labels,
        datasets: [
          {
            label: "Microbiome state (0–10)",
            data: values,
            backgroundColor: [
              "rgba(52, 211, 153, 0.55)",
              "rgba(34, 211, 238, 0.55)",
              "rgba(96, 165, 250, 0.55)",
              "rgba(16, 185, 129, 0.35)",
              "rgba(251, 113, 133, 0.45)",
            ],
            borderColor: [
              "rgba(52, 211, 153, 0.9)",
              "rgba(34, 211, 238, 0.9)",
              "rgba(96, 165, 250, 0.9)",
              "rgba(16, 185, 129, 0.7)",
              "rgba(251, 113, 133, 0.8)",
            ],
            borderWidth: 1,
            borderRadius: 10,
          },
        ],
      }}
      options={{
        responsive: true,
        plugins: {
          legend: {
            labels: { color: "rgba(255,255,255,0.7)", font: { size: 11 } },
          },
        },
        scales: {
          x: {
            ticks: { color: "rgba(255,255,255,0.55)", font: { size: 10 } },
            grid: { color: "rgba(255,255,255,0.06)" },
          },
          y: {
            ticks: { color: "rgba(255,255,255,0.55)", font: { size: 10 } },
            grid: { color: "rgba(255,255,255,0.06)" },
            min: 0,
            max: 10,
          },
        },
      }}
    />
  );
}

