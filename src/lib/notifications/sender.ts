import { eq, and } from "drizzle-orm";
import { render } from "@react-email/render";
import { adminDb } from "@/lib/db";
import { meetingSeries } from "@/lib/db/schema/series";
import { users } from "@/lib/db/schema/users";
import { aiNudges } from "@/lib/db/schema/nudges";
import { getTransport, getEmailFrom } from "@/lib/email/send";
import { PreMeetingReminderEmail } from "@/lib/email/templates/pre-meeting-reminder";
import { AgendaPrepEmail } from "@/lib/email/templates/agenda-prep";

interface ClaimedNotification {
  id: string;
  tenant_id: string;
  user_id: string;
  type: string;
  reference_type: string | null;
  reference_id: string | null;
}

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

/**
 * Process a single claimed notification -- look up context, render template, send email.
 */
export async function processNotification(
  notification: ClaimedNotification
): Promise<void> {
  switch (notification.type) {
    case "pre_meeting":
      await processPreMeeting(notification);
      break;
    case "agenda_prep":
      await processAgendaPrep(notification);
      break;
    case "session_summary":
      // Session summary emails are event-driven (sent after AI pipeline completes).
      // They should not be processed by the cron scheduler.
      console.warn(
        `[notifications] session_summary notification ${notification.id} should be event-driven, not cron-scheduled`
      );
      break;
    default:
      console.warn(
        `[notifications] Unhandled notification type: ${notification.type}`
      );
  }
}

async function processPreMeeting(
  notification: ClaimedNotification
): Promise<void> {
  if (!notification.reference_id) {
    throw new Error("Pre-meeting notification missing referenceId");
  }

  const series = await adminDb.query.meetingSeries.findFirst({
    where: eq(meetingSeries.id, notification.reference_id),
  });
  if (!series) {
    throw new Error(`Series ${notification.reference_id} not found`);
  }

  const [recipient, manager, report] = await Promise.all([
    adminDb.query.users.findFirst({
      where: eq(users.id, notification.user_id),
      columns: { email: true, firstName: true, lastName: true },
    }),
    adminDb.query.users.findFirst({
      where: eq(users.id, series.managerId),
      columns: { firstName: true, lastName: true },
    }),
    adminDb.query.users.findFirst({
      where: eq(users.id, series.reportId),
      columns: { firstName: true, lastName: true },
    }),
  ]);

  if (!recipient || !manager || !report) {
    throw new Error("Could not resolve users for pre-meeting notification");
  }

  const isManager = notification.user_id === series.managerId;
  const otherParty = isManager ? report : manager;
  const recipientName = `${recipient.firstName}`;
  const otherPartyName = `${otherParty.firstName} ${otherParty.lastName}`;

  const meetingDate = series.nextSessionAt
    ? series.nextSessionAt.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      })
    : "your next session";
  const meetingTime = series.nextSessionAt
    ? series.nextSessionAt.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      })
    : "";

  const baseUrl = getBaseUrl();
  const seriesUrl = `${baseUrl}/sessions/${series.id}`;

  const html = await render(
    PreMeetingReminderEmail({
      recipientName,
      otherPartyName,
      meetingDate,
      meetingTime,
      seriesUrl,
      // TODO(13-03): replace with createEmailTranslator
      heading: "Upcoming 1:1 Meeting",
      greeting: `Hi ${recipientName},`,
      body: `You have a 1:1 meeting with ${otherPartyName} coming up on ${meetingDate} at ${meetingTime}.`,
      buttonLabel: "Open Meeting Series",
      footer: "",
    })
  );

  await getTransport().sendMail({
    from: getEmailFrom(),
    to: recipient.email,
    subject: `Upcoming 1:1 with ${otherPartyName}`,
    html,
  });
}

async function processAgendaPrep(
  notification: ClaimedNotification
): Promise<void> {
  if (!notification.reference_id) {
    throw new Error("Agenda prep notification missing referenceId");
  }

  const series = await adminDb.query.meetingSeries.findFirst({
    where: eq(meetingSeries.id, notification.reference_id),
  });
  if (!series) {
    throw new Error(`Series ${notification.reference_id} not found`);
  }

  const [recipient, manager, report] = await Promise.all([
    adminDb.query.users.findFirst({
      where: eq(users.id, notification.user_id),
      columns: { email: true, firstName: true, lastName: true },
    }),
    adminDb.query.users.findFirst({
      where: eq(users.id, series.managerId),
      columns: { firstName: true, lastName: true },
    }),
    adminDb.query.users.findFirst({
      where: eq(users.id, series.reportId),
      columns: { firstName: true, lastName: true },
    }),
  ]);

  if (!recipient || !manager || !report) {
    throw new Error("Could not resolve users for agenda prep notification");
  }

  const isManager = notification.user_id === series.managerId;
  const variant = isManager ? "manager" : "report";
  const otherParty = isManager ? report : manager;
  const recipientName = `${recipient.firstName}`;
  const otherPartyName = `${otherParty.firstName} ${otherParty.lastName}`;

  const meetingDate = series.nextSessionAt
    ? series.nextSessionAt.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      })
    : "your next session";

  // Fetch AI nudges for manager variant only
  let nudges: { content: string; reason: string }[] = [];
  if (isManager) {
    const nudgeRows = await adminDb
      .select({ content: aiNudges.content, reason: aiNudges.reason })
      .from(aiNudges)
      .where(
        and(
          eq(aiNudges.seriesId, series.id),
          eq(aiNudges.isDismissed, false)
        )
      );
    nudges = nudgeRows.map((n) => ({
      content: n.content,
      reason: n.reason || "",
    }));
  }

  const baseUrl = getBaseUrl();
  const seriesUrl = `${baseUrl}/sessions/${series.id}`;

  // TODO(13-03): replace with createEmailTranslator
  const body = isManager
    ? `Your 1:1 with ${otherPartyName} is on ${meetingDate}. Here are some things to consider before your session.`
    : `Your 1:1 with ${otherPartyName} is on ${meetingDate}. Take a moment to add your talking points before the meeting.`;
  const buttonLabel = isManager ? "Open Meeting Series" : "Add Talking Points";

  const html = await render(
    AgendaPrepEmail({
      variant,
      recipientName,
      otherPartyName,
      meetingDate,
      seriesUrl,
      nudges: nudges.length > 0 ? nudges : undefined,
      heading: "Prepare for Your 1:1",
      greeting: `Hi ${recipientName},`,
      body,
      aiNudgesLabel: "AI Coaching Nudges",
      buttonLabel,
      footer: "",
    })
  );

  await getTransport().sendMail({
    from: getEmailFrom(),
    to: recipient.email,
    subject: `Prepare for your 1:1 with ${otherPartyName}`,
    html,
  });
}
