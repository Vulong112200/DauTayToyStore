import type { Metadata } from 'next';
import type { ProductSort } from '@repo/contracts';
import { CatalogPagination } from '@/components/catalog/pagination';
import { ProductCard } from '@/components/catalog/product-card';
import { ProductSearchInput } from '@/components/catalog/product-search-input';
import { ProductSortSelect } from '@/components/catalog/product-sort-select';
import { productsApi } from '@/lib/api/products';

export const metadata: Metadata = {
  title: 'Sản phẩm',
  description: 'Tất cả sản phẩm đồ chơi trẻ em tại DauTayToy Store.',
};

interface PageProps {
  searchParams: Promise<{ page?: string; q?: string; sort?: string; category?: string; brand?: string }>;
}

const VALID_SORTS: ProductSort[] = ['newest', 'price_asc', 'price_desc', 'rating'];

function parseSort(value: string | undefined): ProductSort {
  return VALID_SORTS.includes(value as ProductSort) ? (value as ProductSort) : 'newest';
}

export default async function ProductsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Number(params.page ?? '1') || 1;
  const sort = parseSort(params.sort);

  const result = await productsApi.list({
    page,
    pageSize: 20,
    q: params.q,
    sort,
    categorySlug: params.category,
    brandSlug: params.brand,
  });

  return (
    <section className="container py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-3xl font-bold">Sản phẩm</h1>
        <div className="flex flex-wrap gap-3">
          <ProductSearchInput defaultValue={params.q} />
          <ProductSortSelect defaultValue={sort} />
        </div>
      </div>

      {result.items.length === 0 ? (
        <p className="mt-8 text-muted-foreground">Không tìm thấy sản phẩm phù hợp.</p>
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
