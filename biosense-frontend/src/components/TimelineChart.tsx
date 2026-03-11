import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from "chart.js";
import { TimeHorizonPrediction } from "@/lib/biosenseClient";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
);

export function TimelineChart({ timeline }: { timeline: TimeHorizonPrediction[] }) {
  const labels = timeline.map((t) => `${t.horizon_hours}h`);

  const data = {
    labels,
    datasets: [
      {
        label: "Mood",
        data: timeline.map((t) => t.mood),
        borderColor: "#4ef2c5",
        backgroundColor: "rgba(78, 242, 197, 0.2)",
      },
      {
        label: "Energy",
        data: timeline.map((t) => t.energy),
        borderColor: "#2bb1ff",
        backgroundColor: "rgba(43, 177, 255, 0.18)",
      },
      {
        label: "Stress",
        data: timeline.map((t) => t.stress),
        borderColor: "#fb7185",
        backgroundColor: "rgba(251, 113, 133, 0.18)",
      },
    ],
  };

  return (
    <div className="w-full">
      <Line
        data={data}
        options={{
          responsive: true,
          plugins: {
            legend: {
              labels: {
                color: "#cbd5f5",
                font: { size: 11 },
              },
            },
          },
          scales: {
            x: {
              ticks: { color: "#94a3b8", font: { size: 10 } },
              grid: { color: "rgba(30,64,175,0.3)" },
            },
            y: {
              ticks: { color: "#94a3b8", font: { size: 10 } },
              grid: { color: "rgba(30,64,175,0.24)" },
              min: 0,
              max: 10,
            },
          },
        }}
      />
    </div>
  );
}

