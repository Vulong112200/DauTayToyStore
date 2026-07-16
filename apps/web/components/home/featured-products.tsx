import Image from 'next/image';
import Link from 'next/link';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { formatVnd } from '@/lib/utils';

const FEATURED_PRODUCTS = [
  {
    slug: 'lego-city-xe-cuu-hoa',
    name: 'LEGO City - Xe cứu hỏa',
    price: 890000,
    compareAtPrice: 990000,
    rating: 4.8,
    image: 'https://placehold.co/400x400/FFD6E8/333333?text=LEGO+City',
  },
  {
    slug: 'gau-bong-teddy',
    name: 'Gấu bông Teddy cao cấp',
    price: 320000,
    compareAtPrice: null,
    rating: 4.9,
    image: 'https://placehold.co/400x400/D6EFFF/333333?text=Teddy+Bear',
  },
  {
    slug: 'bo-xep-hinh-go',
    name: 'Bộ xếp hình gỗ thông minh',
    price: 250000,
    compareAtPrice: 300000,
    rating: 4.7,
    image: 'https://placehold.co/400x400/FFF3C4/333333?text=Wooden+Blocks',
  },
  {
    slug: 'xe-dien-dieu-khien',
    name: 'Xe điều khiển từ xa',
    price: 590000,
    compareAtPrice: 690000,
    rating: 4.6,
    image: 'https://placehold.co/400x400/E3D9FF/333333?text=RC+Car',
  },
];

export function FeaturedProducts() {
  return (
    <section className="container py-16">
      <div className="mb-8 flex items-end justify-between">
        <h2 className="font-display text-2xl font-bold sm:text-3xl">Sản phẩm nổi bật</h2>
        <Link href="/products" className="text-sm font-medium text-primary hover:underline">
          Xem tất cả
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURED_PRODUCTS.map((product) => (
          <Card key={product.slug} className="flex flex-col overflow-hidden">
            <Link href={`/products/${product.slug}`} className="relative block aspect-square">
              <Image
                src={product.image}
                alt={product.name}
                fill
                sizes="(max-width: 768px) 50vw, 25vw"
                className="object-cover"
              />
            </Link>
            <CardContent className="flex flex-1 flex-col gap-2 p-4">
              <Link
                href={`/products/${product.slug}`}
                className="line-clamp-2 text-sm font-semibold hover:text-primary"
              >
                {product.name}
              </Link>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Star className="h-3.5 w-3.5 fill-accent text-accent" />
                {product.rating}
              </div>
              <div className="mt-auto flex items-baseline gap-2">
                <span className="font-display text-base font-bold text-primary">
                  {formatVnd(product.price)}
                </span>
                {product.compareAtPrice && (
                  <span className="text-xs text-muted-foreground line-through">
                    {formatVnd(product.compareAtPrice)}
                  </span>
                )}
              </div>
            </CardContent>
            <CardFooter className="p-4 pt-0">
              <Button size="sm" className="w-full">
                Thêm vào giỏ
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </section>
  );
}
