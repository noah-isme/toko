/**
 * Shared CRUD screen for the two flat taxonomies (categories and brands). Both
 * have identical backend shapes, so the page components below only differ in
 * labels, icon, and which mutation hooks they pass in.
 */
'use client';

import type { UseMutationResult } from '@tanstack/react-query';
import { Edit, Plus, Trash2 } from 'lucide-react';
import { useState, type ComponentType } from 'react';

import { AdminEmpty, AdminError, AdminLoading, AdminPageHeader } from '@/components/admin/admin-ui';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { AdminTaxonomy, AdminTaxonomyInput } from '@/lib/api/services/admin';
import { useToast } from '@/shared/ui/toast';

/** Mirrors the backend `slugify` closely enough for a form default. */
function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

interface TaxonomyQuery {
  data?: AdminTaxonomy[];
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => unknown;
}

export interface TaxonomyManagerProps {
  title: string;
  description: string;
  /** Singular noun used in buttons and dialogs, e.g. "Category". */
  entityLabel: string;
  icon: ComponentType<{ className?: string }>;
  query: TaxonomyQuery;
  createMutation: UseMutationResult<AdminTaxonomy, unknown, AdminTaxonomyInput, unknown>;
  updateMutation: UseMutationResult<
    AdminTaxonomy,
    unknown,
    { id: string; data: AdminTaxonomyInput },
    unknown
  >;
  deleteMutation: UseMutationResult<void, unknown, string, unknown>;
}

export function TaxonomyManager({
  title,
  description,
  entityLabel,
  icon: Icon,
  query,
  createMutation,
  updateMutation,
  deleteMutation,
}: TaxonomyManagerProps) {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminTaxonomy | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminTaxonomy | null>(null);
  const [form, setForm] = useState({ name: '', slug: '' });
  /** Once the slug is hand-edited, stop deriving it from the name. */
  const [slugTouched, setSlugTouched] = useState(false);

  const items = query.data ?? [];
  const saving = createMutation.isPending || updateMutation.isPending;

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', slug: '' });
    setSlugTouched(false);
    setDialogOpen(true);
  };

  const openEdit = (item: AdminTaxonomy) => {
    setEditing(item);
    setForm({ name: item.name, slug: item.slug });
    setSlugTouched(true);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const name = form.name.trim();
    if (!name) {
      toast({ title: 'Name is required', variant: 'destructive' });
      return;
    }
    const payload: AdminTaxonomyInput = {
      name,
      slug: form.slug.trim() || slugify(name),
    };

    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, data: payload });
        toast({ title: `${entityLabel} updated`, description: name, variant: 'success' });
      } else {
        await createMutation.mutateAsync(payload);
        toast({ title: `${entityLabel} created`, description: name, variant: 'success' });
      }
      setDialogOpen(false);
      setEditing(null);
    } catch (error) {
      toast({
        title: `Could not save ${entityLabel.toLowerCase()}`,
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast({
        title: `${entityLabel} deleted`,
        description: deleteTarget.name,
        variant: 'success',
      });
      setDeleteTarget(null);
    } catch (error) {
      toast({
        title: `Could not delete ${entityLabel.toLowerCase()}`,
        description: error instanceof Error ? error.message : 'Still referenced by products?',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={title}
        description={description}
        actions={
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            Add {entityLabel}
          </Button>
        }
      />

      {query.isLoading ? (
        <AdminLoading label={`Loading ${title.toLowerCase()}...`} />
      ) : query.isError ? (
        <AdminError error={query.error} onRetry={() => void query.refetch()} />
      ) : items.length === 0 ? (
        <AdminEmpty
          message={`No ${title.toLowerCase()} yet.`}
          action={
            <Button size="sm" onClick={openCreate}>
              Add {entityLabel}
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((item) => (
            <Card key={item.id}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="truncate text-lg">{item.name}</CardTitle>
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              </CardHeader>
              <CardContent>
                <p className="mb-1 truncate text-sm text-muted-foreground">{item.slug}</p>
                <p className="text-sm">
                  <strong>{item.productCount}</strong> products
                </p>
                <div className="mt-4 flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(item)}>
                    <Edit className="mr-1 h-3 w-3" aria-hidden="true" />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600"
                    onClick={() => setDeleteTarget(item)}
                  >
                    <Trash2 className="mr-1 h-3 w-3" aria-hidden="true" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditing(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? `Edit ${entityLabel}` : `Add ${entityLabel}`}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="taxonomy-name">Name</Label>
              <Input
                id="taxonomy-name"
                value={form.name}
                onChange={(event) => {
                  const name = event.target.value;
                  setForm((current) => ({
                    name,
                    slug: slugTouched ? current.slug : slugify(name),
                  }));
                }}
                placeholder={`${entityLabel} name`}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="taxonomy-slug">Slug</Label>
              <Input
                id="taxonomy-slug"
                value={form.slug}
                onChange={(event) => {
                  setSlugTouched(true);
                  setForm((current) => ({ ...current, slug: event.target.value }));
                }}
                placeholder={`${entityLabel.toLowerCase()}-slug`}
              />
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
            <DialogTitle>Delete {entityLabel}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Delete <strong>{deleteTarget?.name}</strong>? Products referencing it keep existing but
            lose this association.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
