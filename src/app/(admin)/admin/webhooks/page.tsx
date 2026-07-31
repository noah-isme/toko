'use client';

import { Plus, RefreshCw, Repeat, Trash2 } from 'lucide-react';
import { useState } from 'react';

import {
  ActiveBadge,
  AdminEmpty,
  AdminError,
  AdminLoading,
  AdminPageHeader,
} from '@/components/admin/admin-ui';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  useAdminWebhookDeliveries,
  useAdminWebhooks,
  useCreateAdminWebhook,
  useDeleteAdminWebhook,
  useReplayAdminWebhookDelivery,
  useUpdateAdminWebhook,
} from '@/lib/api/hooks.admin';
import {
  formatRelativeTime,
  type AdminWebhookEndpoint,
  type AdminWebhookEndpointInput,
} from '@/lib/api/services/admin';
import { cn } from '@/lib/utils';
import { useToast } from '@/shared/ui/toast';

/** Mirrors `events.DefaultTopics()` in the API. */
const TOPICS = [
  'order.created',
  'order.paid',
  'order.canceled',
  'payment.failed',
  'payment.expired',
  'shipment.shipped',
  'shipment.out_for_delivery',
  'shipment.delivered',
] as const;

const DELIVERY_STATUSES = ['all', 'PENDING', 'SUCCESS', 'FAILED', 'DEAD'] as const;

interface WebhookForm {
  name: string;
  url: string;
  secret: string;
  active: boolean;
  topics: string[];
}

const EMPTY_FORM: WebhookForm = {
  name: '',
  url: '',
  secret: '',
  active: true,
  topics: [],
};

