"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, History } from "lucide-react";

export interface CorrectionEntry {
  id: string;
  sessionAnswerId: string;
  correctedById: string;
  correctorFirstName: string;
  correctorLastName: string;
  originalAnswerText: string | null;
  originalAnswerNumeric: number | null;
  originalAnswerJson: unknown;
  originalSkipped: boolean;
  correctionReason: string;
  createdAt: string; // ISO string
}

interface CorrectionHistoryPanelProps {
  corrections: CorrectionEntry[];
  isManager: boolean;
}

export function CorrectionHistoryPanel({
  corrections,
  isManager,
}: CorrectionHistoryPanelProps) {
  const hasCorrectionHistory = corrections.length > 0;
  const [historyOpen, setHistoryOpen] = useState(hasCorrectionHistory);

  return (
    <div className="mt-6 mb-6">
      <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
        <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md px-1 py-2 hover:bg-muted/50 transition-colors">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <History className="h-5 w-5 text-muted-foreground" />
            Correction History
            {hasCorrectionHistory && (
              <Badge variant="outline" className="text-xs">
                {corrections.length}
              </Badge>
            )}
          </h2>
          {historyOpen ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-3">
            {hasCorrectionHistory ? (
              <div className="space-y-3">
                {corrections.map((entry) => {
                  const date = new Date(entry.createdAt);
                  const dateLabel = date.toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  });

                  return (
                    <div
                      key={entry.id}
                      className="rounded-md border px-4 py-3 text-sm"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-medium">
                          {entry.correctorFirstName} {entry.correctorLastName}
                        </span>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {dateLabel}
                        </span>
                      </div>
                      {isManager && (
                        <p className="text-muted-foreground mt-1">
                          <span className="font-medium text-foreground">
                            Reason:{" "}
                          </span>
                          {entry.correctionReason}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                No corrections have been made to this session.
              </p>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
