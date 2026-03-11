"use client";

import { Shell } from "@/components/Shell";
import { useBioSense } from "@/context/BioSenseContext";

export default function HistoryPage() {
  const { history } = useBioSense();

  return (
    <Shell active="/history">
      <div className="glass-surface rounded-2xl p-4 md:p-6 space-y-4">
        <h1 className="text-xl font-semibold">History</h1>
        {history.length === 0 ? (
          <p className="mt-1 text-xs text-slate-400 max-w-xl">
            As you analyze meals, BioSense keeps a session-level log of health
            scores here.
          </p>
        ) : (
          <>
            <p className="mt-1 text-xs text-slate-400 max-w-xl">
              Session history of meals analyzed with their composite health
              scores.
            </p>
            <div className="mt-3 rounded-2xl border border-slate-800/80 bg-slate-950/70 px-3 py-3 text-xs text-slate-300">
              <table className="w-full border-separate border-spacing-y-1">
                <thead className="text-[10px] text-slate-400">
                  <tr>
                    <th className="text-left">When</th>
                    <th className="text-left">Meal label</th>
                    <th className="text-right">Health score</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={h.id}>
                      <td className="text-slate-400">
                        {new Date(h.createdAt).toLocaleTimeString()}
                      </td>
                      <td className="text-slate-200">{h.label}</td>
                      <td className="text-right text-biosense-accent">
                        {h.healthScore.toFixed(0)}/100
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </Shell>
  );
}

