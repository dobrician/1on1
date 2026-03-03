import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { eq, isNull } from "drizzle-orm";
import { render } from "@react-email/render";
import { createTransport } from "nodemailer";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { requireRole } from "@/lib/auth/rbac";
import { withTenantContext } from "@/lib/db/tenant-context";
import { adminDb } from "@/lib/db";
import { inviteTokens } from "@/lib/db/schema";
import { logAuditEvent } from "@/lib/audit/log";
import { InviteEmail } from "@/lib/email/templates/invite";

const resendSchema = z.object({
  email: z.string().email(),
});

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

function getBaseUrl(request: Request): string {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost =
    request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (forwardedHost) {
    const proto = forwardedProto || "https";
    return `${proto}://${forwardedHost}`;
  }
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
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

  const parsed = resendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid email address" },
      { status: 400 }
    );
  }

  const { email } = parsed.data;
  const tenantId = session.user.tenantId;
  const actorId = session.user.id;

  // Look up existing non-accepted invite for this email in tenant
  const existingInvite = await adminDb.query.inviteTokens.findFirst({
    where: (i, ops) =>
      ops.and(
        ops.eq(i.tenantId, tenantId),
        ops.eq(i.email, email),
        isNull(i.acceptedAt)
      ),
  });

  if (!existingInvite) {
    return NextResponse.json(
      { error: "No pending invite found for this email" },
      { status: 400 }
    );
  }

  if (existingInvite.acceptedAt) {
    return NextResponse.json(
      { error: "This invite has already been accepted" },
      { status: 400 }
    );
  }

  // Generate new token and expiry
  const newToken = randomBytes(32).toString("hex");
  const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const ipAddress =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;

  try {
    await withTenantContext(tenantId, actorId, async (tx) => {
      await tx
        .update(inviteTokens)
        .set({ token: newToken, expiresAt: newExpiresAt })
        .where(eq(inviteTokens.id, existingInvite.id));

      await logAuditEvent(tx, {
        tenantId,
        actorId,
        action: "invite_resent",
        resourceType: "invite_token",
        resourceId: existingInvite.id,
        metadata: { email, role: existingInvite.role },
        ipAddress: ipAddress ?? undefined,
      });
    });

    // Get tenant and inviter info for email
    const tenant = await adminDb.query.tenants.findFirst({
      where: (t, { eq: e }) => e(t.id, tenantId),
      columns: { name: true },
    });
    const organizationName = tenant?.name || "your organization";

    const inviter = await adminDb.query.users.findFirst({
      where: (u, { eq: e }) => e(u.id, actorId),
      columns: { firstName: true, lastName: true },
    });
    const inviterName = inviter
      ? `${inviter.firstName} ${inviter.lastName}`
      : "An administrator";

    const baseUrl = getBaseUrl(request);
    const inviteUrl = `${baseUrl}/invite/${newToken}`;
    const html = await render(
      InviteEmail({
        inviteUrl,
        organizationName,
        inviterName,
        role: existingInvite.role,
      })
    );

    await getTransport().sendMail({
      from: getEmailFrom(),
      to: email,
      subject: `Join ${organizationName} on 1on1`,
      html,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to resend invite:", error);
    return NextResponse.json(
      { error: "Failed to resend invite. Please try again." },
      { status: 500 }
    );
  }
}
