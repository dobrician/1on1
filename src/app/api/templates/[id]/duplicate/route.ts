import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { withTenantContext } from "@/lib/db/tenant-context";
import { canManageTemplates } from "@/lib/auth/rbac";
import { logAuditEvent } from "@/lib/audit/log";
import { questionnaireTemplates, templateQuestions } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  void request; // unused but required by Next.js route handler signature
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (!canManageTemplates(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const result = await withTenantContext(
      session.user.tenantId,
      session.user.id,
      async (tx) => {
        // Fetch source template
        const [source] = await tx
          .select()
          .from(questionnaireTemplates)
          .where(
            and(
              eq(questionnaireTemplates.id, id),
              eq(questionnaireTemplates.tenantId, session.user.tenantId)
            )
          );

        if (!source) {
          return { error: "Template not found", status: 404 };
        }

        // Fetch non-archived questions
        const sourceQuestions = await tx
          .select()
          .from(templateQuestions)
          .where(
            and(
              eq(templateQuestions.templateId, id),
              eq(templateQuestions.isArchived, false)
            )
          )
          .orderBy(asc(templateQuestions.sortOrder));

        // Create duplicate template
        const [newTemplate] = await tx
          .insert(questionnaireTemplates)
          .values({
            tenantId: session.user.tenantId,
            name: `${source.name} (Copy)`,
            description: source.description,
            category: source.category,
            isDefault: false,
            isPublished: false,
            isArchived: false,
            createdBy: session.user.id,
            version: 1,
          })
          .returning();

        // Copy questions with new UUIDs, building oldId->newId map for conditional remapping
        const oldToNewIdMap = new Map<string, string>();

        // First pass: insert all questions to get new IDs
        for (const q of sourceQuestions) {
          const [newQuestion] = await tx
            .insert(templateQuestions)
            .values({
              templateId: newTemplate.id,
              questionText: q.questionText,
              helpText: q.helpText,
              category: q.category,
              answerType: q.answerType,
              answerConfig: q.answerConfig,
              isRequired: q.isRequired,
              sortOrder: q.sortOrder,
              isArchived: false,
              // Set conditional fields to null initially; remap in second pass
              conditionalOnQuestionId: null,
              conditionalOperator: q.conditionalOperator,
              conditionalValue: q.conditionalValue,
            })
            .returning();

          oldToNewIdMap.set(q.id, newQuestion.id);
        }

        // Second pass: remap conditionalOnQuestionId references
        for (const q of sourceQuestions) {
          if (q.conditionalOnQuestionId) {
            const newQuestionId = oldToNewIdMap.get(q.id);
            const newConditionalId = oldToNewIdMap.get(
              q.conditionalOnQuestionId
            );
            if (newQuestionId && newConditionalId) {
              await tx
                .update(templateQuestions)
                .set({ conditionalOnQuestionId: newConditionalId })
                .where(eq(templateQuestions.id, newQuestionId));
            }
          }
        }

        await logAuditEvent(tx, {
          tenantId: session.user.tenantId,
          actorId: session.user.id,
          action: "template_duplicated",
          resourceType: "template",
          resourceId: newTemplate.id,
          metadata: {
            sourceTemplateId: id,
            sourceTemplateName: source.name,
          },
        });

        // Fetch the complete new template with questions
        const newQuestions = await tx
          .select()
          .from(templateQuestions)
          .where(eq(templateQuestions.templateId, newTemplate.id))
          .orderBy(asc(templateQuestions.sortOrder));

        return {
          data: {
            ...newTemplate,
            createdAt: newTemplate.createdAt.toISOString(),
            updatedAt: newTemplate.updatedAt.toISOString(),
            questions: newQuestions.map((q) => ({
              ...q,
              createdAt: q.createdAt.toISOString(),
            })),
          },
        };
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
    console.error("Failed to duplicate template:", error);
    return NextResponse.json(
      { error: "Failed to duplicate template" },
      { status: 500 }
    );
  }
}
