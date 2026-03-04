"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface NudgeData {
  id: string;
  content: string;
  reason: string | null;
  priority: string;
  seriesId: string;
  reportName: string;
  targetSessionAt: string | null;
}

interface NudgeCardProps {
  nudge: NudgeData;
  onDismissed?: (nudgeId: string) => void;
}

function formatRelativeTime(dateStr: string): string {
  const target = new Date(dateStr);
  const now = new Date();
  const diffMs = target.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "past due";
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "tomorrow";
  return `in ${diffDays} days`;
}

function PriorityDot({ priority }: { priority: string }) {
  return (
    <span
      className={cn(
        "inline-block size-1.5 rounded-full shrink-0",
        priority === "high" && "bg-red-500",
        priority === "medium" && "bg-amber-500",
        priority === "low" && "bg-neutral-400"
      )}
      title={`${priority} priority`}
    />
  );
}

export function NudgeCard({ nudge, onDismissed }: NudgeCardProps) {
  const queryClient = useQueryClient();

  const dismissMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/nudges/${nudge.id}/dismiss`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to dismiss nudge");
      return res.json();
    },
    onMutate: () => {
      // Optimistic: call parent to remove immediately
      onDismissed?.(nudge.id);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["nudges"] });
    },
  });

  return (
    <div className="group relative rounded-lg border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-full bg-amber-50 p-1.5 dark:bg-amber-950/50">
          <Sparkles className="size-3.5 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <PriorityDot priority={nudge.priority} />
            <span className="text-xs text-muted-foreground">
              {nudge.reportName}
              {nudge.targetSessionAt && (
                <> &middot; {formatRelativeTime(nudge.targetSessionAt)}</>
              )}
            </span>
          </div>
          <p className="text-sm leading-relaxed text-foreground">
            {nudge.content}
          </p>
          {nudge.reason && (
            <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
              {nudge.reason}
            </p>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => dismissMutation.mutate()}
          disabled={dismissMutation.isPending}
          title="Dismiss nudge"
        >
          <X className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
