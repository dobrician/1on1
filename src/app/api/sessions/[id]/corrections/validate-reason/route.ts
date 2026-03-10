import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { auth } from "@/lib/auth/config";
import { validateReasonSchema } from "@/lib/validations/correction";
import { validateCorrectionReason } from "@/lib/ai/service";

/**
 * POST /api/sessions/[id]/corrections/validate-reason
 *
 * AI-only endpoint: validates a correction reason text without touching the DB.
 * Returns { pass: boolean, feedback: string | null }.
 *
 * - Requires auth (401 if missing)
 * - Validates reason length 20-500 chars (400 if invalid)
 * - Does NOT require session or series authorization — reason text is not sensitive
 * - Does NOT write to the database
 * - On AI failure: returns { pass: true, feedback: null } with 200 (graceful degradation)
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let data;
  try {
    const body = await request.json();
    data = validateReasonSchema.parse(body);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const result = await validateCorrectionReason(
      data.reason,
      session.user.contentLanguage ?? undefined
    );
    return NextResponse.json(result);
  } catch {
    // AI is unavailable — return degraded neutral pass so UI does not block correction
    return NextResponse.json({ pass: true, feedback: null }, { status: 200 });
  }
}
