"use client";

import { BioCard } from "@/components/BioCard";
import { NeuroState, PredictionState } from "@/lib/biosenseClient";

export function BrainMeter({
  neuro,
  pred,
}: {
  neuro: NeuroState;
  pred: PredictionState;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <BioCard
        label="Serotonin"
        value={neuro.serotonin.toFixed(1)}
        hint="gut–brain signaling"
        tone="emerald"
      />
      <BioCard
        label="Dopamine"
        value={neuro.dopamine.toFixed(1)}
        hint="drive / reward"
        tone="cyan"
      />
      <BioCard
        label="GABA"
        value={neuro.gaba.toFixed(1)}
        hint="calm / inhibition"
        tone="blue"
      />
      <BioCard
        label="Cortisol"
        value={neuro.cortisol.toFixed(1)}
        hint="stress hormone"
        tone="rose"
      />
      <BioCard
        label="Melatonin"
        value={neuro.melatonin.toFixed(1)}
        hint="sleep readiness"
        tone="amber"
      />
      <BioCard
        label="Focus"
        value={pred.focus.toFixed(1)}
        hint="predicted cognitive control"
        tone="cyan"
      />
    </div>
  );
}

