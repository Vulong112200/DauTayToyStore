import type { Metadata } from 'next';
import Link from 'next/link';
import type { CategoryTreeNode } from '@repo/contracts';
import { Card, CardContent } from '@/components/ui/card';
import { categoriesApi } from '@/lib/api/categories';

export const metadata: Metadata = {
  title: 'Danh mục sản phẩm',
  description: 'Khám phá tất cả danh mục đồ chơi trẻ em tại DauTayToy Store.',
};

function CategoryCard({ category }: { category: CategoryTreeNode }) {
  return (
    <Card className="h-full">
      <CardContent className="p-6">
        <Link
          href={`/categories/${category.slug}`}
          className="font-display text-lg font-bold hover:text-primary"
        >
          {category.name}
        </Link>
        {category.description && (
          <p className="mt-1 text-sm text-muted-foreground">{category.description}</p>
        )}
        {category.children.length > 0 && (
          <ul className="mt-3 space-y-1">
            {category.children.map((child) => (
              <li key={child.id}>
                <Link
                  href={`/categories/${child.slug}`}
                  className="text-sm text-muted-foreground hover:text-primary"
                >
                  {child.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export default async function CategoriesPage() {
  const categories = await categoriesApi.tree();

  return (
    <section className="container py-12">
      <h1 className="font-display text-3xl font-bold">Danh mục sản phẩm</h1>
      {categories.length === 0 ? (
        <p className="mt-8 text-muted-foreground">Chưa có danh mục nào.</p>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <CategoryCard key={category.id} category={category} />
          ))}
        </div>
      )}
    </section>
  );
}
