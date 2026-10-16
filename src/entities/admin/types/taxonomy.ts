/** Admin category and brand DTOs. */

export interface AdminTaxonomy {
  id: string;
  name: string;
  slug: string;
  /** Categories only. */
  parentId?: string | null;
  productCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminTaxonomyInput {
  name?: string;
  slug?: string;
  parentId?: string | null;
}
