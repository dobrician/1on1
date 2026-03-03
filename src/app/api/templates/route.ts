import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { withTenantContext } from "@/lib/db/tenant-context";
import { canManageTemplates } from "@/lib/auth/rbac";
import { logAuditEvent } from "@/lib/audit/log";
import { createTemplateSchema } from "@/lib/validations/template";
import { questionnaireTemplates, templateQuestions } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const includeArchived = searchParams.get("include_archived") === "true";

  try {
    const result = await withTenantContext(
      session.user.tenantId,
      session.user.id,
      async (tx) => {
        const baseConditions = [
          eq(questionnaireTemplates.tenantId, session.user.tenantId),
        ];

        if (!includeArchived) {
          baseConditions.push(
            eq(questionnaireTemplates.isArchived, false)
          );
        }

        const templates = await tx
          .select({
            id: questionnaireTemplates.id,
            name: questionnaireTemplates.name,
            description: questionnaireTemplates.description,
            category: questionnaireTemplates.category,
            isDefault: questionnaireTemplates.isDefault,
            isPublished: questionnaireTemplates.isPublished,
            isArchived: questionnaireTemplates.isArchived,
            version: questionnaireTemplates.version,
            createdAt: questionnaireTemplates.createdAt,
            questionCount:
              sql<number>`cast(count(${templateQuestions.id}) as int)`,
          })
          .from(questionnaireTemplates)
          .leftJoin(
            templateQuestions,
            and(
              eq(templateQuestions.templateId, questionnaireTemplates.id),
              eq(templateQuestions.isArchived, false)
            )
          )
          .where(and(...baseConditions))
          .groupBy(questionnaireTemplates.id)
          .orderBy(questionnaireTemplates.name);

        return templates.map((t) => ({
          ...t,
          createdAt: t.createdAt.toISOString(),
        }));
      }
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to fetch templates:", error);
    return NextResponse.json(
      { error: "Failed to fetch templates" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (!canManageTemplates(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const data = createTemplateSchema.parse(body);

    const result = await withTenantContext(
      session.user.tenantId,
      session.user.id,
      async (tx) => {
        const [template] = await tx
          .insert(questionnaireTemplates)
          .values({
            tenantId: session.user.tenantId,
            name: data.name,
            description: data.description ?? null,
            category: data.category,
            createdBy: session.user.id,
          })
          .returning();

        await logAuditEvent(tx, {
          tenantId: session.user.tenantId,
          actorId: session.user.id,
          action: "template_created",
          resourceType: "template",
          resourceId: template.id,
          metadata: { templateName: data.name },
        });

        return template;
      }
    );

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid input", details: error },
        { status: 400 }
      );
    }
    console.error("Failed to create template:", error);
    return NextResponse.json(
      { error: "Failed to create template" },
      { status: 500 }
    );
  }
}
