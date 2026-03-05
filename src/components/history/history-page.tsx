"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScoreSparkline } from "@/components/session/score-sparkline";
import { ClipboardList, Loader2, Search, X } from "lucide-react";

// --- Types ---

interface HistorySession {
  id: string;
  sessionNumber: number;
  scheduledAt: string;
  completedAt: string | null;
  status: string;
  sessionScore: number | null;
  durationMinutes: number | null;
  seriesId: string;
  reportFirstName: string;
  reportLastName: string;
  managerFirstName: string;
  managerLastName: string;
}

interface SeriesOption {
  id: string;
  reportName: string;
  managerName: string;
}

interface HistoryPageProps {
  initialSessions: HistorySession[];
  initialSeriesScores: Record<string, number[]>;
  initialHasMore: boolean;
  initialNextCursor: string | null;
  seriesOptions: SeriesOption[];
}

interface HistoryApiResponse {
  sessions: HistorySession[];
  seriesScores: Record<string, number[]>;
  hasMore: boolean;
  nextCursor: string | null;
}

interface SearchSessionResult {
  sessionId: string;
  sessionNumber: number;
  snippet: string;
  seriesId: string;
  reportName: string;
  scheduledAt: string;
}

// --- Helpers ---

const statusVariant: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  completed: "default",
  in_progress: "secondary",
  scheduled: "outline",
  cancelled: "destructive",
  missed: "destructive",
};

