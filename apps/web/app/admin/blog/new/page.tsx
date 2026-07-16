'use client';

import { BlogPostForm } from '@/components/admin/blog/blog-post-form';

export default function NewBlogPostPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Thêm bài viết mới</h1>
      <BlogPostForm />
    </div>
  );
}
