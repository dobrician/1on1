import { adminDb } from "../index";
import { sql } from "drizzle-orm";

async function run() {
  await adminDb.execute(sql`ALTER TABLE questionnaire_template ADD COLUMN IF NOT EXISTS ai_chat_history jsonb, ADD COLUMN IF NOT EXISTS ai_version_history jsonb`);
  console.log("Migration applied: ai_chat_history, ai_version_history columns added");
  process.exit(0);
}
run().catch((e) => { console.error(e); process.exit(1); });