function getScoreColor(score: number): string {
  if (score >= 3.5) return "text-green-600 dark:text-green-400";
  if (score >= 2.5) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

// --- Component ---

export function HistoryPage({
  initialSessions,
  initialSeriesScores,
  initialHasMore,
  initialNextCursor,
  seriesOptions,
}: HistoryPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read filter state from URL
  const [statusFilter, setStatusFilter] = useState(
    searchParams.get("status") ?? "all"
  );
  const [fromDate, setFromDate] = useState(searchParams.get("from") ?? "");
  const [toDate, setToDate] = useState(searchParams.get("to") ?? "");
  const [seriesFilter, setSeriesFilter] = useState(
    searchParams.get("seriesId") ?? "all"
  );

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchSessionResult[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Accumulated sessions for "Load more" behavior
  const [allSessions, setAllSessions] = useState<HistorySession[]>(initialSessions);
  const [allSeriesScores, setAllSeriesScores] =
    useState<Record<string, number[]>>(initialSeriesScores);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isFiltering, setIsFiltering] = useState(false);

  // Check if any filter is active
  const hasActiveFilters = statusFilter !== "all" || fromDate || toDate || seriesFilter !== "all";

  // Build query params string
  const buildQueryString = useCallback(
    (overrides?: { cursor?: string }) => {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);
      if (seriesFilter !== "all") params.set("seriesId", seriesFilter);
      if (overrides?.cursor) params.set("cursor", overrides.cursor);
      return params.toString();
    },
    [statusFilter, fromDate, toDate, seriesFilter]
  );

  // Apply filters and update URL
  const applyFilters = useCallback(
    (newStatus: string, newFrom: string, newTo: string, newSeries: string) => {
      setStatusFilter(newStatus);
      setFromDate(newFrom);
      setToDate(newTo);
      setSeriesFilter(newSeries);

      // Update URL search params
      const params = new URLSearchParams();
      if (newStatus !== "all") params.set("status", newStatus);
      if (newFrom) params.set("from", newFrom);
      if (newTo) params.set("to", newTo);
      if (newSeries !== "all") params.set("seriesId", newSeries);

      const qs = params.toString();
      router.push(`/history${qs ? `?${qs}` : ""}`, { scroll: false });

      // Fetch new data
      setIsFiltering(true);
      const fetchUrl = `/api/history${qs ? `?${qs}` : ""}`;
      fetch(fetchUrl)
        .then((res) => res.json())
        .then((data: HistoryApiResponse) => {
          setAllSessions(data.sessions);
          setAllSeriesScores(data.seriesScores);
          setHasMore(data.hasMore);
          setNextCursor(data.nextCursor);
        })
        .catch(console.error)
        .finally(() => setIsFiltering(false));
    },
    [router]
  );

  // Load more handler
  const loadMore = useCallback(async () => {
    if (!nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const qs = buildQueryString({ cursor: nextCursor });
      const res = await fetch(`/api/history${qs ? `?${qs}` : ""}`);
      if (!res.ok) throw new Error("Failed to load more");
      const data: HistoryApiResponse = await res.json();
      setAllSessions((prev) => [...prev, ...data.sessions]);
      setAllSeriesScores((prev) => ({ ...prev, ...data.seriesScores }));
      setHasMore(data.hasMore);
      setNextCursor(data.nextCursor);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [nextCursor, isLoadingMore, buildQueryString]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    applyFilters("all", "", "", "all");
  }, [applyFilters]);

  // Search handler with debounce
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    const trimmed = value.trim();
    if (!trimmed) {
      setSearchResults(null);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchDebounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(trimmed)}&limit=20`
        );
        if (!res.ok) throw new Error("Search failed");
        const data = await res.json();
        setSearchResults(data.results.sessions);
      } catch (err) {
        console.error("Search error:", err);
        setSearchResults(null);
      } finally {
        setIsSearching(false);
      }
    }, 500);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQuery("");
    setSearchResults(null);
    setIsSearching(false);
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
  }, []);

  // Group sessions by series
  const groupedSessions = useMemo(() => {
    const groups = new Map<
      string,
      {
        seriesId: string;
        reportName: string;
        managerName: string;
        sessions: HistorySession[];
      }
    >();

    for (const s of allSessions) {
      if (!groups.has(s.seriesId)) {
        groups.set(s.seriesId, {
          seriesId: s.seriesId,
          reportName: `${s.reportFirstName} ${s.reportLastName}`.trim(),
          managerName: `${s.managerFirstName} ${s.managerLastName}`.trim(),
          sessions: [],
        });
      }
      groups.get(s.seriesId)!.sessions.push(s);
    }

    return Array.from(groups.values());
  }, [allSessions]);

  const isShowingSearch = searchResults !== null || isSearching;

  return (
    <div className="space-y-6">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search notes, answers, talking points..."
          className="pl-9 pr-9"
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
        {searchQuery && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Filter bar */}
      <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-end">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            Status
          </label>
          <Select
            value={statusFilter}
            onValueChange={(val) =>
              applyFilters(val, fromDate, toDate, seriesFilter)
            }
          >
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            From
          </label>
          <Input
            type="date"
            className="w-full sm:w-[160px]"
            value={fromDate}
            onChange={(e) =>
              applyFilters(statusFilter, e.target.value, toDate, seriesFilter)
            }
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            To
          </label>
          <Input
            type="date"
            className="w-full sm:w-[160px]"
            value={toDate}
            onChange={(e) =>
              applyFilters(statusFilter, fromDate, e.target.value, seriesFilter)
            }
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            Series
          </label>
          <Select
            value={seriesFilter}
            onValueChange={(val) =>
              applyFilters(statusFilter, fromDate, toDate, val)
            }
          >
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="All series" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All series</SelectItem>
              {seriesOptions.map((opt) => (
                <SelectItem key={opt.id} value={opt.id}>
                  {opt.reportName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="gap-1 text-muted-foreground"
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </Button>
        )}
      </div>

      {/* Search results */}
      {isSearching && (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Searching...
        </div>
      )}

      {!isSearching && isShowingSearch && searchResults && searchResults.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-lg font-medium text-muted-foreground">
            No sessions found matching &quot;{searchQuery.trim()}&quot;.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Try different keywords or clear the search.
          </p>
        </div>
      )}

      {!isSearching && isShowingSearch && searchResults && searchResults.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {searchResults.length} session{searchResults.length !== 1 ? "s" : ""} found
          </p>
          <div className="rounded-lg border divide-y">
            {searchResults.map((r) => (
              <Link
                key={r.sessionId}
                href={`/sessions/${r.sessionId}/summary`}
              >
                <div className="flex items-center justify-between px-4 py-3 text-sm transition-colors hover:bg-muted/50 cursor-pointer">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-medium tabular-nums">
                        #{r.sessionNumber}
                      </span>
                      <span className="text-muted-foreground">
                        {r.reportName}
                      </span>
                      <span className="text-muted-foreground">
                        {new Date(r.scheduledAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    <p
                      className="mt-1 truncate text-xs text-muted-foreground"
                      dangerouslySetInnerHTML={{ __html: r.snippet }}
                    />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Session groups (hidden during search) */}
      {!isShowingSearch && (
        <>
          {groupedSessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
              <ClipboardList className="mb-4 size-12 text-muted-foreground/30" />
              <h3 className="text-lg font-medium">
                {hasActiveFilters ? "No sessions match your filters" : "No sessions yet"}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {hasActiveFilters
                  ? "Try adjusting your filters or clearing them."
                  : "Complete your first 1:1 session to see it here."}
              </p>
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={clearFilters}
                >
                  Clear Filters
                </Button>
              )}
              {!hasActiveFilters && (
                <Button variant="outline" size="sm" className="mt-4" asChild>
                  <Link href="/sessions">Go to Sessions</Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {groupedSessions.map((group) => (
                <div key={group.seriesId} className="rounded-lg border">
                  {/* Group header */}
                  <div className="flex items-center justify-between border-b px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="min-w-0">
                        <p className="font-medium truncate">
                          {group.reportName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          with {group.managerName}
                        </p>
                      </div>
                    </div>
                    <div className="w-24 shrink-0">
                      <ScoreSparkline
                        data={allSeriesScores[group.seriesId] ?? []}
                        height={32}
                      />
                    </div>
                  </div>

                  {/* Session rows */}
                  <div className="divide-y">
                    {group.sessions.map((s) => {
                      const isCompleted = s.status === "completed";
                      const isInProgress = s.status === "in_progress";

                      const row = (
                        <div
                          className={`flex items-center justify-between px-4 py-3 text-sm transition-colors ${
                            isCompleted || isInProgress
                              ? "hover:bg-muted/50 cursor-pointer"
                              : ""
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="font-medium tabular-nums">
                              #{s.sessionNumber}
                            </span>
                            <span className="text-muted-foreground">
                              {new Date(s.scheduledAt).toLocaleDateString(
                                "en-US",
                                {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                }
                              )}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            {s.sessionScore !== null && (
                              <span
                                className={`font-medium tabular-nums ${getScoreColor(s.sessionScore)}`}
                              >
                                {s.sessionScore.toFixed(1)}
                              </span>
                            )}
                            {s.durationMinutes && (
                              <span className="text-xs text-muted-foreground">
                                {s.durationMinutes} min
                              </span>
                            )}
                            <Badge
                              variant={statusVariant[s.status] ?? "outline"}
                              className="text-xs"
                            >
                              {s.status.replace("_", " ")}
                            </Badge>
                          </div>
                        </div>
                      );

                      if (isCompleted) {
                        return (
                          <Link key={s.id} href={`/sessions/${s.id}/summary`}>
                            {row}
                          </Link>
                        );
                      }
                      if (isInProgress) {
                        return (
                          <Link key={s.id} href={`/wizard/${s.id}`}>
                            {row}
                          </Link>
                        );
                      }

                      return <div key={s.id}>{row}</div>;
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Load more */}
          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                onClick={loadMore}
                disabled={isLoadingMore}
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  "Load more"
                )}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
