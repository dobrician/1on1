import { sql } from "drizzle-orm";
import { db, type Database } from "./index";

export type TransactionClient = Parameters<Parameters<Database["transaction"]>[0]>[0];

/**
 * Wraps a database operation in a transaction with tenant context.
 *
 * Uses set_config with `true` (equivalent to SET LOCAL) to scope the setting
 * to the current transaction. This is safe with PgBouncer transaction-mode
 * pooling -- the setting automatically reverts when the transaction ends.
 *
 * EVERY query that touches tenant-scoped data MUST go through this wrapper.
 * The RLS policies on all tables check app.current_tenant_id, and the
 * private_note table additionally checks app.current_user_id.
 *
 * @param tenantId - UUID of the tenant (from authenticated session, NEVER from request params)
 * @param userId - UUID of the current user (from authenticated session)
 * @param operation - Database operation to execute within the tenant context
 */
export async function withTenantContext<T>(
  tenantId: string,
  userId: string,
  operation: (tx: TransactionClient) => Promise<T>
): Promise<T> {
  return await db.transaction(async (tx) => {
    // set_config with true = SET LOCAL (transaction-scoped)
    await tx.execute(
      sql`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`
    );
    await tx.execute(
      sql`SELECT set_config('app.current_user_id', ${userId}, true)`
    );
    return await operation(tx);
  });
}
