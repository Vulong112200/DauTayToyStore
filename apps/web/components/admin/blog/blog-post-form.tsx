'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import {
  type AdminBlogPostDetail,
  type BlogPostInput,
  blogPostInputSchema,
} from '@repo/contracts';
import { FormError } from '@/components/auth/form-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAdminBlogCategories } from '@/hooks/use-admin-blog-categories';
import { useCreateBlogPost, useUpdateBlogPost } from '@/hooks/use-admin-blog-posts';
import { ApiError } from '@/lib/api-client';

function toDefaultValues(post?: AdminBlogPostDetail): BlogPostInput {
  if (!post) {
    return { title: '', slug: '', content: '', status: 'DRAFT' };
  }

  return {
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt ?? undefined,
    content: post.content,
    coverImageUrl: post.coverImageUrl ?? undefined,
    categoryId: post.categoryId ?? undefined,
    status: post.status,
    metaTitle: post.metaTitle ?? undefined,
    metaDescription: post.metaDescription ?? undefined,
  };
}

export function BlogPostForm({ post }: { post?: AdminBlogPostDetail }) {
  const router = useRouter();
  const isEdit = !!post;
  const { data: categories } = useAdminBlogCategories();
  const createPost = useCreateBlogPost();
  const updatePost = useUpdateBlogPost();
  const [serverError, setServerError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BlogPostInput>({
    resolver: zodResolver(blogPostInputSchema),
    defaultValues: toDefaultValues(post),
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      if (isEdit) {
        await updatePost.mutateAsync({ id: post.id, input: values });
      } else {
        await createPost.mutateAsync(values);
      }
      router.push('/admin/blog');
      router.refresh();
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : 'Không thể lưu bài viết');
    }
  });

  const isSubmitting = createPost.isPending || updatePost.isPending;

  return (
    <form onSubmit={onSubmit} className="space-y-8" noValidate>
      <FormError message={serverError} />

      <section className="grid gap-4 rounded-2xl border border-border bg-card p-6 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="title">Tiêu đề</Label>
          <Input id="title" aria-invalid={!!errors.title} {...register('title')} />
          {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="slug">Slug</Label>
          <Input id="slug" aria-invalid={!!errors.slug} {...register('slug')} />
          {errors.slug && <p className="text-xs text-destructive">{errors.slug.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="categoryId">Danh mục (tuỳ chọn)</Label>
          <select
            id="categoryId"
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
            {...register('categoryId')}
          >
            <option value="">— Không có —</option>
            {categories?.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="status">Trạng thái</Label>
          <select
            id="status"
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
            {...register('status')}
          >
            <option value="DRAFT">Nháp</option>
            <option value="PUBLISHED">Đã xuất bản</option>
          </select>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="coverImageUrl">URL ảnh bìa (tuỳ chọn)</Label>
          <Input id="coverImageUrl" {...register('coverImageUrl')} />
          {errors.coverImageUrl && (
            <p className="text-xs text-destructive">{errors.coverImageUrl.message}</p>
          )}
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="excerpt">Tóm tắt (tuỳ chọn)</Label>
          <textarea
            id="excerpt"
            rows={2}
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
            {...register('excerpt')}
          />
        </div>
      </section>

      <section className="space-y-1.5 rounded-2xl border border-border bg-card p-6">
        <Label htmlFor="content">Nội dung</Label>
        <textarea
          id="content"
          rows={16}
          aria-invalid={!!errors.content}
          className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
          {...register('content')}
        />
        {errors.content && <p className="text-xs text-destructive">{errors.content.message}</p>}
      </section>

      <section className="grid gap-4 rounded-2xl border border-border bg-card p-6 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="metaTitle">Meta title (SEO, tuỳ chọn)</Label>
          <Input id="metaTitle" {...register('metaTitle')} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="metaDescription">Meta description (SEO, tuỳ chọn)</Label>
          <Input id="metaDescription" {...register('metaDescription')} />
        </div>
      </section>

      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Đang lưu...' : 'Lưu bài viết'}
        </Button>
      </div>
    </form>
  );
}
