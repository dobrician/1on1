import { eq, and, lte, inArray, sql } from "drizzle-orm";
import { adminDb } from "@/lib/db";
import { notifications } from "@/lib/db/schema/notifications";

/**
 * Fetch pending notifications whose scheduledFor is in the past.
 * Uses adminDb for cross-tenant access (cron context).
 */
export async function getPendingNotifications(limit = 50) {
  return adminDb
    .select()
    .from(notifications)
    .where(
      and(
        eq(notifications.status, "pending"),
        lte(notifications.scheduledFor, new Date())
      )
    )
    .orderBy(notifications.scheduledFor)
    .limit(limit);
}

/**
 * Atomically claim pending notifications for processing.
 * Sets sentAt to prevent double-sends, returns claimed rows.
 */
export async function claimPendingNotifications(limit = 50) {
  return adminDb.execute<{
    id: string;
    tenant_id: string;
    user_id: string;
    type: string;
    channel: string;
    subject: string | null;
    body: string | null;
    reference_type: string | null;
    reference_id: string | null;
    scheduled_for: string;
    sent_at: string | null;
    status: string;
    error: string | null;
    created_at: string;
  }>(sql`
    UPDATE notification
    SET sent_at = NOW()
    WHERE id IN (
      SELECT id FROM notification
      WHERE status = 'pending' AND scheduled_for <= NOW()
      ORDER BY scheduled_for ASC
      LIMIT ${limit}
    )
    RETURNING *
  `);
}

/**
 * Mark a notification as successfully sent.
 */
export async function markNotificationSent(id: string) {
  await adminDb
    .update(notifications)
    .set({ status: "sent", sentAt: new Date() })
    .where(eq(notifications.id, id));
}

/**
 * Mark a notification as failed, storing the error message.
 * Clears sentAt so it is not mistaken for a sent notification.
 */
export async function markNotificationFailed(id: string, error: string) {
  await adminDb
    .update(notifications)
    .set({ status: "failed", error, sentAt: null })
    .where(eq(notifications.id, id));
}

/**
 * Cancel pending notifications for a given series.
 * Optionally filter by notification types.
 */
export async function cancelSeriesNotifications(
  seriesId: string,
  types?: string[]
) {
  const conditions = [
    eq(notifications.referenceId, seriesId),
    eq(notifications.referenceType, "series"),
    eq(notifications.status, "pending"),
  ];

  if (types && types.length > 0) {
    conditions.push(
      inArray(
        notifications.type,
        types as (typeof notifications.type.enumValues)[number][]
      )
    );
  }

  await adminDb
    .update(notifications)
    .set({ status: "cancelled" })
    .where(and(...conditions));
}
