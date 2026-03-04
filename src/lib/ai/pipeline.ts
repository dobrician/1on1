import { gatherSessionContext } from "./context";
import {
  generateSummary,
  generateManagerAddendum,
  generateNudges,
  generateActionSuggestions,
} from "./service";
import { withTenantContext } from "@/lib/db/tenant-context";
import { logAuditEvent } from "@/lib/audit/log";
import { sessions, meetingSeries, aiNudges } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

interface PipelineInput {
  sessionId: string;
  seriesId: string;
  tenantId: string;
  managerId: string;
  reportId: string;
}

/**
 * Run the full post-session AI pipeline directly (no Inngest).
 *
 * This is a fire-and-forget function — call it without await.
 * It handles its own error handling and sets aiStatus to "failed" on error.
 */
export async function runAIPipelineDirect(input: PipelineInput): Promise<void> {
  const { sessionId, seriesId, tenantId, managerId, reportId } = input;

  try {
    // Set status to generating
    await withTenantContext(tenantId, managerId, async (tx) => {
      await tx
        .update(sessions)
        .set({ aiStatus: "generating", updatedAt: new Date() })
        .where(eq(sessions.id, sessionId));
    });

    // Gather context
    const context = await gatherSessionContext({
      sessionId,
      seriesId,
      tenantId,
      managerId,
      reportId,
    });

    // Generate summary
    const summary = await generateSummary(context);

    // Generate manager addendum
    const addendum = await generateManagerAddendum(context);

    // Store summary + addendum
    await withTenantContext(tenantId, managerId, async (tx) => {
      await tx
        .update(sessions)
        .set({
          aiSummary: summary,
          aiManagerAddendum: addendum,
          updatedAt: new Date(),
        })
        .where(eq(sessions.id, sessionId));
    });

    // Generate action suggestions
    const suggestions = await generateActionSuggestions(context, summary);

    // Store suggestions
    await withTenantContext(tenantId, managerId, async (tx) => {
      await tx
        .update(sessions)
        .set({
          aiSuggestions: suggestions,
          updatedAt: new Date(),
        })
        .where(eq(sessions.id, sessionId));
    });

    // Generate nudges
    const nudges = await generateNudges(context);

    const seriesData = await withTenantContext(
      tenantId,
      managerId,
      async (tx) => {
        const [series] = await tx
          .select({ nextSessionAt: meetingSeries.nextSessionAt })
          .from(meetingSeries)
          .where(eq(meetingSeries.id, seriesId))
          .limit(1);
        return series;
      }
    );

    // Insert nudges
    await withTenantContext(tenantId, managerId, async (tx) => {
      for (const nudge of nudges.nudges) {
        await tx.insert(aiNudges).values({
          seriesId,
          tenantId,
          targetSessionAt: seriesData?.nextSessionAt ?? null,
          content: nudge.content,
          reason: nudge.reason,
          priority: nudge.priority,
          sourceSessionId: sessionId,
        });
      }
    });

    // Finalize
    const now = new Date();
    await withTenantContext(tenantId, managerId, async (tx) => {
      await tx
        .update(sessions)
        .set({
          aiStatus: "completed",
          aiCompletedAt: now,
          updatedAt: now,
        })
        .where(eq(sessions.id, sessionId));

      await logAuditEvent(tx, {
        tenantId,
        actorId: managerId,
        action: "ai_pipeline_completed",
        resourceType: "session",
        resourceId: sessionId,
        metadata: {
          summaryKeyTakeaways: summary.keyTakeaways.length,
          suggestionsCount: suggestions.suggestions.length,
          mode: "direct",
        },
      });
    });

    console.log(`[AI Pipeline] Completed for session ${sessionId}`);
  } catch (error) {
    console.error(`[AI Pipeline] Failed for session ${sessionId}:`, error);

    // Set status to failed
    try {
      await withTenantContext(tenantId, managerId, async (tx) => {
        await tx
          .update(sessions)
          .set({ aiStatus: "failed", updatedAt: new Date() })
          .where(eq(sessions.id, sessionId));
      });
    } catch (failError) {
      console.error("[AI Pipeline] Failed to set failed status:", failError);
    }
  }
}
