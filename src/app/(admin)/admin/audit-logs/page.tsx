'use client';

import { format } from 'date-fns';
import { ChevronLeft, ChevronRight, Filter, X, Search, Loader2 } from 'lucide-react';
import { useState } from 'react';

import { useAdminAuditLogs } from '@/lib/api/hooks.admin';
import { cn } from '@/lib/utils';
import { useToast } from '@/shared/ui/toast';

export default function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [actionFilter, setActionFilter] = useState('');
  const [resourceTypeFilter, setResourceTypeFilter] = useState('');
  const [userIdFilter, setUserIdFilter] = useState('');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const { toast } = useToast();

  const { data, isLoading, error, refetch } = useAdminAuditLogs({
    page,
    limit,
    action: actionFilter || undefined,
    resourceType: resourceTypeFilter || undefined,
  });

  const handleFilter = () => setPage(1);
  const clearFilters = () => {
    setActionFilter('');
    setResourceTypeFilter('');
    setUserIdFilter('');
    setStartDateFilter('');
    setEndDateFilter('');
    setPage(1);
  };

  const hasFilters =
    actionFilter || resourceTypeFilter || userIdFilter || startDateFilter || endDateFilter;

  if (error) {
    toast({ title: 'Failed to load audit logs', variant: 'destructive' });
  }

  const totalPages = data ? Math.ceil(data.pagination.totalItems / limit) : 0;
  const logs = data?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Audit Logs</h1>
        <div className="flex items-center gap-2">
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              <X className="mr-1 h-4 w-4" />
              Clear filters
            </button>
          )}
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4" aria-label="Filters">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Action contains…"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleFilter()}
            className="w-full rounded-md border bg-background py-2 pl-10 pr-4 text-sm"
          />
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Resource type…"
            value={resourceTypeFilter}
            onChange={(e) => setResourceTypeFilter(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleFilter()}
            className="w-full rounded-md border bg-background py-2 pl-10 pr-4 text-sm"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="datetime-local"
            value={startDateFilter}
            onChange={(e) => setStartDateFilter(e.target.value)}
            className="w-full rounded-md border bg-background py-2 pl-10 pr-4 text-sm"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="datetime-local"
            value={endDateFilter}
            onChange={(e) => setEndDateFilter(e.target.value)}
            className="w-full rounded-md border bg-background py-2 pl-10 pr-4 text-sm"
          />
        </div>
      </section>

      <div className="rounded-md border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full" role="table">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                  ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                  Actor
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                  Action
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                  Resource
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                  Method
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                  IP
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                    No audit logs found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {log.id.slice(0, 8)}…
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="inline-flex items-center gap-1">
                        <span
                          className={cn(
                            'px-1.5 py-0.5 text-xs rounded',
                            log.actorKind === 'user' &&
                              'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
                            log.actorKind === 'system' &&
                              'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
                            log.actorKind === 'anonymous' &&
                              'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
                          )}
                        >
                          {log.actorKind}
                        </span>
                        {log.userId && (
                          <span className="font-mono text-xs text-muted-foreground">
                            {log.userId.slice(0, 8)}…
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-sm text-muted-foreground">
                      {log.action}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="font-medium">{log.resourceType}</span>
                      {log.resourceId && (
                        <span className="ml-1 font-mono text-xs text-muted-foreground">
                          #{log.resourceId.slice(0, 8)}…
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs uppercase">
                      <span
                        className={cn(
                          'px-1.5 py-0.5 rounded',
                          log.method === 'GET' && 'bg-green-100 text-green-700',
                          log.method === 'POST' && 'bg-blue-100 text-blue-700',
                          log.method === 'PUT' && 'bg-yellow-100 text-yellow-700',
                          log.method === 'PATCH' && 'bg-orange-100 text-orange-700',
                          log.method === 'DELETE' && 'bg-red-100 text-red-700',
                        )}
                      >
                        {log.method}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      <span
                        className={cn(
                          'px-1.5 py-0.5 rounded',
                          log.status >= 200 && log.status < 300 && 'bg-green-100 text-green-700',
                          log.status >= 400 && log.status < 500 && 'bg-yellow-100 text-yellow-700',
                          log.status >= 500 && 'bg-red-100 text-red-700',
                        )}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-sm text-muted-foreground">
                      {log.ipAddress ?? '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">
                      {log.createdAt && format(new Date(log.createdAt), 'yyyy-MM-dd HH:mm:ss')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {data && totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <p className="text-sm text-muted-foreground">
              Page {page} of {totalPages} — {data.pagination.totalItems} total
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || isLoading}
                className="rounded-md p-2 hover:bg-muted disabled:opacity-50"
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || isLoading}
                className="rounded-md p-2 hover:bg-muted disabled:opacity-50"
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
