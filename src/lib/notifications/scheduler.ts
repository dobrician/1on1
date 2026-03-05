import { adminDb } from "@/lib/db";
import { notifications } from "@/lib/db/schema/notifications";
import { cancelSeriesNotifications } from "./queries";

interface ScheduleSeriesParams {
  tenantId: string;
  seriesId: string;
  managerId: string;
  reportId: string;
  nextSessionAt: Date;
  reminderHoursBefore: number;
  managerName: string;
  reportName: string;
}

/**
 * Schedule pre-meeting and agenda-prep notifications for a series.
 * Cancels any existing pending notifications first, then creates new ones.
 */
export async function scheduleSeriesNotifications(
  params: ScheduleSeriesParams
) {
  const {
    tenantId,
    seriesId,
    managerId,
    reportId,
    nextSessionAt,
    reminderHoursBefore,
  } = params;

  // Cancel existing pending notifications for pre_meeting and agenda_prep
  await cancelSeriesNotifications(seriesId, ["pre_meeting", "agenda_prep"]);

  const now = new Date();
  const reminderAt = new Date(
    nextSessionAt.getTime() - reminderHoursBefore * 3600000
  );
  const agendaPrepAt = new Date(nextSessionAt.getTime() - 48 * 3600000);

  const toInsert: (typeof notifications.$inferInsert)[] = [];

  // Pre-meeting reminders (manager + report)
  if (reminderAt > now) {
    toInsert.push(
      {
        tenantId,
        userId: managerId,
        type: "pre_meeting",
        channel: "email",
        referenceType: "series",
        referenceId: seriesId,
        scheduledFor: reminderAt,
        status: "pending",
      },
      {
        tenantId,
        userId: reportId,
        type: "pre_meeting",
        channel: "email",
        referenceType: "series",
        referenceId: seriesId,
        scheduledFor: reminderAt,
        status: "pending",
      }
    );
  }

  // Agenda prep reminders (manager + report)
  if (agendaPrepAt > now) {
    toInsert.push(
      {
        tenantId,
        userId: managerId,
        type: "agenda_prep",
        channel: "email",
        referenceType: "series",
        referenceId: seriesId,
        scheduledFor: agendaPrepAt,
        status: "pending",
      },
      {
        tenantId,
        userId: reportId,
        type: "agenda_prep",
        channel: "email",
        referenceType: "series",
        referenceId: seriesId,
        scheduledFor: agendaPrepAt,
        status: "pending",
      }
    );
  }

  if (toInsert.length > 0) {
    await adminDb.insert(notifications).values(toInsert);
  }

  return { scheduled: toInsert.length };
}
