'use client';

import { useParams } from 'next/navigation';
import { BlogPostForm } from '@/components/admin/blog/blog-post-form';
import { useAdminBlogPost } from '@/hooks/use-admin-blog-posts';

export default function EditBlogPostPage() {
  const params = useParams<{ id: string }>();
  const { data: post, isLoading } = useAdminBlogPost(params.id);

  if (isLoading || !post) {
    return <p className="text-muted-foreground">Đang tải...</p>;
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Chỉnh sửa: {post.title}</h1>
      <BlogPostForm post={post} />
    </div>
  );
}
