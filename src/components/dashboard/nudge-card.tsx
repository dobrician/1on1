"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

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

function formatRelativeTime(
  dateStr: string,
  t: ReturnType<typeof useTranslations<"dashboard.nudge">>
): string {
  const target = new Date(dateStr);
  const now = new Date();
  const diffMs = target.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return t("pastDue");
  if (diffDays === 0) return t("today");
  if (diffDays === 1) return t("tomorrow");
  return t("inDays", { count: diffDays });
}

function PriorityDot({
  priority,
  label,
}: {
  priority: string;
  label: string;
}) {
  return (
    <span
      className={cn(
        "inline-block size-1.5 rounded-full shrink-0",
        priority === "high" && "bg-red-500",
        priority === "medium" && "bg-amber-500",
        priority === "low" && "bg-neutral-400"
      )}
      title={label}
    />
  );
}

export function NudgeCard({ nudge, onDismissed }: NudgeCardProps) {
  const queryClient = useQueryClient();
  const t = useTranslations("dashboard.nudge");

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
            <PriorityDot
              priority={nudge.priority}
              label={t("priority", { priority: nudge.priority })}
            />
            <span className="text-xs text-muted-foreground">
              {nudge.reportName}
              {nudge.targetSessionAt && (
                <> &middot; {formatRelativeTime(nudge.targetSessionAt, t)}</>
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
          className="size-11 shrink-0 opacity-100 md:size-7 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
          onClick={() => dismissMutation.mutate()}
          disabled={dismissMutation.isPending}
          title={t("dismiss")}
        >
          <X className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
