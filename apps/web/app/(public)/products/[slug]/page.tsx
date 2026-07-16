import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Star } from 'lucide-react';
import { ProductCard } from '@/components/catalog/product-card';
import { AddToCartButton } from '@/components/cart/add-to-cart-button';
import { WishlistButton } from '@/components/wishlist/wishlist-button';
import { ApiError } from '@/lib/api-client';
import { productsApi } from '@/lib/api/products';
import { formatVnd } from '@/lib/utils';

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function loadProduct(slug: string) {
  try {
    return await productsApi.bySlug(slug);
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 404) return null;
    throw error;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await loadProduct(slug);
  if (!product) return { title: 'Không tìm thấy sản phẩm' };
  return {
    title: product.metaTitle ?? product.name,
    description: product.metaDescription ?? product.shortDescription ?? undefined,
    openGraph: {
      images: product.images[0] ? [product.images[0].url] : undefined,
    },
  };
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const product = await loadProduct(slug);
  if (!product) notFound();

  const primaryImage = product.images[0];

  return (
    <section className="container py-12">
      <nav className="mb-6 text-sm text-muted-foreground" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-primary">
          Trang chủ
        </Link>{' '}
        /{' '}
        <Link href="/products" className="hover:text-primary">
          Sản phẩm
        </Link>{' '}
        / <span className="text-foreground">{product.name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        <div>
          <div className="relative aspect-square overflow-hidden rounded-2xl bg-muted">
            {primaryImage ? (
              <Image
                src={primaryImage.url}
                alt={primaryImage.altText ?? product.name}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
                priority
              />
            ) : (
              <div className="flex h-full items-center justify-center text-6xl" aria-hidden>
                🧸
              </div>
            )}
          </div>
          {product.images.length > 1 && (
            <div className="mt-3 grid grid-cols-5 gap-2">
              {product.images.slice(0, 5).map((image) => (
                <div
                  key={image.id}
                  className="relative aspect-square overflow-hidden rounded-lg bg-muted"
                >
                  <Image
                    src={image.url}
                    alt={image.altText ?? product.name}
                    fill
                    sizes="20vw"
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          {product.brand && (
            <Link
              href={`/products?brand=${product.brand.slug}`}
              className="text-sm font-medium text-primary"
            >
              {product.brand.name}
            </Link>
          )}
          <h1 className="font-display text-2xl font-bold sm:text-3xl">{product.name}</h1>

          {product.reviewCount > 0 && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Star className="h-4 w-4 fill-accent text-accent" aria-hidden />
              {product.avgRating.toFixed(1)} ({product.reviewCount} đánh giá)
            </div>
          )}

          <div className="flex items-baseline gap-3">
            <span className="font-display text-3xl font-bold text-primary">
              {formatVnd(product.price)}
            </span>
            {product.compareAtPrice && (
              <span className="text-lg text-muted-foreground line-through">
                {formatVnd(product.compareAtPrice)}
              </span>
            )}
          </div>

          {product.shortDescription && (
            <p className="text-muted-foreground">{product.shortDescription}</p>
          )}

          <dl className="grid grid-cols-2 gap-3 rounded-2xl bg-muted/50 p-4 text-sm">
            {product.ageMin !== null && (
              <div>
                <dt className="text-muted-foreground">Độ tuổi</dt>
                <dd className="font-medium">
                  {product.ageMin}
                  {product.ageMax ? `–${product.ageMax}` : '+'} tuổi
                </dd>
              </div>
            )}
            {product.material && (
              <div>
                <dt className="text-muted-foreground">Chất liệu</dt>
                <dd className="font-medium">{product.material}</dd>
              </div>
            )}
            {product.origin && (
              <div>
                <dt className="text-muted-foreground">Xuất xứ</dt>
                <dd className="font-medium">{product.origin}</dd>
              </div>
            )}
            <div>
              <dt className="text-muted-foreground">SKU</dt>
              <dd className="font-medium">{product.sku}</dd>
            </div>
          </dl>

          <p className="text-sm font-medium">
            {product.inStock ? '✅ Còn hàng' : '❌ Hết hàng'}
          </p>

          <div className="flex items-center gap-3">
            <AddToCartButton productId={product.id} inStock={product.inStock} />
            <WishlistButton productId={product.id} className="static shadow-none border border-input" />
          </div>
        </div>
      </div>

      {product.description && (
        <div
          className="prose-content mt-12 max-w-none"
          // Description is authored/sanitized server-side by the admin catalog module.
          dangerouslySetInnerHTML={{ __html: product.description }}
        />
      )}

      {product.specifications.length > 0 && (
        <section className="mt-12">
          <h2 className="font-display text-xl font-bold">Thông số kỹ thuật</h2>
          <dl className="mt-4 divide-y divide-border rounded-2xl border border-border">
            {product.specifications.map((spec) => (
              <div key={spec.label} className="flex justify-between gap-4 px-4 py-3 text-sm">
                <dt className="text-muted-foreground">{spec.label}</dt>
                <dd className="font-medium">{spec.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {product.faqs.length > 0 && (
        <section className="mt-12">
          <h2 className="font-display text-xl font-bold">Câu hỏi thường gặp</h2>
          <div className="mt-4 space-y-4">
            {product.faqs.map((faq) => (
              <div key={faq.question} className="rounded-2xl border border-border p-4">
                <p className="font-semibold">{faq.question}</p>
                <p className="mt-1 text-sm text-muted-foreground">{faq.answer}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {product.related.length > 0 && (
        <section className="mt-12">
          <h2 className="font-display text-xl font-bold">Sản phẩm liên quan</h2>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {product.related.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      )}
    </section>
  );
}
