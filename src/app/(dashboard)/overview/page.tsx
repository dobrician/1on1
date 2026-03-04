import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { eq, and, gte, sql } from "drizzle-orm";
import { adminDb } from "@/lib/db";
import { withTenantContext } from "@/lib/db/tenant-context";
import {
  tenants,
  aiNudges,
  meetingSeries,
  users,
} from "@/lib/db/schema";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import { LogoutButton } from "@/components/auth/logout-button";
import { EmailVerificationBanner } from "@/components/auth/email-verification-banner";
import { NudgeCardsGrid } from "@/components/dashboard/nudge-cards-grid";
import type { NudgeData } from "@/components/dashboard/nudge-card";

export default async function OverviewPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const { user } = session;

  const tenant = await adminDb.query.tenants.findFirst({
    where: eq(tenants.id, user.tenantId),
    columns: { name: true },
  });

  const isManager = user.role === "manager" || user.role === "admin";

  // Fetch nudges for managers via direct DB query (Server Component pattern)
  let nudgeData: NudgeData[] = [];
  if (isManager) {
    const in7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    nudgeData = await withTenantContext(
      user.tenantId,
      user.id,
      async (tx) => {
        const rows = await tx
          .select({
            id: aiNudges.id,
            content: aiNudges.content,
            reason: aiNudges.reason,
            priority: aiNudges.priority,
            seriesId: aiNudges.seriesId,
            targetSessionAt: aiNudges.targetSessionAt,
            reportFirstName: users.firstName,
            reportLastName: users.lastName,
          })
          .from(aiNudges)
          .innerJoin(meetingSeries, eq(aiNudges.seriesId, meetingSeries.id))
          .innerJoin(users, eq(meetingSeries.reportId, users.id))
          .where(
            and(
              eq(aiNudges.isDismissed, false),
              eq(aiNudges.tenantId, user.tenantId),
              eq(meetingSeries.managerId, user.id),
              sql`(${aiNudges.targetSessionAt} IS NULL OR ${aiNudges.targetSessionAt} <= ${in7Days})`
            )
          )
          .orderBy(
            sql`CASE ${aiNudges.priority} WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 ELSE 4 END`,
            aiNudges.targetSessionAt
          );

        return rows.map((row) => ({
          id: row.id,
          content: row.content,
          reason: row.reason,
          priority: row.priority ?? "medium",
          seriesId: row.seriesId,
          reportName: `${row.reportFirstName} ${row.reportLastName}`,
          targetSessionAt: row.targetSessionAt?.toISOString() ?? null,
        }));
      }
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {!user.emailVerified && <EmailVerificationBanner />}

      {/* Welcome section */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome{user.name ? `, ${user.name}` : ""}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {tenant?.name ?? "Your organization"} &middot;{" "}
          <span className="capitalize">{user.role}</span>
        </p>
      </div>

      {/* Nudge section for managers */}
      {isManager && (
        <section className="mb-8">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="size-4 text-amber-600 dark:text-amber-400" />
            <h2 className="text-lg font-medium">
              Prepare for upcoming meetings
            </h2>
          </div>
          <NudgeCardsGrid initialNudges={nudgeData} />
        </section>
      )}

      {/* Account info card */}
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Your account details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email</span>
              <span>{user.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Role</span>
              <span className="capitalize">{user.role}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Organization</span>
              <span>{tenant?.name ?? "Unknown"}</span>
            </div>
          </div>

          <div className="pt-4">
            <LogoutButton />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
