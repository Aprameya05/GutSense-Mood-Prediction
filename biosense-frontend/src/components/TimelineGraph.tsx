"use client";

import { TimelineChart } from "@/components/TimelineChart";
import { TimeHorizonPrediction } from "@/lib/biosenseClient";

export function TimelineGraph({
  timeline,
}: {
  timeline: TimeHorizonPrediction[];
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur px-3 py-3">
      <TimelineChart timeline={timeline} />
    </div>
  );
}

