import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { withTenantContext } from "@/lib/db/tenant-context";
import { canManageTeams, requireRole } from "@/lib/auth/rbac";
import { logAuditEvent } from "@/lib/audit/log";
import { updateTeamSchema } from "@/lib/validations/team";
import { teams, teamMembers, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const result = await withTenantContext(
      session.user.tenantId,
      session.user.id,
      async (tx) => {
        const [team] = await tx
          .select({
            id: teams.id,
            name: teams.name,
            description: teams.description,
            managerId: teams.managerId,
            createdAt: teams.createdAt,
            updatedAt: teams.updatedAt,
          })
          .from(teams)
          .where(
            and(eq(teams.id, id), eq(teams.tenantId, session.user.tenantId))
          );

        if (!team) return null;

        // Get manager info
        let managerName: string | null = null;
        let managerAvatarUrl: string | null = null;
        if (team.managerId) {
          const [manager] = await tx
            .select({
              firstName: users.firstName,
              lastName: users.lastName,
              avatarUrl: users.avatarUrl,
            })
            .from(users)
            .where(eq(users.id, team.managerId));
          if (manager) {
            managerName = `${manager.firstName} ${manager.lastName}`;
            managerAvatarUrl = manager.avatarUrl;
          }
        }

        // Get members with user details
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
          id: team.id,
          name: team.name,
          description: team.description,
          managerId: team.managerId,
          managerName,
          managerAvatarUrl,
          createdAt: team.createdAt.toISOString(),
          updatedAt: team.updatedAt.toISOString(),
          members: members.map((m) => ({
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

    if (!result) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to fetch team:", error);
    return NextResponse.json(
      { error: "Failed to fetch team" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
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
    const data = updateTeamSchema.parse(body);

    const result = await withTenantContext(
      session.user.tenantId,
      session.user.id,
      async (tx) => {
        const [team] = await tx
          .select({
            id: teams.id,
            name: teams.name,
            managerId: teams.managerId,
          })
          .from(teams)
          .where(
            and(eq(teams.id, id), eq(teams.tenantId, session.user.tenantId))
          );

        if (!team) {
          return { error: "Team not found", status: 404 };
        }

        const updatePayload: Record<string, unknown> = {
          updatedAt: new Date(),
        };

        if (data.name !== undefined) updatePayload.name = data.name;
        if (data.description !== undefined)
          updatePayload.description = data.description;

        // Handle manager/lead change
        if (data.managerId !== undefined && data.managerId !== team.managerId) {
          if (data.managerId) {
            // Verify new manager exists in tenant
            const [newManager] = await tx
              .select({ id: users.id })
              .from(users)
              .where(and(eq(users.id, data.managerId), eq(users.tenantId, session.user.tenantId)));

            if (!newManager) {
              return { error: "Manager not found", status: 404 };
            }
          }

          // Update old lead's teamMember role to "member"
          if (team.managerId) {
            await tx
              .update(teamMembers)
              .set({ role: "member" })
              .where(
                and(
                  eq(teamMembers.teamId, id),
                  eq(teamMembers.userId, team.managerId)
                )
              );
          }

          // Add or update new lead's teamMember role
          if (data.managerId) {
            // Check if already a member
            const [existingMember] = await tx
              .select({ id: teamMembers.id })
              .from(teamMembers)
              .where(
                and(
                  eq(teamMembers.teamId, id),
                  eq(teamMembers.userId, data.managerId)
                )
              );

            if (existingMember) {
              await tx
                .update(teamMembers)
                .set({ role: "lead" })
                .where(
                  and(
                    eq(teamMembers.teamId, id),
                    eq(teamMembers.userId, data.managerId)
                  )
                );
            } else {
              await tx.insert(teamMembers).values({
                teamId: id,
                userId: data.managerId,
                role: "lead",
              });
            }
          }

          updatePayload.managerId = data.managerId;

          await logAuditEvent(tx, {
            tenantId: session.user.tenantId,
            actorId: session.user.id,
            action: "team_lead_changed",
            resourceType: "team",
            resourceId: id,
            metadata: {
              previousLeadId: team.managerId,
              newLeadId: data.managerId,
            },
          });
        }

        const [updated] = await tx
          .update(teams)
          .set(updatePayload)
          .where(eq(teams.id, id))
          .returning();

        // Log team_updated if name or description changed
        if (data.name !== undefined || data.description !== undefined) {
          await logAuditEvent(tx, {
            tenantId: session.user.tenantId,
            actorId: session.user.id,
            action: "team_updated",
            resourceType: "team",
            resourceId: id,
            metadata: {
              ...(data.name !== undefined && { newName: data.name }),
              ...(data.description !== undefined && {
                newDescription: data.description,
              }),
            },
          });
        }

        return { data: updated };
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
    console.error("Failed to update team:", error);
    return NextResponse.json(
      { error: "Failed to update team" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const roleError = requireRole(session.user.role, "admin");
  if (roleError) return roleError;

  const { id } = await params;

  try {
    const result = await withTenantContext(
      session.user.tenantId,
      session.user.id,
      async (tx) => {
        const [team] = await tx
          .select({ id: teams.id, name: teams.name })
          .from(teams)
          .where(
            and(eq(teams.id, id), eq(teams.tenantId, session.user.tenantId))
          );

        if (!team) {
          return { error: "Team not found", status: 404 };
        }

        // Delete all team members first
        await tx
          .delete(teamMembers)
          .where(eq(teamMembers.teamId, id));

        // Delete the team
        await tx.delete(teams).where(eq(teams.id, id));

        await logAuditEvent(tx, {
          tenantId: session.user.tenantId,
          actorId: session.user.id,
          action: "team_deleted",
          resourceType: "team",
          resourceId: id,
          metadata: { teamName: team.name },
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
    console.error("Failed to delete team:", error);
    return NextResponse.json(
      { error: "Failed to delete team" },
      { status: 500 }
    );
  }
}
