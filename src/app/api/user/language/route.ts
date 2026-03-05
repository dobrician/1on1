import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth/config";
import { withTenantContext } from "@/lib/db/tenant-context";
import { users } from "@/lib/db/schema";
import { updateLanguageSchema } from "@/lib/validations/user";

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = updateLanguageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid language", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { language } = parsed.data;

  try {
    await withTenantContext(
      session.user.tenantId,
      session.user.id,
      async (tx) => {
        await tx
          .update(users)
          .set({ language, updatedAt: new Date() })
          .where(eq(users.id, session.user.id));
      }
    );

    // Set NEXT_LOCALE cookie so next-intl picks up the change on next request
    const response = NextResponse.json({ success: true, language });
    response.cookies.set("NEXT_LOCALE", language, {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });

    return response;
  } catch (error) {
    console.error("Failed to update language:", error);
    return NextResponse.json(
      { error: "Failed to update language" },
      { status: 500 }
    );
  }
}
