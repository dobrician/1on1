"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sparkles, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { NudgeData } from "@/components/dashboard/nudge-card";
import { useTranslations } from "next-intl";

interface NudgesModalProps {
  seriesId: string;
  reportName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function PriorityDot({ priority }: { priority: string }) {
  return (
    <span
      className={cn(
        "inline-block size-2 rounded-full shrink-0",
        priority === "high" && "bg-red-500",
        priority === "medium" && "bg-amber-500",
        priority === "low" && "bg-neutral-400"
      )}
    />
  );
}

function NudgeItem({
  nudge,
  seriesId,
}: {
  nudge: NudgeData;
  seriesId: string;
}) {
  const t = useTranslations("dashboard.nudgesModal");
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
      // Optimistic: remove from query cache immediately
      queryClient.setQueryData<NudgeData[]>(
        ["nudges", seriesId],
        (old) => old?.filter((n) => n.id !== nudge.id) ?? []
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["nudges"] });
    },
  });

  return (
    <div className="group flex items-start gap-3 rounded-lg border bg-card p-4 transition-shadow hover:shadow-sm">
      <div className="mt-0.5 rounded-full bg-amber-50 p-1.5 dark:bg-amber-950/50">
        <Sparkles className="size-3.5 text-amber-600 dark:text-amber-400" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <PriorityDot priority={nudge.priority} />
          <span className="text-xs capitalize text-muted-foreground">
            {nudge.priority}
          </span>
        </div>
        <p className="text-sm leading-relaxed">{nudge.content}</p>
        {nudge.reason && (
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
            {nudge.reason}
          </p>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="size-7 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
        onClick={() => dismissMutation.mutate()}
        disabled={dismissMutation.isPending}
        title={t("dismiss")}
      >
        <X className="size-3.5" />
      </Button>
    </div>
  );
}

export function NudgesModal({
  seriesId,
  reportName,
  open,
  onOpenChange,
}: NudgesModalProps) {
  const t = useTranslations("dashboard.nudgesModal");

  const { data, isLoading } = useQuery({
    queryKey: ["nudges", seriesId],
    queryFn: async () => {
      const res = await fetch(`/api/nudges?seriesId=${seriesId}`);
      if (!res.ok) throw new Error("Failed to fetch nudges");
      const json = await res.json();
      return json.nudges as NudgeData[];
    },
    enabled: open,
  });

  const nudges = data ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-amber-600" />
            {t("title", { name: reportName })}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 pt-2">
          {isLoading && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Loading...
            </div>
          )}

          {!isLoading && nudges.length === 0 && (
            <div className="rounded-lg border border-dashed py-8 text-center">
              <Sparkles className="mx-auto mb-2 size-6 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">{t("empty")}</p>
            </div>
          )}

          {nudges.map((nudge) => (
            <NudgeItem key={nudge.id} nudge={nudge} seriesId={seriesId} />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
