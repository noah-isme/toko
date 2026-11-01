'use client';

import { ChevronLeft, ChevronRight, Lock, UserCog, UserMinus, UserPlus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useId, useState, type FormEvent } from 'react';

import {
  useAdminErrorMessage,
  usePermissionLabel,
  useRoleLabel,
} from '@/components/admin/admin-access-ui';
import { AdminEmpty, AdminError, AdminLoading, AdminPageHeader } from '@/components/admin/admin-ui';
import { useAuth } from '@/components/providers/AuthProvider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  useAdminRoles,
  useAdminStaff,
  useAssignAdminStaff,
  useRevokeAdminStaff,
  useUpdateAdminStaffRole,
} from '@/entities/admin/hooks';
import { STAFF_ROLES, type StaffMember, type StaffRole } from '@/entities/admin/types/staff';
import { useAdminAccess } from '@/entities/admin/use-admin-access';
import { useAdminFormat } from '@/entities/admin/use-admin-format';
import { ApiClientError } from '@/lib/api/apiClient';
import { cn } from '@/lib/utils';
import { useToast } from '@/shared/ui/toast';

const PAGE_SIZE = 20;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Staff error codes with their own copy under `admin.staff.errors`. */
const STAFF_ERROR_CODES = [
  'USER_NOT_FOUND',
  'STAFF_EXISTS',
  'LAST_OWNER',
  'STAFF_NOT_FOUND',
  'VALIDATION_ERROR',
] as const;
type StaffErrorCode = (typeof STAFF_ERROR_CODES)[number];

function staffErrorCode(error: unknown): StaffErrorCode | null {
  if (!(error instanceof ApiClientError)) return null;
  return (STAFF_ERROR_CODES as readonly string[]).includes(error.code)
    ? (error.code as StaffErrorCode)
    : null;
}

const SELECT_CLASS =
  'h-10 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

function useStaffErrorMessage() {
  const t = useTranslations('admin.staff.errors');
  const adminErrorMessage = useAdminErrorMessage();
  return (error: unknown, fallback: string) => {
    const code = staffErrorCode(error);
    return code ? t(code) : adminErrorMessage(error, fallback);
  };
}

function StatusBadge({ status }: { status: StaffMember['status'] }) {
  const t = useTranslations('admin.staff.status');
  return (
    <Badge
      variant="outline"
      className={cn(
        'font-medium',
        status === 'ACTIVE'
          ? 'border-green-200 bg-green-100 text-green-800'
          : 'bg-muted text-muted-foreground',
      )}
    >
      {t(status)}
    </Badge>
  );
}

