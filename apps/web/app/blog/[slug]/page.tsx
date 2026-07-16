import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { ApiError } from '@/lib/api-client';
import { blogApi } from '@/lib/api/blog';

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function loadPost(slug: string) {
  try {
    return await blogApi.bySlug(slug);
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 404) return null;
    throw error;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await loadPost(slug);
  if (!post) return { title: 'Không tìm thấy bài viết' };
  return {
    title: post.metaTitle ?? post.title,
    description: post.metaDescription ?? undefined,
    openGraph: {
      images: post.coverImageUrl ? [post.coverImageUrl] : undefined,
    },
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await loadPost(slug);
  if (!post) notFound();

  return (
    <article className="container py-12">
      <div className="mx-auto max-w-2xl">
        {post.categoryName && (
          <span className="text-sm font-medium text-primary">{post.categoryName}</span>
        )}
        <h1 className="mt-1 font-display text-3xl font-bold sm:text-4xl">{post.title}</h1>
        {post.publishedAt && (
          <p className="mt-2 text-sm text-muted-foreground">
            {new Date(post.publishedAt).toLocaleDateString('vi-VN')}
          </p>
        )}

        {post.coverImageUrl && (
          <div className="relative mt-6 aspect-video overflow-hidden rounded-2xl bg-muted">
            <Image
              src={post.coverImageUrl}
              alt={post.title}
              fill
              sizes="100vw"
              className="object-cover"
              priority
            />
          </div>
        )}

        <div
          className="prose-content mt-8"
          // Blog content is authored/sanitized by the admin content module.
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
      </div>
    </article>
  );
}
