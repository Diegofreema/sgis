import { db, activityLogs } from "@/db";

type LogActivityParams = {
  actorId?: string | null;
  actorRole?: "student" | "parent" | "admin";
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
};

export async function logActivity(params: LogActivityParams): Promise<void> {
  if (!db) return;

  try {
    await db.insert(activityLogs).values({
      actorId: params.actorId ?? null,
      actorRole: params.actorRole,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      metadata: params.metadata ?? null,
    });
  } catch {
    // Logging must never crash the caller
    console.error("[audit] Failed to log activity:", params.action);
  }
}
