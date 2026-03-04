"use client";

import { useState, useMemo } from "react";
import { NudgeCard, type NudgeData } from "./nudge-card";

interface NudgeCardsGridProps {
  initialNudges: NudgeData[];
}

export function NudgeCardsGrid({ initialNudges }: NudgeCardsGridProps) {
  const [nudges, setNudges] = useState(initialNudges);

  const groupedByReport = useMemo(() => {
    const groups = new Map<string, NudgeData[]>();
    for (const nudge of nudges) {
      const key = `${nudge.seriesId}-${nudge.reportName}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(nudge);
    }
    return Array.from(groups.entries()).map(([, items]) => ({
      reportName: items[0].reportName,
      seriesId: items[0].seriesId,
      nudges: items,
    }));
  }, [nudges]);

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
    <div className="space-y-6">
      {groupedByReport.map((group) => (
        <div key={group.seriesId}>
          <h3 className="mb-3 text-sm font-medium text-muted-foreground">
            {group.reportName}
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {group.nudges.map((nudge) => (
              <NudgeCard
                key={nudge.id}
                nudge={nudge}
                onDismissed={handleDismissed}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
