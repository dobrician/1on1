"use client";

import Link from "next/link";
import { SeriesCard } from "@/components/series/series-card";
import { Button } from "@/components/ui/button";
import { Calendar, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import type { SeriesCardData } from "@/lib/queries/series";

interface UpcomingSeriesCardsProps {
  series: SeriesCardData[];
  currentUserId: string;
}

export function UpcomingSeriesCards({
  series,
  currentUserId,
}: UpcomingSeriesCardsProps) {
  const t = useTranslations("dashboard.upcoming");

  if (series.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <Calendar className="mx-auto mb-3 size-8 text-muted-foreground/50" />
        <p className="text-sm font-medium">{t("noSessions")}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("noSessionsDesc")}
        </p>
        <Button variant="outline" size="sm" className="mt-4" asChild>
          <Link href="/sessions/new">
            <Plus className="mr-1.5 size-3.5" />
            {t("newSeries")}
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {series.map((s) => (
        <SeriesCard key={s.id} series={s} currentUserId={currentUserId} />
      ))}
    </div>
  );
}
