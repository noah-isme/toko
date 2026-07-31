/**
 * Shared create/edit form for admin products.
 *
 * The backend treats `images`, `specs` and `variants` as full replacements when
 * the key is present in the payload, so the form always sends the complete
 * collections rather than a diff.
 */
'use client';

import { Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Textarea } from '@/components/ui/textarea';
import { useAdminBrands, useAdminCategories } from '@/lib/api/hooks.admin';
import type {
  AdminProductDetail,
  AdminProductInput,
  AdminProductVariantInput,
} from '@/lib/api/services/admin';

/** Mirrors the backend `slugify` closely enough for a form default. */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Sentinel for "no category/brand", since Radix Select cannot hold an empty value. */
const NONE = '__none__';

interface SpecRow {
  key: string;
  value: string;
}

interface VariantRow {
  /** Present for variants that already exist server-side. */
  id?: string;
  sku: string;
  price: number;
  stock: number;
  /** Free-form JSON, validated on submit. */
  attributes: string;
}

export interface ProductFormValues {
  title: string;
  slug: string;
  price: number;
  compareAt: string;
  inStock: boolean;
  thumbnail: string;
  badges: string;
  description: string;
  categoryId: string;
  brandId: string;
  images: string[];
  specs: SpecRow[];
  variants: VariantRow[];
}

const EMPTY_VALUES: ProductFormValues = {
  title: '',
  slug: '',
  price: 0,
  compareAt: '',
  inStock: true,
  thumbnail: '',
  badges: '',
  description: '',
  categoryId: NONE,
  brandId: NONE,
  images: [],
  specs: [],
  variants: [],
};

export function productToFormValues(product: AdminProductDetail): ProductFormValues {
  return {
    title: product.title,
    slug: product.slug,
    price: product.price,
    compareAt: product.compareAt == null ? '' : String(product.compareAt),
    inStock: product.inStock,
    thumbnail: product.thumbnail ?? '',
    badges: product.badges.join(', '),
    description: product.description ?? '',
    categoryId: product.categoryId ?? NONE,
    brandId: product.brandId ?? NONE,
    images: product.images.map((image) => image.url),
    specs: product.specs.map((spec) => ({ key: spec.key, value: spec.value })),
    variants: product.variants.map((variant) => ({
      id: variant.id,
      sku: variant.sku ?? '',
      price: variant.price,
      stock: variant.stock,
      attributes: JSON.stringify(variant.attributes ?? {}, null, 0),
    })),
  };
}

/** Throws when a variant carries unparseable JSON attributes. */
export function formValuesToInput(values: ProductFormValues): AdminProductInput {
  const variants: AdminProductVariantInput[] = values.variants.map((variant, index) => {
    let attributes: Record<string, unknown> = {};
    const raw = variant.attributes.trim();
    if (raw) {
      try {
        const parsed: unknown = JSON.parse(raw);
        if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
          throw new Error('not an object');
        }
        attributes = parsed as Record<string, unknown>;
      } catch {
        throw new Error(`Variant ${index + 1}: attributes must be a JSON object`);
      }
    }
    return {
      id: variant.id,
      sku: variant.sku.trim() || null,
      price: Math.max(0, Math.round(variant.price)),
      stock: Math.max(0, Math.round(variant.stock)),
      attributes,
    };
  });

  return {
    title: values.title.trim(),
    slug: values.slug.trim() || slugify(values.title),
    price: Math.max(0, Math.round(values.price)),
    compareAt: values.compareAt === '' ? null : Math.max(0, Math.round(Number(values.compareAt))),
    inStock: values.inStock,
    thumbnail: values.thumbnail.trim() || null,
    badges: values.badges
      .split(',')
      .map((badge) => badge.trim())
      .filter(Boolean),
    description: values.description.trim() || null,
    categoryId: values.categoryId === NONE ? null : values.categoryId,
    brandId: values.brandId === NONE ? null : values.brandId,
    images: values.images.map((url) => url.trim()).filter(Boolean),
    specs: values.specs
      .map((spec) => ({ key: spec.key.trim(), value: spec.value.trim() }))
      .filter((spec) => spec.key !== ''),
    variants,
  };
}

export interface ProductFormProps {
  initialValues?: ProductFormValues;
  submitLabel: string;
  saving: boolean;
  onSubmit: (input: AdminProductInput) => void | Promise<void>;
  onError: (message: string) => void;
  onCancel: () => void;
}

