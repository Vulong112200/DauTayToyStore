import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { CatalogPagination } from '@/components/catalog/pagination';
import { blogApi } from '@/lib/api/blog';

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Mẹo hay và kiến thức nuôi dạy con từ DauTayToy Store.',
};

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function BlogPage({ searchParams }: PageProps) {
  const { page: pageParam } = await searchParams;
  const page = Number(pageParam ?? '1') || 1;
  const result = await blogApi.list({ page, pageSize: 9 });

  return (
    <section className="container py-12">
      <h1 className="font-display text-3xl font-bold">Blog</h1>

      {result.items.length === 0 ? (
        <p className="mt-8 text-muted-foreground">Chưa có bài viết nào.</p>
      ) : (
        <>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {result.items.map((post) => (
              <Link
                key={post.id}
                href={`/blog/${post.slug}`}
                className="group overflow-hidden rounded-2xl border border-border transition-shadow hover:shadow-md"
              >
                <div className="relative aspect-video bg-muted">
                  {post.coverImageUrl ? (
                    <Image
                      src={post.coverImageUrl}
                      alt={post.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-4xl" aria-hidden>
                      📝
                    </div>
                  )}
                </div>
                <div className="p-4">
                  {post.categoryName && (
                    <span className="text-xs font-medium text-primary">{post.categoryName}</span>
                  )}
                  <h2 className="mt-1 line-clamp-2 font-display text-lg font-bold group-hover:text-primary">
                    {post.title}
                  </h2>
                  {post.excerpt && (
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                      {post.excerpt}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
          <CatalogPagination page={result.meta.page} totalPages={result.meta.totalPages} />
        </>
      )}
    </section>
  );
}
