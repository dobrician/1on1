"use client";

import { useState } from "react";
import { NudgeCard, type NudgeData } from "./nudge-card";

interface NudgeCardsGridProps {
  initialNudges: NudgeData[];
}

export function NudgeCardsGrid({ initialNudges }: NudgeCardsGridProps) {
  const [nudges, setNudges] = useState(initialNudges);

  function handleDismissed(nudgeId: string) {
    setNudges((prev) => prev.filter((n) => n.id !== nudgeId));
  }

  if (nudges.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-sm text-muted-foreground">
          No AI nudges yet -- they appear after your first completed session
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {nudges.map((nudge) => (
        <NudgeCard
          key={nudge.id}
          nudge={nudge}
          onDismissed={handleDismissed}
        />
      ))}
    </div>
  );
}
