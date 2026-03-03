import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { withTenantContext } from "@/lib/db/tenant-context";
import { canManageTeams } from "@/lib/auth/rbac";
import { logAuditEvent } from "@/lib/audit/log";
import { createTeamSchema } from "@/lib/validations/team";
import { teams, teamMembers, users } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const result = await withTenantContext(
      session.user.tenantId,
      session.user.id,
      async (tx) => {
        // Fetch all teams in the tenant with member counts
        const teamsWithCounts = await tx
          .select({
            id: teams.id,
            name: teams.name,
            description: teams.description,
            managerId: teams.managerId,
            createdAt: teams.createdAt,
            memberCount: sql<number>`cast(count(${teamMembers.id}) as int)`,
          })
          .from(teams)
          .leftJoin(teamMembers, eq(teamMembers.teamId, teams.id))
          .where(eq(teams.tenantId, session.user.tenantId))
          .groupBy(teams.id)
          .orderBy(teams.name);

        // Get manager info for all teams that have one
        const managerIds = [
          ...new Set(
            teamsWithCounts
              .map((t) => t.managerId)
              .filter((id): id is string => id !== null)
          ),
        ];

        const managers =
          managerIds.length > 0
            ? await tx
                .select({
                  id: users.id,
                  firstName: users.firstName,
                  lastName: users.lastName,
                  avatarUrl: users.avatarUrl,
                })
                .from(users)
                .where(
                  sql`${users.id} IN ${managerIds.length > 0 ? sql`(${sql.join(managerIds.map((id) => sql`${id}`), sql`, `)})` : sql`(NULL)`}`
                )
            : [];

        const managerMap = new Map(managers.map((m) => [m.id, m]));

        return teamsWithCounts.map((t) => {
          const manager = t.managerId ? managerMap.get(t.managerId) : null;
          return {
            id: t.id,
            name: t.name,
            description: t.description,
            managerId: t.managerId,
            managerName: manager
              ? `${manager.firstName} ${manager.lastName}`
              : null,
            managerAvatarUrl: manager?.avatarUrl ?? null,
            memberCount: t.memberCount,
            createdAt: t.createdAt.toISOString(),
          };
        });
      }
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to fetch teams:", error);
    return NextResponse.json(
      { error: "Failed to fetch teams" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (!canManageTeams(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const data = createTeamSchema.parse(body);

    const result = await withTenantContext(
      session.user.tenantId,
      session.user.id,
      async (tx) => {
        // If managerId provided, verify user exists in tenant
        if (data.managerId) {
          const [manager] = await tx
            .select({ id: users.id })
            .from(users)
            .where(and(eq(users.id, data.managerId), eq(users.tenantId, session.user.tenantId)));

          if (!manager) {
            return { error: "Manager not found", status: 404 };
          }
        }

        const [team] = await tx
          .insert(teams)
          .values({
            tenantId: session.user.tenantId,
            name: data.name,
            description: data.description ?? null,
            managerId: data.managerId ?? null,
          })
          .returning();

        // If manager provided, add them as team lead member
        if (data.managerId) {
          await tx.insert(teamMembers).values({
            teamId: team.id,
            userId: data.managerId,
            role: "lead",
          });
        }

        await logAuditEvent(tx, {
          tenantId: session.user.tenantId,
          actorId: session.user.id,
          action: "team_created",
          resourceType: "team",
          resourceId: team.id,
          metadata: { teamName: data.name },
        });

        return { data: team };
      }
    );

    if ("error" in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }

    return NextResponse.json(result.data, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid input", details: error },
        { status: 400 }
      );
    }
    console.error("Failed to create team:", error);
    return NextResponse.json(
      { error: "Failed to create team" },
      { status: 500 }
    );
  }
}
