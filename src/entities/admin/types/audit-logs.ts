/** Audit log DTOs. */

export interface AuditLog {
  id: string;
  actorKind: 'user' | 'system' | 'anonymous';
  userId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  method: string;
  path: string;
  route?: string | null;
  status: number;
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}
