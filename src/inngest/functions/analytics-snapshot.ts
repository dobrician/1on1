import { inngest } from "../client";
import { computeSessionSnapshot } from "@/lib/analytics/compute";
import { withTenantContext } from "@/lib/db/tenant-context";
import { adminDb } from "@/lib/db";
import { sessions, meetingSeries } from "@/lib/db/schema";
import { eq, and, isNull, sql } from "drizzle-orm";

/**
 * Analytics snapshot computation triggered by session completion.
 *
 * Listens to "session/completed" events and computes per-category and overall
 * session scores, storing them in analytics_snapshot for fast dashboard queries.
 */
export const computeAnalyticsSnapshot = inngest.createFunction(
  {
    id: "compute-analytics-snapshot",
    retries: 3,
    concurrency: [{ scope: "fn", limit: 10 }],
  },
  { event: "session/completed" },
  async ({ event, step }) => {
    const { sessionId, seriesId, tenantId, managerId, reportId } = event.data;

    await step.run("compute-snapshot", async () => {
      await withTenantContext(tenantId, managerId, async (tx) => {
        await computeSessionSnapshot(tx, sessionId, tenantId, reportId, seriesId);
      });
    });

    return { sessionId, status: "snapshot_computed" };
  },
);

/**
 * Daily cron sweep for sessions that were completed but never ingested.
 *
 * Safety net: scans for sessions with status='completed' and no
 * analytics_ingested_at, then sends "session/completed" events to trigger
 * snapshot computation for each.
 *
 * Runs at 3 AM daily using adminDb to bypass RLS (cross-tenant scan).
 */
export const analyticsSnapshotSweep = inngest.createFunction(
  {
    id: "analytics-snapshot-sweep",
    retries: 2,
  },
  { cron: "0 3 * * *" },
  async ({ step }) => {
    // Find un-ingested completed sessions
    const unIngested = await step.run("find-undigested", async () => {
      const rows = await adminDb
        .select({
          sessionId: sessions.id,
          seriesId: sessions.seriesId,
          tenantId: sessions.tenantId,
        })
        .from(sessions)
        .where(
          and(
            eq(sessions.status, "completed"),
            isNull(sessions.analyticsIngestedAt),
            sql`${sessions.completedAt} IS NOT NULL`,
          ),
        )
        .limit(500);

      return rows;
    });

    if (unIngested.length === 0) {
      return { swept: 0 };
    }

    // For each un-ingested session, look up manager/report from series and send event
    await step.run("send-events", async () => {
      for (const row of unIngested) {
        const [series] = await adminDb
          .select({
            managerId: meetingSeries.managerId,
            reportId: meetingSeries.reportId,
          })
          .from(meetingSeries)
          .where(eq(meetingSeries.id, row.seriesId))
          .limit(1);

        if (!series) continue;

        await inngest.send({
          name: "session/completed",
          data: {
            sessionId: row.sessionId,
            seriesId: row.seriesId,
            tenantId: row.tenantId,
            managerId: series.managerId,
            reportId: series.reportId,
          },
        });
      }
    });

    return { swept: unIngested.length };
  },
);
