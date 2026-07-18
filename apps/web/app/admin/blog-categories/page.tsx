'use client';

import * as React from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import type { BlogCategoryInput } from '@repo/contracts';
import { BlogCategoryForm } from '@/components/admin/blog/blog-category-form';
import { Button } from '@/components/ui/button';
import {
  useAdminBlogCategories,
  useCreateBlogCategory,
  useDeleteBlogCategory,
  useUpdateBlogCategory,
} from '@/hooks/use-admin-blog-categories';
import { useCanManageContent } from '@/hooks/use-can-manage';
import { ApiError } from '@/lib/api-client';

export default function AdminBlogCategoriesPage() {
  const { data: categories, isLoading } = useAdminBlogCategories();
  const createCategory = useCreateBlogCategory();
  const updateCategory = useUpdateBlogCategory();
  const deleteCategory = useDeleteBlogCategory();
  const canManage = useCanManageContent();

  const [mode, setMode] = React.useState<'idle' | 'create' | string>('idle');
  const [error, setError] = React.useState<string | null>(null);

  async function handleCreate(input: BlogCategoryInput) {
    setError(null);
    try {
      await createCategory.mutateAsync(input);
      setMode('idle');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể lưu danh mục');
    }
  }

  async function handleUpdate(id: string, input: BlogCategoryInput) {
    setError(null);
    try {
      await updateCategory.mutateAsync({ id, input });
      setMode('idle');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể lưu danh mục');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Danh mục blog</h1>
        {mode === 'idle' && canManage && (
          <Button size="sm" onClick={() => setMode('create')}>
            <Plus className="h-4 w-4" /> Thêm danh mục
          </Button>
        )}
      </div>

      {isLoading && <p className="text-muted-foreground">Đang tải...</p>}

      {mode === 'create' && (
        <BlogCategoryForm
          onSubmit={handleCreate}
          onCancel={() => setMode('idle')}
          isSubmitting={createCategory.isPending}
          error={error}
        />
      )}

      <div className="space-y-3">
        {categories?.map((category) =>
          mode === category.id ? (
            <BlogCategoryForm
              key={category.id}
              initialValue={category}
              onSubmit={(input) => handleUpdate(category.id, input)}
              onCancel={() => setMode('idle')}
              isSubmitting={updateCategory.isPending}
              error={error}
            />
          ) : (
            <div
              key={category.id}
              className="flex items-center justify-between rounded-2xl border border-border bg-card p-4"
            >
              <div>
                <p className="font-semibold">{category.name}</p>
                <p className="text-xs text-muted-foreground">
                  /{category.slug} · {category.postCount} bài viết
                </p>
              </div>
              {canManage && (
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Sửa danh mục"
                    onClick={() => setMode(category.id)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Xoá danh mục"
                    disabled={deleteCategory.isPending}
                    onClick={() => {
                      if (window.confirm(`Xoá danh mục "${category.name}"?`)) {
                        deleteCategory.mutate(category.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          ),
        )}
        {categories?.length === 0 && mode === 'idle' && (
          <p className="text-muted-foreground">Chưa có danh mục blog nào.</p>
        )}
      </div>
    </div>
  );
}
