import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CatalogPagination } from '@/components/catalog/pagination';
import { ProductCard } from '@/components/catalog/product-card';
import { ApiError } from '@/lib/api-client';
import { categoriesApi } from '@/lib/api/categories';
import { productsApi } from '@/lib/api/products';

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

async function loadCategory(slug: string) {
  try {
    return await categoriesApi.bySlug(slug);
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 404) return null;
    throw error;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = await loadCategory(slug);
  if (!category) return { title: 'Không tìm thấy danh mục' };
  return {
    title: category.name,
    description: category.description ?? `Sản phẩm thuộc danh mục ${category.name}`,
  };
}

export default async function CategoryDetailPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { page: pageParam } = await searchParams;
  const category = await loadCategory(slug);
  if (!category) notFound();

  const page = Number(pageParam ?? '1') || 1;
  const result = await productsApi.list({ categorySlug: slug, page, pageSize: 20 });

  return (
    <section className="container py-12">
      <h1 className="font-display text-3xl font-bold">{category.name}</h1>
      {category.description && (
        <p className="mt-2 max-w-2xl text-muted-foreground">{category.description}</p>
      )}

      {result.items.length === 0 ? (
        <p className="mt-8 text-muted-foreground">Chưa có sản phẩm trong danh mục này.</p>
      ) : (
        <>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {result.items.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          <CatalogPagination page={result.meta.page} totalPages={result.meta.totalPages} />
        </>
      )}
    </section>
  );
}