function deliveryStatusClass(status: string): string {
  switch (status.toUpperCase()) {
    case 'SUCCESS':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'FAILED':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'DEAD':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

/** Never render a full signing secret; show enough to identify it. */
function maskSecret(secret: string): string {
  if (secret.length <= 4) return '••••';
  return `${'•'.repeat(8)}${secret.slice(-4)}`;
}

export default function WebhooksPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminWebhookEndpoint | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminWebhookEndpoint | null>(null);
  const [form, setForm] = useState<WebhookForm>(EMPTY_FORM);
  const [endpointFilter, setEndpointFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<(typeof DELIVERY_STATUSES)[number]>('all');

  const endpoints = useAdminWebhooks();
  const deliveries = useAdminWebhookDeliveries({
    limit: 25,
    endpointId: endpointFilter === 'all' ? undefined : endpointFilter,
    status: statusFilter === 'all' ? undefined : statusFilter,
  });
  const createWebhook = useCreateAdminWebhook();
  const updateWebhook = useUpdateAdminWebhook();
  const deleteWebhook = useDeleteAdminWebhook();
  const replayDelivery = useReplayAdminWebhookDelivery();

  const saving = createWebhook.isPending || updateWebhook.isPending;

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (endpoint: AdminWebhookEndpoint) => {
    setEditing(endpoint);
    setForm({
      name: endpoint.name,
      url: endpoint.url,
      secret: endpoint.secret,
      active: endpoint.active,
      topics: endpoint.topics ?? [],
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const payload: AdminWebhookEndpointInput = {
      name: form.name.trim(),
      url: form.url.trim(),
      secret: form.secret.trim(),
      active: form.active,
      topics: form.topics,
    };
    if (!payload.name || !payload.url || !payload.secret) {
      toast({ title: 'Name, URL and secret are required', variant: 'destructive' });
      return;
    }
    if (payload.topics.length === 0) {
      toast({ title: 'Select at least one topic', variant: 'destructive' });
      return;
    }
    try {
      if (editing) {
        await updateWebhook.mutateAsync({ id: editing.id, data: payload });
        toast({ title: 'Endpoint updated', description: payload.name, variant: 'success' });
      } else {
        await createWebhook.mutateAsync(payload);
        toast({ title: 'Endpoint created', description: payload.name, variant: 'success' });
      }
      setDialogOpen(false);
      setEditing(null);
    } catch (error) {
      toast({
        title: 'Could not save endpoint',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteWebhook.mutateAsync(deleteTarget.id);
      toast({ title: 'Endpoint deleted', description: deleteTarget.name, variant: 'success' });
      setDeleteTarget(null);
    } catch (error) {
      toast({
        title: 'Could not delete endpoint',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const handleReplay = async (id: string) => {
    try {
      await replayDelivery.mutateAsync(id);
      toast({ title: 'Delivery queued for replay', variant: 'success' });
    } catch (error) {
      toast({
        title: 'Could not replay delivery',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const toggleTopic = (topic: string) => {
    setForm((current) => ({
      ...current,
      topics: current.topics.includes(topic)
        ? current.topics.filter((item) => item !== topic)
        : [...current.topics, topic],
    }));
  };

  const endpointName = (id: string) =>
    (endpoints.data ?? []).find((endpoint) => endpoint.id === id)?.name ?? id.slice(0, 8);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Webhooks"
        description="Outbound event endpoints and their delivery history"
        actions={
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            Add Endpoint
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Endpoints</CardTitle>
        </CardHeader>
        <CardContent>
          {endpoints.isLoading ? (
            <AdminLoading label="Loading endpoints..." />
          ) : endpoints.isError ? (
            <AdminError error={endpoints.error} onRetry={() => void endpoints.refetch()} />
          ) : (endpoints.data ?? []).length === 0 ? (
            <AdminEmpty
              message="No webhook endpoints configured."
              action={
                <Button size="sm" onClick={openCreate}>
                  Add Endpoint
                </Button>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead>Topics</TableHead>
                    <TableHead>Secret</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(endpoints.data ?? []).map((endpoint) => (
                    <TableRow key={endpoint.id}>
                      <TableCell className="font-medium">{endpoint.name}</TableCell>
                      <TableCell className="max-w-xs truncate font-mono text-xs">
                        {endpoint.url}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {(endpoint.topics ?? []).map((topic) => (
                            <Badge key={topic} variant="secondary" className="font-mono text-xs">
                              {topic}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {maskSecret(endpoint.secret)}
                      </TableCell>
                      <TableCell>
                        <ActiveBadge active={endpoint.active} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="outline" size="sm" onClick={() => openEdit(endpoint)}>
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-600"
                            aria-label={`Delete ${endpoint.name}`}
                            onClick={() => setDeleteTarget(endpoint)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Recent Deliveries</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Select value={endpointFilter} onValueChange={setEndpointFilter}>
              <SelectTrigger className="w-44" aria-label="Filter by endpoint">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All endpoints</SelectItem>
                {(endpoints.data ?? []).map((endpoint) => (
                  <SelectItem key={endpoint.id} value={endpoint.id}>
                    {endpoint.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={statusFilter}
              onValueChange={(value) =>
                setStatusFilter(value as (typeof DELIVERY_STATUSES)[number])
              }
            >
              <SelectTrigger className="w-36" aria-label="Filter by status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DELIVERY_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status === 'all' ? 'All statuses' : status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              aria-label="Refresh deliveries"
              onClick={() => void deliveries.refetch()}
            >
              <RefreshCw className={cn('h-4 w-4', deliveries.isFetching && 'animate-spin')} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {deliveries.isLoading ? (
            <AdminLoading label="Loading deliveries..." />
          ) : deliveries.isError ? (
            <AdminError error={deliveries.error} onRetry={() => void deliveries.refetch()} />
          ) : (deliveries.data?.data ?? []).length === 0 ? (
            <AdminEmpty message="No deliveries recorded." />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Endpoint</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Attempt</TableHead>
                    <TableHead>Response</TableHead>
                    <TableHead>Error</TableHead>
                    <TableHead>When</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(deliveries.data?.data ?? []).map((delivery) => (
                    <TableRow key={delivery.id}>
                      <TableCell className="font-medium">
                        {endpointName(delivery.endpoint_id)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn('font-medium', deliveryStatusClass(delivery.status))}
                        >
                          {delivery.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {delivery.attempt}/{delivery.max_attempt}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {delivery.response_status ?? '-'}
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                        {delivery.last_error ?? '-'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatRelativeTime(delivery.updated_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={replayDelivery.isPending}
                          onClick={() => void handleReplay(delivery.id)}
                        >
                          <Repeat className="mr-2 h-4 w-4" aria-hidden="true" />
                          Replay
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditing(null);
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Endpoint' : 'Add Endpoint'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="webhook-name">Name</Label>
              <Input
                id="webhook-name"
                value={form.name}
                onChange={(event) => setForm((c) => ({ ...c, name: event.target.value }))}
                placeholder="Fulfilment service"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="webhook-url">URL</Label>
              <Input
                id="webhook-url"
                type="url"
                value={form.url}
                onChange={(event) => setForm((c) => ({ ...c, url: event.target.value }))}
                placeholder="https://example.com/hooks/toko"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="webhook-secret">Signing secret</Label>
              <Input
                id="webhook-secret"
                value={form.secret}
                onChange={(event) => setForm((c) => ({ ...c, secret: event.target.value }))}
                placeholder="Shared HMAC secret"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Used to sign each payload. Store it only in the receiving service.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Topics</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {TOPICS.map((topic) => (
                  <div key={topic} className="flex items-center gap-2">
                    <Checkbox
                      id={`topic-${topic}`}
                      checked={form.topics.includes(topic)}
                      onCheckedChange={() => toggleTopic(topic)}
                    />
                    <Label htmlFor={`topic-${topic}`} className="font-mono text-xs">
                      {topic}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="webhook-active"
                checked={form.active}
                onCheckedChange={(checked) => setForm((c) => ({ ...c, active: checked }))}
              />
              <Label htmlFor="webhook-active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Endpoint</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Delete <strong>{deleteTarget?.name}</strong>? Pending deliveries to this endpoint stop.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteWebhook.isPending}>
              {deleteWebhook.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