function AddStaffForm({ assignableRoles }: { assignableRoles: StaffRole[] }) {
  const t = useTranslations('admin.staff.add');
  const tAccess = useTranslations('admin.access');
  const roleLabel = useRoleLabel();
  const staffErrorMessage = useStaffErrorMessage();
  const { toast } = useToast();
  const assign = useAssignAdminStaff();
  const ids = useId();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<StaffRole>(
    assignableRoles.includes('manager') ? 'manager' : assignableRoles[0],
  );
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return setError(t('emailRequired'));
    if (!EMAIL_PATTERN.test(trimmed)) return setError(t('emailInvalid'));
    setError(null);
    try {
      const member = await assign.mutateAsync({ email: trimmed, role });
      toast({
        title: t('success', { name: member.name || member.email, role: roleLabel(member.role) }),
        variant: 'success',
      });
      setEmail('');
    } catch (err) {
      setError(staffErrorMessage(err, t('failed')));
    }
  };

  const emailId = `${ids}-email`;
  const roleId = `${ids}-role`;
  const errorId = `${ids}-error`;
  const roleHintId = `${ids}-role-hint`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t('title')}</CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit}
          noValidate
          className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto] md:items-start"
        >
          <div className="space-y-2">
            <Label htmlFor={emailId}>{t('email')}</Label>
            <Input
              id={emailId}
              type="email"
              autoComplete="off"
              value={email}
              placeholder={t('emailPlaceholder')}
              onChange={(event) => setEmail(event.target.value)}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={roleId}>{t('role')}</Label>
            <select
              id={roleId}
              className={SELECT_CLASS}
              value={role}
              onChange={(event) => setRole(event.target.value as StaffRole)}
              aria-describedby={roleHintId}
            >
              {assignableRoles.map((option) => (
                <option key={option} value={option}>
                  {roleLabel(option)}
                </option>
              ))}
            </select>
            <p id={roleHintId} className="text-xs text-muted-foreground">
              {tAccess(`roleDescriptions.${role}`)}
            </p>
          </div>
          <Button type="submit" className="md:mt-8" disabled={assign.isPending}>
            <UserPlus className="mr-2 h-4 w-4" aria-hidden="true" />
            {assign.isPending ? t('submitting') : t('submit')}
          </Button>
          {error ? (
            <p
              id={errorId}
              role="alert"
              className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive md:col-span-3"
            >
              {error}
            </p>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}

function RoleMatrix() {
  const t = useTranslations('admin.staff.matrix');
  const tAccess = useTranslations('admin.access');
  const roleLabel = useRoleLabel();
  const permissionLabel = usePermissionLabel();
  // Load the matrix only once someone opens it.
  const [open, setOpen] = useState(false);
  const roles = useAdminRoles({ enabled: open });

  return (
    <Card>
      <details className="group" onToggle={(event) => setOpen(event.currentTarget.open)}>
        <summary className="cursor-pointer list-none rounded-lg px-6 py-4 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
          <span className="flex items-center justify-between gap-2">
            {t('title')}
            <ChevronRight
              className="h-4 w-4 transition-transform group-open:rotate-90"
              aria-hidden="true"
            />
          </span>
        </summary>
        <CardContent>
          {!open ? null : roles.isPending ? (
            <AdminLoading label={t('loading')} />
          ) : roles.isError ? (
            <AdminError error={roles.error} onRetry={() => void roles.refetch()} />
          ) : (
            <ul className="grid gap-4 md:grid-cols-2">
              {(roles.data ?? []).map((definition) => (
                <li key={definition.role} className="space-y-2 rounded-lg border p-4">
                  <p className="font-medium">{roleLabel(definition.role)}</p>
                  <p className="text-sm text-muted-foreground">
                    {tAccess(`roleDescriptions.${definition.role}`)}
                  </p>
                  {definition.permissions.length === 0 ? (
                    <p className="text-xs text-muted-foreground">{t('none')}</p>
                  ) : (
                    <ul className="flex flex-wrap gap-1.5">
                      {definition.permissions.map((permission) => (
                        <li key={permission}>
                          <Badge variant="secondary" className="font-normal">
                            {permissionLabel(permission)}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </details>
    </Card>
  );
}

type ChangeTarget = { member: StaffMember; to: StaffRole };

export default function StaffPage() {
  const t = useTranslations('admin.staff');
  const tAccess = useTranslations('admin.access');
  const ids = useId();
  const tCommon = useTranslations('admin.common');
  const roleLabel = useRoleLabel();
  const staffErrorMessage = useStaffErrorMessage();
  const { toast } = useToast();
  const { day } = useAdminFormat();
  const { user, refreshUser } = useAuth();
  const access = useAdminAccess();
  const canManage = access.can('staff:manage');
  const isOwner = access.role === 'owner';
  const assignableRoles = STAFF_ROLES.filter((role) => isOwner || role !== 'owner');

  const [page, setPage] = useState(1);
  const query = useAdminStaff({ page, limit: PAGE_SIZE });
  const updateRole = useUpdateAdminStaffRole();
  const revoke = useRevokeAdminStaff();
  const [changeTarget, setChangeTarget] = useState<ChangeTarget | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<StaffMember | null>(null);

  const members = query.data?.data ?? [];
  const totalItems = query.data?.pagination.totalItems ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  // Revoking the last row of a later page leaves `page` past the end: step
  // back to the last page that still has staff instead of showing "empty".
  if (query.data && !query.isFetching && page > totalPages) setPage(totalPages);
  const isSelf = (member: StaffMember | null | undefined) =>
    Boolean(member && user && member.userId === user.id);
  const displayName = (member: StaffMember) => member.name || member.email;

  const confirmChange = async () => {
    if (!changeTarget) return;
    const { member, to } = changeTarget;
    if (to === member.role) return;
    try {
      await updateRole.mutateAsync({ userId: member.userId, role: to });
      toast({
        title: t('confirmChange.success', { name: displayName(member), role: roleLabel(to) }),
        variant: 'success',
      });
      if (isSelf(member)) await refreshUser();
    } catch (error) {
      toast({
        title: t('confirmChange.failed'),
        description: staffErrorMessage(error, tCommon('unknownError')),
        variant: 'destructive',
      });
    } finally {
      setChangeTarget(null);
    }
  };

  const confirmRevoke = async () => {
    if (!revokeTarget) return;
    const member = revokeTarget;
    try {
      await revoke.mutateAsync(member.userId);
      toast({
        title: t('confirmRevoke.success', { name: displayName(member) }),
        variant: 'success',
      });
      if (isSelf(member)) await refreshUser();
    } catch (error) {
      toast({
        title: t('confirmRevoke.failed'),
        description: staffErrorMessage(error, tCommon('unknownError')),
        variant: 'destructive',
      });
    } finally {
      setRevokeTarget(null);
    }
  };

  const renderRoleCell = (member: StaffMember) => {
    const locked = canManage && member.role === 'owner' && !isOwner;
    if (!locked) return <span data-testid="staff-role">{roleLabel(member.role)}</span>;
    return (
      <span className="inline-flex items-center gap-1.5" data-testid="staff-role">
        <Lock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
        <span>{roleLabel(member.role)}</span>
        <span className="sr-only">. {t('ownerLocked')}</span>
      </span>
    );
  };

  const changeRoleSelectId = `${ids}-change-role`;
  const changeRoleHintId = `${ids}-change-role-hint`;

  return (
    <div className="space-y-6">
      <AdminPageHeader title={t('title')} description={t('description')} />

      {canManage ? (
        <AddStaffForm assignableRoles={assignableRoles} />
      ) : (
        <p className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground" role="note">
          {t('readOnly')}
        </p>
      )}

      {query.isLoading || page > totalPages ? (
        <AdminLoading label={t('loading')} />
      ) : query.isError ? (
        <AdminError error={query.error} onRetry={() => void query.refetch()} />
      ) : members.length === 0 ? (
        <AdminEmpty message={t('empty')} />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <caption className="sr-only">{t('table.caption')}</caption>
                <thead className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-medium">
                      {t('table.name')}
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      {t('table.role')}
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      {t('table.status')}
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      {t('table.added')}
                    </th>
                    {canManage ? (
                      <th scope="col" className="px-4 py-3 text-right font-medium">
                        {t('table.actions')}
                      </th>
                    ) : null}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {members.map((member) => {
                    const locked = member.role === 'owner' && !isOwner;
                    return (
                      <tr key={member.userId} data-testid="staff-row">
                        <td className="px-4 py-3">
                          <p className="font-medium">
                            {member.name || member.email}
                            {isSelf(member) ? (
                              <Badge variant="outline" className="ml-2 font-normal">
                                {t('table.you')}
                              </Badge>
                            ) : null}
                          </p>
                          <p className="text-xs text-muted-foreground">{member.email}</p>
                        </td>
                        <td className="px-4 py-3">{renderRoleCell(member)}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={member.status} />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                          {day(member.createdAt)}
                        </td>
                        {canManage ? (
                          <td className="px-4 py-3 text-right">
                            {locked ? (
                              <span className="text-xs text-muted-foreground">
                                {t('ownerLocked')}
                              </span>
                            ) : (
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  aria-label={t('changeRoleLabel', { name: displayName(member) })}
                                  disabled={updateRole.isPending || revoke.isPending}
                                  onClick={() => setChangeTarget({ member, to: member.role })}
                                >
                                  <UserCog className="mr-1 h-4 w-4" aria-hidden="true" />
                                  {t('changeRole')}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive"
                                  aria-label={t('revokeLabel', { name: displayName(member) })}
                                  disabled={updateRole.isPending || revoke.isPending}
                                  onClick={() => setRevokeTarget(member)}
                                >
                                  <UserMinus className="mr-1 h-4 w-4" aria-hidden="true" />
                                  {t('revoke')}
                                </Button>
                              </div>
                            )}
                          </td>
                        ) : null}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {totalPages > 1 ? (
              <div className="flex items-center justify-between border-t px-4 py-3">
                <p className="text-sm text-muted-foreground">
                  {t('pageSummary', { page, total: totalPages, count: totalItems })}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1 || query.isFetching}
                    aria-label={t('previousPage')}
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages || query.isFetching}
                    aria-label={t('nextPage')}
                  >
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      <RoleMatrix />

      <Dialog
        open={changeTarget !== null}
        onOpenChange={(open) => !open && !updateRole.isPending && setChangeTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('confirmChange.title')}</DialogTitle>
            <DialogDescription>
              {changeTarget
                ? t('confirmChange.description', {
                    name: displayName(changeTarget.member),
                    from: roleLabel(changeTarget.member.role),
                  })
                : null}
            </DialogDescription>
          </DialogHeader>
          {changeTarget ? (
            <div className="space-y-2">
              <Label htmlFor={changeRoleSelectId}>{t('confirmChange.roleLabel')}</Label>
              <select
                id={changeRoleSelectId}
                className={SELECT_CLASS}
                value={changeTarget.to}
                disabled={updateRole.isPending}
                aria-describedby={changeRoleHintId}
                onChange={(event) =>
                  setChangeTarget({ ...changeTarget, to: event.target.value as StaffRole })
                }
              >
                {assignableRoles.map((option) => (
                  <option key={option} value={option}>
                    {roleLabel(option)}
                  </option>
                ))}
              </select>
              <p id={changeRoleHintId} className="text-xs text-muted-foreground">
                {tAccess(`roleDescriptions.${changeTarget.to}`)}
              </p>
            </div>
          ) : null}
          {isSelf(changeTarget?.member) ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              {t('confirmChange.selfWarning')}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setChangeTarget(null)}
              disabled={updateRole.isPending}
            >
              {tCommon('cancel')}
            </Button>
            <Button
              onClick={() => void confirmChange()}
              disabled={
                updateRole.isPending ||
                !changeTarget ||
                changeTarget.to === changeTarget.member.role
              }
            >
              {updateRole.isPending ? t('confirmChange.processing') : t('confirmChange.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={revokeTarget !== null}
        onOpenChange={(open) => !open && !revoke.isPending && setRevokeTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('confirmRevoke.title')}</DialogTitle>
            <DialogDescription>
              {revokeTarget
                ? t('confirmRevoke.description', { name: displayName(revokeTarget) })
                : null}
            </DialogDescription>
          </DialogHeader>
          {isSelf(revokeTarget) ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              {t('confirmRevoke.selfWarning')}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRevokeTarget(null)}
              disabled={revoke.isPending}
            >
              {tCommon('cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => void confirmRevoke()}
              disabled={revoke.isPending}
            >
              {revoke.isPending ? t('confirmRevoke.processing') : t('confirmRevoke.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
