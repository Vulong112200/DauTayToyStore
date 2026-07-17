import Link from 'next/link';
import { ProductCard } from '@/components/catalog/product-card';
import { productsApi } from '@/lib/api/products';

export async function FeaturedProducts() {
  const { items } = await productsApi.list({ sort: 'rating', pageSize: 4 });

  if (items.length === 0) return null;

  return (
    <section className="container py-16">
      <div className="mb-8 flex items-end justify-between">
        <h2 className="font-display text-2xl font-bold sm:text-3xl">Sản phẩm nổi bật</h2>
        <Link href="/products" className="text-sm font-medium text-primary hover:underline">
          Xem tất cả
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((product, index) => (
          <div
            key={product.id}
            className="animate-fade-up opacity-0"
            style={{ animationDelay: `${index * 60}ms`, animationFillMode: 'forwards' }}
          >
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </section>
  );
}
