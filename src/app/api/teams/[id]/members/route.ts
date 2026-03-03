import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { withTenantContext } from "@/lib/db/tenant-context";
import { canManageTeams } from "@/lib/auth/rbac";
import { logAuditEvent } from "@/lib/audit/log";
import {
  addTeamMembersSchema,
  removeTeamMemberSchema,
} from "@/lib/validations/team";
import { teams, teamMembers, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (!canManageTeams(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const data = addTeamMembersSchema.parse(body);

    const result = await withTenantContext(
      session.user.tenantId,
      session.user.id,
      async (tx) => {
        // Verify team exists in tenant
        const [team] = await tx
          .select({ id: teams.id })
          .from(teams)
          .where(
            and(eq(teams.id, id), eq(teams.tenantId, session.user.tenantId))
          );

        if (!team) {
          return { error: "Team not found", status: 404 };
        }

        // Verify all users exist in tenant and are active
        for (const userId of data.userIds) {
          const [user] = await tx
            .select({ id: users.id, isActive: users.isActive })
            .from(users)
            .where(
              and(
                eq(users.id, userId),
                eq(users.tenantId, session.user.tenantId)
              )
            );

          if (!user) {
            return { error: `User ${userId} not found`, status: 404 };
          }
          if (!user.isActive) {
            return {
              error: `User ${userId} is deactivated`,
              status: 400,
            };
          }
        }

        // Insert team members (skip existing)
        for (const userId of data.userIds) {
          await tx
            .insert(teamMembers)
            .values({
              teamId: id,
              userId,
              role: "member",
            })
            .onConflictDoNothing({
              target: [teamMembers.teamId, teamMembers.userId],
            });

          await logAuditEvent(tx, {
            tenantId: session.user.tenantId,
            actorId: session.user.id,
            action: "member_added_to_team",
            resourceType: "team",
            resourceId: id,
            metadata: { userId, teamId: id },
          });
        }

        // Return updated member list
        const members = await tx
          .select({
            userId: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
            avatarUrl: users.avatarUrl,
            role: teamMembers.role,
            joinedAt: teamMembers.joinedAt,
          })
          .from(teamMembers)
          .innerJoin(users, eq(teamMembers.userId, users.id))
          .where(eq(teamMembers.teamId, id));

        return {
          data: members.map((m) => ({
            userId: m.userId,
            firstName: m.firstName,
            lastName: m.lastName,
            email: m.email,
            avatarUrl: m.avatarUrl,
            role: m.role,
            joinedAt: m.joinedAt.toISOString(),
          })),
        };
      }
    );

    if ("error" in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }

    return NextResponse.json(result.data);
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid input", details: error },
        { status: 400 }
      );
    }
    console.error("Failed to add team members:", error);
    return NextResponse.json(
      { error: "Failed to add team members" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (!canManageTeams(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const data = removeTeamMemberSchema.parse(body);

    const result = await withTenantContext(
      session.user.tenantId,
      session.user.id,
      async (tx) => {
        // Verify team exists in tenant
        const [team] = await tx
          .select({ id: teams.id })
          .from(teams)
          .where(
            and(eq(teams.id, id), eq(teams.tenantId, session.user.tenantId))
          );

        if (!team) {
          return { error: "Team not found", status: 404 };
        }

        // Delete the membership
        await tx
          .delete(teamMembers)
          .where(
            and(
              eq(teamMembers.teamId, id),
              eq(teamMembers.userId, data.userId)
            )
          );

        await logAuditEvent(tx, {
          tenantId: session.user.tenantId,
          actorId: session.user.id,
          action: "member_removed_from_team",
          resourceType: "team",
          resourceId: id,
          metadata: { userId: data.userId, teamId: id },
        });

        return { success: true };
      }
    );

    if ("error" in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid input", details: error },
        { status: 400 }
      );
    }
    console.error("Failed to remove team member:", error);
    return NextResponse.json(
      { error: "Failed to remove team member" },
      { status: 500 }
    );
  }
}
