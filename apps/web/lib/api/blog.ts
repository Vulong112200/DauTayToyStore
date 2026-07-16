import type {
  BlogPostDetail,
  BlogPostListItem,
  PaginatedResponse,
  PaginationQuery,
} from '@repo/contracts';
import { apiFetch } from '../api-client';

export const blogApi = {
  list: (query: Partial<PaginationQuery> = {}) => {
    const params = new URLSearchParams();
    if (query.page) params.set('page', String(query.page));
    if (query.pageSize) params.set('pageSize', String(query.pageSize));
    const qs = params.toString();
    return apiFetch<PaginatedResponse<BlogPostListItem>>(`/blog${qs ? `?${qs}` : ''}`, {
      revalidateSeconds: 300,
    });
  },

  bySlug: (slug: string) =>
    apiFetch<BlogPostDetail>(`/blog/${encodeURIComponent(slug)}`, { revalidateSeconds: 300 }),
};
