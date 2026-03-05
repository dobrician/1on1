import { NextResponse } from "next/server";
import { claimPendingNotifications, markNotificationSent, markNotificationFailed } from "@/lib/notifications/queries";
import { processNotification } from "@/lib/notifications/sender";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Auth: verify CRON_SECRET
  const authHeader = request.headers.get("authorization");
  const expectedToken = process.env.CRON_SECRET;

  if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Atomically claim pending notifications
  const result = await claimPendingNotifications(50);
  const claimed = result.rows;

  let sent = 0;
  let failed = 0;

  for (const notification of claimed) {
    try {
      await processNotification(notification);
      await markNotificationSent(notification.id);
      sent++;
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error(
        `[cron/notifications] Failed to process ${notification.id}:`,
        errMsg
      );
      await markNotificationFailed(notification.id, errMsg);
      failed++;
    }
  }

  return NextResponse.json({
    processed: claimed.length,
    sent,
    failed,
  });
}
