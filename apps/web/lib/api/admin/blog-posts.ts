import type {
  AdminBlogPostDetail,
  AdminBlogPostListItem,
  AdminBlogPostQuery,
  BlogPostInput,
  PaginatedResponse,
} from '@repo/contracts';
import { apiFetch } from '../../api-client';

function buildQueryString(query: Partial<AdminBlogPostQuery>): string {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== '') params.set(key, String(value));
  });
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export const adminBlogPostsApi = {
  list: (query: Partial<AdminBlogPostQuery> = {}) =>
    apiFetch<PaginatedResponse<AdminBlogPostListItem>>(
      `/admin/blog-posts${buildQueryString(query)}`,
      { auth: true },
    ),

  getById: (id: string) =>
    apiFetch<AdminBlogPostDetail>(`/admin/blog-posts/${encodeURIComponent(id)}`, { auth: true }),

  create: (input: BlogPostInput) =>
    apiFetch<AdminBlogPostDetail>('/admin/blog-posts', { body: input, auth: true }),

  update: (id: string, input: BlogPostInput) =>
    apiFetch<AdminBlogPostDetail>(`/admin/blog-posts/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: input,
      auth: true,
    }),

  remove: (id: string) =>
    apiFetch<{ success: true }>(`/admin/blog-posts/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      auth: true,
    }),
};
