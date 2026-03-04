"use client";

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PeriodSelector,
  periodToDateRange,
  type PeriodValue,
} from "@/components/analytics/period-selector";
import { ScoreTrendChart } from "@/components/analytics/score-trend-chart";
import { CategoryBreakdown } from "@/components/analytics/category-breakdown";
import { SessionComparison } from "@/components/analytics/session-comparison";
import type {
  ScoreTrendPoint,
  CategoryAverage,
  SessionComparisonRow,
} from "@/lib/analytics/queries";

interface TargetUser {
  id: string;
  firstName: string;
  lastName: string;
  jobTitle: string | null;
  avatarUrl: string | null;
}

interface SessionOption {
  id: string;
  date: string;
  number: number;
}

interface AnalyticsApiResponse {
  scoreTrend: ScoreTrendPoint[];
  categoryAverages: CategoryAverage[];
  sessions: SessionOption[];
  comparison: SessionComparisonRow[] | null;
}

interface IndividualAnalyticsClientProps {
  targetUser: TargetUser;
  initialScoreTrend: ScoreTrendPoint[];
  initialCategoryAverages: CategoryAverage[];
  initialSessions: SessionOption[];
  targetUserId: string;
}

export function IndividualAnalyticsClient({
  targetUser,
  initialScoreTrend,
  initialCategoryAverages,
  initialSessions,
  targetUserId,
}: IndividualAnalyticsClientProps) {
  const defaultRange = periodToDateRange("3mo");
  const [period, setPeriod] = useState<PeriodValue>({
    preset: "3mo",
    startDate: defaultRange.startDate,
    endDate: defaultRange.endDate,
  });

  const [compareIds, setCompareIds] = useState<{
    id1: string;
    id2: string;
  } | null>(null);

  const startStr = period.startDate.toISOString().split("T")[0];
  const endStr = period.endDate.toISOString().split("T")[0];

  // Fetch analytics data when period changes
  const { data: analyticsData, isLoading } = useQuery<AnalyticsApiResponse>({
    queryKey: ["analytics", targetUserId, period.preset, startStr, endStr],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (period.preset === "custom") {
        params.set("startDate", startStr!);
        params.set("endDate", endStr!);
      } else {
        params.set("period", period.preset);
      }
      const res = await fetch(
        `/api/analytics/individual/${targetUserId}?${params}`,
      );
      if (!res.ok) throw new Error("Failed to fetch analytics");
      return res.json();
    },
    initialData:
      period.preset === "3mo" && !compareIds
        ? {
            scoreTrend: initialScoreTrend,
            categoryAverages: initialCategoryAverages,
            sessions: initialSessions,
            comparison: null,
          }
        : undefined,
    staleTime: 60_000,
  });

  // Fetch comparison data
  const { data: comparisonResult } = useQuery<AnalyticsApiResponse>({
    queryKey: [
      "analytics-compare",
      targetUserId,
      compareIds?.id1,
      compareIds?.id2,
    ],
    queryFn: async () => {
      if (!compareIds) throw new Error("No comparison IDs");
      const params = new URLSearchParams({
        period: period.preset === "custom" ? "3mo" : period.preset,
        compare: `${compareIds.id1},${compareIds.id2}`,
      });
      const res = await fetch(
        `/api/analytics/individual/${targetUserId}?${params}`,
      );
      if (!res.ok) throw new Error("Failed to fetch comparison");
      return res.json();
    },
    enabled: !!compareIds,
    staleTime: 60_000,
  });

  const handleCompare = useCallback((id1: string, id2: string) => {
    setCompareIds({ id1, id2 });
  }, []);

  const scoreTrend = analyticsData?.scoreTrend ?? [];
  const categoryAverages = analyticsData?.categoryAverages ?? [];
  const sessionList = analyticsData?.sessions ?? [];
  const comparisonData = comparisonResult?.comparison ?? null;

  const initials = `${targetUser.firstName[0]}${targetUser.lastName[0]}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Avatar className="h-12 w-12">
          <AvatarImage
            src={targetUser.avatarUrl ?? undefined}
            alt={`${targetUser.firstName} ${targetUser.lastName}`}
          />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {targetUser.firstName} {targetUser.lastName}
          </h1>
          {targetUser.jobTitle && (
            <p className="text-sm text-muted-foreground">
              {targetUser.jobTitle}
            </p>
          )}
        </div>
      </div>

      {/* Period selector */}
      <PeriodSelector value={period} onChange={setPeriod} />

      {/* Charts grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Score Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ScoreTrendChart data={scoreTrend} loading={isLoading} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Category Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryBreakdown data={categoryAverages} />
          </CardContent>
        </Card>
      </div>

      {/* Session comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Session Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <SessionComparison
            sessions={sessionList}
            onCompare={handleCompare}
            comparisonData={comparisonData}
          />
        </CardContent>
      </Card>
    </div>
  );
}
