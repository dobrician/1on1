import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { isNull } from "drizzle-orm";
import { render } from "@react-email/render";
import { createTransport } from "nodemailer";
import { auth } from "@/lib/auth/config";
import { requireRole } from "@/lib/auth/rbac";
import { inviteUsersSchema } from "@/lib/validations/user";
import { withTenantContext } from "@/lib/db/tenant-context";
import { adminDb } from "@/lib/db";
import { inviteTokens } from "@/lib/db/schema";
import { logAuditEvent } from "@/lib/audit/log";
import { InviteEmail } from "@/lib/email/templates/invite";

// Lazy-initialize SMTP transport (same pattern as send.ts)
let _transport: ReturnType<typeof createTransport> | null = null;
function getTransport() {
  if (!_transport) {
    _transport = createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "ssl",
      auth: {
        user: process.env.SMTP_USERNAME,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }
  return _transport;
}

function getEmailFrom(): string {
  return process.env.EMAIL_FROM || "1on1 <noreply@example.com>";
}

function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  return "http://localhost:3000";
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const roleError = requireRole(session.user.role, "admin");
  if (roleError) return roleError;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = inviteUsersSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { emails, role } = parsed.data;
  const tenantId = session.user.tenantId;
  const inviterId = session.user.id;

  // Get tenant name and inviter name for the email
  const tenant = await adminDb.query.tenants.findFirst({
    where: (t, { eq: e }) => e(t.id, tenantId),
    columns: { name: true },
  });
  const organizationName = tenant?.name || "your organization";

  const inviter = await adminDb.query.users.findFirst({
    where: (u, { eq: e }) => e(u.id, inviterId),
    columns: { firstName: true, lastName: true },
  });
  const inviterName = inviter
    ? `${inviter.firstName} ${inviter.lastName}`
    : "An administrator";

  const baseUrl = getBaseUrl();
  const ipAddress =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;

  let sent = 0;
  const skipped: { email: string; reason: string }[] = [];

  for (const email of emails) {
    // Check if user with this email already exists in tenant
    const existingUser = await adminDb.query.users.findFirst({
      where: (u, ops) =>
        ops.and(ops.eq(u.tenantId, tenantId), ops.eq(u.email, email)),
      columns: { id: true },
    });

    if (existingUser) {
      skipped.push({ email, reason: "Already a member" });
      continue;
    }

    // Check if active (non-accepted) invite already exists for this email in tenant
    const existingInvite = await adminDb.query.inviteTokens.findFirst({
      where: (i, ops) =>
        ops.and(
          ops.eq(i.tenantId, tenantId),
          ops.eq(i.email, email),
          isNull(i.acceptedAt)
        ),
      columns: { id: true },
    });

    if (existingInvite) {
      skipped.push({ email, reason: "Already invited" });
      continue;
    }

    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    try {
      await withTenantContext(tenantId, inviterId, async (tx) => {
        await tx.insert(inviteTokens).values({
          tenantId,
          email,
          role,
          token,
          invitedBy: inviterId,
          expiresAt,
        });

        await logAuditEvent(tx, {
          tenantId,
          actorId: inviterId,
          action: "invite_sent",
          resourceType: "invite_token",
          metadata: { email, role },
          ipAddress: ipAddress ?? undefined,
        });
      });

      // Send email
      const inviteUrl = `${baseUrl}/invite/${token}`;
      const html = await render(
        InviteEmail({ inviteUrl, organizationName, inviterName, role })
      );

      await getTransport().sendMail({
        from: getEmailFrom(),
        to: email,
        subject: `Join ${organizationName} on 1on1`,
        html,
      });

      sent++;
    } catch (error: unknown) {
      // Handle unique constraint violation (race condition)
      const errMsg =
        error instanceof Error ? error.message : String(error);
      if (errMsg.includes("unique") || errMsg.includes("duplicate")) {
        skipped.push({ email, reason: "Already invited" });
      } else {
        skipped.push({ email, reason: "Failed to send" });
        console.error(`Failed to invite ${email}:`, error);
      }
    }
  }

  return NextResponse.json({ sent, skipped });
}
