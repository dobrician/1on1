import type { TransactionClient } from "@/lib/db/tenant-context";
import { auditLog } from "@/lib/db/schema/audit-log";

export interface AuditEvent {
  tenantId: string;
  actorId: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

/**
 * Log an audit event inside an existing transaction.
 * Must be called within withTenantContext to ensure the audit entry
 * rolls back if the parent mutation fails.
 */
export async function logAuditEvent(
  tx: TransactionClient,
  event: AuditEvent
): Promise<void> {
  await tx.insert(auditLog).values({
    tenantId: event.tenantId,
    actorId: event.actorId,
    action: event.action,
    resourceType: event.resourceType,
    resourceId: event.resourceId,
    metadata: event.metadata ?? {},
    ipAddress: event.ipAddress,
  });
}
