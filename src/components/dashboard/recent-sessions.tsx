"use client";

import Link from "next/link";
import { Clock, FileText } from "lucide-react";
import type { RecentSession } from "@/lib/queries/dashboard";
import { useTranslations, useFormatter } from "next-intl";
import { EmptyState } from "@/components/ui/empty-state";
import { StarRating } from "@/components/ui/star-rating";

interface RecentSessionsProps {
  sessions: RecentSession[];
}

export function RecentSessions({ sessions }: RecentSessionsProps) {
  const t = useTranslations("dashboard.recent");
  const format = useFormatter();

  if (sessions.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        heading={t("noSessions")}
        description={t("noSessionsDesc")}
      />
    );
  }

  return (
    <div className="space-y-1">
      {sessions.map((s) => (
        <Link
          key={s.id}
          href={`/sessions/${s.id}/summary`}
          className="flex items-center gap-3 rounded-md border px-4 py-3 transition-all duration-200 hover:bg-muted/50 hover:shadow-sm"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground shrink-0">
                #{s.sessionNumber}
              </span>
              <span className="text-sm font-medium truncate">
                {s.reportName}
              </span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                <Clock className="size-3" />
                {format.dateTime(new Date(s.completedAt), { month: "short", day: "numeric" })}
              </span>
            </div>
            {s.aiSummarySnippet && (
              <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                {s.aiSummarySnippet}
              </p>
            )}
          </div>
          <StarRating score={s.sessionScore} size="sm" className="shrink-0" />
        </Link>
      ))}
    </div>
  );
}