export function ProductForm({
  initialValues,
  submitLabel,
  saving,
  onSubmit,
  onError,
  onCancel,
}: ProductFormProps) {
  const [values, setValues] = useState<ProductFormValues>(initialValues ?? EMPTY_VALUES);
  // Once the slug is hand-edited, stop deriving it from the title.
  const [slugTouched, setSlugTouched] = useState(Boolean(initialValues?.slug));

  const categories = useAdminCategories();
  const brands = useAdminBrands();

  const update = <K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!values.title.trim()) {
      onError('Title is required');
      return;
    }
    let input: AdminProductInput;
    try {
      input = formValuesToInput(values);
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Invalid form values');
      return;
    }
    await onSubmit(input);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Basics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="product-title">Title</Label>
              <Input
                id="product-title"
                value={values.title}
                onChange={(event) => {
                  const title = event.target.value;
                  setValues((current) => ({
                    ...current,
                    title,
                    slug: slugTouched ? current.slug : slugify(title),
                  }));
                }}
                placeholder="Product name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="product-slug">Slug</Label>
              <Input
                id="product-slug"
                value={values.slug}
                onChange={(event) => {
                  setSlugTouched(true);
                  update('slug', event.target.value);
                }}
                placeholder="product-slug"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="product-price">Price (Rp)</Label>
              <Input
                id="product-price"
                type="number"
                min={0}
                value={values.price}
                onChange={(event) => update('price', Number(event.target.value))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="product-compare-at">Compare-at price (Rp)</Label>
              <Input
                id="product-compare-at"
                type="number"
                min={0}
                value={values.compareAt}
                onChange={(event) => update('compareAt', event.target.value)}
                placeholder="Optional"
              />
              <p className="text-xs text-muted-foreground">
                Shown struck through when higher than the price.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="product-category">Category</Label>
              <Select
                value={values.categoryId}
                onValueChange={(value) => update('categoryId', value)}
              >
                <SelectTrigger id="product-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>No category</SelectItem>
                  {(categories.data ?? []).map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="product-brand">Brand</Label>
              <Select value={values.brandId} onValueChange={(value) => update('brandId', value)}>
                <SelectTrigger id="product-brand">
                  <SelectValue placeholder="Select brand" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>No brand</SelectItem>
                  {(brands.data ?? []).map((brand) => (
                    <SelectItem key={brand.id} value={brand.id}>
                      {brand.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="product-thumbnail">Thumbnail URL</Label>
              <Input
                id="product-thumbnail"
                value={values.thumbnail}
                onChange={(event) => update('thumbnail', event.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="product-badges">Badges</Label>
              <Input
                id="product-badges"
                value={values.badges}
                onChange={(event) => update('badges', event.target.value)}
                placeholder="new, bestseller"
              />
              <p className="text-xs text-muted-foreground">Comma separated.</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Switch
              id="product-in-stock"
              checked={values.inStock}
              onCheckedChange={(checked) => update('inStock', checked)}
            />
            <Label htmlFor="product-in-stock">In stock</Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="product-description">Description</Label>
            <Textarea
              id="product-description"
              value={values.description}
              onChange={(event) => update('description', event.target.value)}
              rows={5}
              placeholder="Product description..."
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Images</CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => update('images', [...values.images, ''])}
          >
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            Add image
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {values.images.length === 0 ? (
            <p className="text-sm text-muted-foreground">No gallery images.</p>
          ) : (
            values.images.map((url, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  value={url}
                  onChange={(event) => {
                    const next = [...values.images];
                    next[index] = event.target.value;
                    update('images', next);
                  }}
                  placeholder="https://..."
                  aria-label={`Image URL ${index + 1}`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove image ${index + 1}`}
                  onClick={() =>
                    update(
                      'images',
                      values.images.filter((_, i) => i !== index),
                    )
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Specifications</CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => update('specs', [...values.specs, { key: '', value: '' }])}
          >
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            Add spec
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {values.specs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No specifications.</p>
          ) : (
            values.specs.map((spec, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  value={spec.key}
                  onChange={(event) => {
                    const next = [...values.specs];
                    next[index] = { ...spec, key: event.target.value };
                    update('specs', next);
                  }}
                  placeholder="Weight"
                  aria-label={`Spec name ${index + 1}`}
                />
                <Input
                  value={spec.value}
                  onChange={(event) => {
                    const next = [...values.specs];
                    next[index] = { ...spec, value: event.target.value };
                    update('specs', next);
                  }}
                  placeholder="1.2 kg"
                  aria-label={`Spec value ${index + 1}`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove spec ${index + 1}`}
                  onClick={() =>
                    update(
                      'specs',
                      values.specs.filter((_, i) => i !== index),
                    )
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Variants</CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              update('variants', [
                ...values.variants,
                { sku: '', price: values.price, stock: 0, attributes: '{}' },
              ])
            }
          >
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            Add variant
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {values.variants.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No variants. Stock is tracked per variant, so add at least one to sell this product.
            </p>
          ) : (
            values.variants.map((variant, index) => (
              <div key={variant.id ?? `new-${index}`} className="rounded-lg border p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-medium">Variant {index + 1}</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove variant ${index + 1}`}
                    onClick={() =>
                      update(
                        'variants',
                        values.variants.filter((_, i) => i !== index),
                      )
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor={`variant-sku-${index}`}>SKU</Label>
                    <Input
                      id={`variant-sku-${index}`}
                      value={variant.sku}
                      onChange={(event) => {
                        const next = [...values.variants];
                        next[index] = { ...variant, sku: event.target.value };
                        update('variants', next);
                      }}
                      placeholder="PRD-001-BLK"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`variant-price-${index}`}>Price (Rp)</Label>
                    <Input
                      id={`variant-price-${index}`}
                      type="number"
                      min={0}
                      value={variant.price}
                      onChange={(event) => {
                        const next = [...values.variants];
                        next[index] = { ...variant, price: Number(event.target.value) };
                        update('variants', next);
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`variant-stock-${index}`}>Stock</Label>
                    <Input
                      id={`variant-stock-${index}`}
                      type="number"
                      min={0}
                      value={variant.stock}
                      onChange={(event) => {
                        const next = [...values.variants];
                        next[index] = { ...variant, stock: Number(event.target.value) };
                        update('variants', next);
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`variant-attributes-${index}`}>Attributes (JSON)</Label>
                    <Input
                      id={`variant-attributes-${index}`}
                      value={variant.attributes}
                      onChange={(event) => {
                        const next = [...values.variants];
                        next[index] = { ...variant, attributes: event.target.value };
                        update('variants', next);
                      }}
                      placeholder='{"color":"black","size":"L"}'
                      className="font-mono text-xs"
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Save className="mr-2 h-4 w-4" aria-hidden="true" />
          )}
          {submitLabel}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
