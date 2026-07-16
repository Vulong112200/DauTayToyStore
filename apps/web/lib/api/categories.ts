import type { Category, CategoryTreeNode } from '@repo/contracts';
import { apiFetch } from '../api-client';

export const categoriesApi = {
  tree: () => apiFetch<CategoryTreeNode[]>('/categories', { revalidateSeconds: 300 }),
  bySlug: (slug: string) =>
    apiFetch<Category>(`/categories/${encodeURIComponent(slug)}`, { revalidateSeconds: 300 }),
};
