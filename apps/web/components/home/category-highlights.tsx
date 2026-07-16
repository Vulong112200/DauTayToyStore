import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';

const CATEGORIES = [
  { name: 'Đồ chơi lắp ráp', emoji: '🧱', slug: 'do-choi-lap-rap', bg: 'bg-pastel-blue' },
  { name: 'Búp bê & Thú nhồi bông', emoji: '🧸', slug: 'bup-be-thu-nhoi-bong', bg: 'bg-pastel-pink' },
  { name: 'Đồ chơi giáo dục', emoji: '📚', slug: 'do-choi-giao-duc', bg: 'bg-pastel-mint' },
  { name: 'Xe & Mô hình', emoji: '🚗', slug: 'xe-mo-hinh', bg: 'bg-pastel-yellow' },
  { name: 'Đồ chơi ngoài trời', emoji: '⚽', slug: 'do-choi-ngoai-troi', bg: 'bg-pastel-lavender' },
];

export function CategoryHighlights() {
  return (
    <section className="container py-16">
      <div className="mb-8 flex items-end justify-between">
        <h2 className="font-display text-2xl font-bold sm:text-3xl">Danh mục nổi bật</h2>
        <Link href="/categories" className="text-sm font-medium text-primary hover:underline">
          Xem tất cả
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {CATEGORIES.map((category) => (
          <Link key={category.slug} href={`/categories/${category.slug}`}>
            <Card className="h-full transition-transform hover:-translate-y-1 hover:shadow-md">
              <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
                <div className={`flex h-16 w-16 items-center justify-center rounded-2xl text-3xl ${category.bg}`}>
                  {category.emoji}
                </div>
                <span className="text-sm font-semibold">{category.name}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
