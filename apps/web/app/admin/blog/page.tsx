'use client';

import * as React from 'react';
import Link from 'next/link';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAdminBlogPosts, useDeleteBlogPost } from '@/hooks/use-admin-blog-posts';
import { useCanManageContent } from '@/hooks/use-can-manage';

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Nháp',
  PUBLISHED: 'Đã xuất bản',
};

export default function AdminBlogPostsPage() {
  const [page, setPage] = React.useState(1);
  const [q, setQ] = React.useState('');
  const { data, isLoading } = useAdminBlogPosts({ page, pageSize: 20, q: q || undefined });
  const deletePost = useDeleteBlogPost();
  const canManage = useCanManageContent();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Bài viết</h1>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/blog-categories">Danh mục blog</Link>
          </Button>
          {canManage && (
            <Button asChild>
              <Link href="/admin/blog/new">
                <Plus className="h-4 w-4" /> Thêm bài viết
              </Link>
            </Button>
          )}
        </div>
      </div>

      <input
        type="search"
        value={q}
        onChange={(event) => {
          setQ(event.target.value);
          setPage(1);
        }}
        placeholder="Tìm theo tiêu đề..."
        aria-label="Tìm kiếm bài viết"
        className="w-full max-w-sm rounded-xl border border-input bg-background px-4 py-2 text-sm"
      />

      {isLoading ? (
        <p className="text-muted-foreground">Đang tải...</p>
      ) : !data || data.items.length === 0 ? (
        <p className="text-muted-foreground">Không tìm thấy bài viết nào.</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="p-4 font-medium">Tiêu đề</th>
                  <th className="p-4 font-medium">Danh mục</th>
                  <th className="p-4 font-medium">Trạng thái</th>
                  <th className="p-4 font-medium">Cập nhật</th>
                  <th className="p-4" aria-hidden />
                </tr>
              </thead>
              <tbody>
                {data.items.map((post) => (
                  <tr key={post.id} className="border-b border-border last:border-0">
                    <td className="p-4">
                      <Link
                        href={`/admin/blog/${post.id}`}
                        className="font-medium hover:text-primary"
                      >
                        {post.title}
                      </Link>
                      <p className="text-xs text-muted-foreground">/{post.slug}</p>
                    </td>
                    <td className="p-4 text-muted-foreground">{post.categoryName ?? '—'}</td>
                    <td className="p-4">{STATUS_LABELS[post.status] ?? post.status}</td>
                    <td className="p-4 text-muted-foreground">
                      {new Date(post.updatedAt).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="p-4 text-right">
                      {canManage && (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Xoá bài viết"
                          disabled={deletePost.isPending}
                          onClick={() => {
                            if (window.confirm(`Xoá bài viết "${post.title}"?`)) {
                              deletePost.mutate(post.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-center gap-3">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((current) => current - 1)}
            >
              Trước
            </Button>
            <span className="text-sm text-muted-foreground">
              Trang {data.meta.page} / {data.meta.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.meta.totalPages}
              onClick={() => setPage((current) => current + 1)}
            >
              Sau
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
