import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { CategoryIcon } from '@/components/catalog/category-icon';
import { categoriesApi } from '@/lib/api/categories';

export async function CategoryHighlights() {
  // Degrade gracefully on a transient API error instead of throwing the whole homepage to the
  // error boundary — same resilience the flash-sale strip already has.
  const categories = (await categoriesApi.tree().catch(() => [])).slice(0, 5);

  if (categories.length === 0) return null;

  return (
    <section className="container py-16">
      <div className="mb-8 flex items-end justify-between">
        <h2 className="font-display text-2xl font-bold sm:text-3xl">Danh mục nổi bật</h2>
        <Link href="/categories" className="text-sm font-medium text-primary hover:underline">
          Xem tất cả
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {categories.map((category, index) => (
          <Link
            key={category.slug}
            href={`/categories/${category.slug}`}
            className="animate-fade-up opacity-0"
            style={{ animationDelay: `${index * 60}ms`, animationFillMode: 'forwards' }}
          >
            <Card className="h-full transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
              <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
                <CategoryIcon name={category.name} imageUrl={category.imageUrl} index={index} />
                <span className="text-sm font-semibold">{category.name}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
