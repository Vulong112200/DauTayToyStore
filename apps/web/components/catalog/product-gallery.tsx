'use client';

import * as React from 'react';
import Image from 'next/image';
import type { ProductImage } from '@repo/contracts';
import { cn } from '@/lib/utils';

/**
 * Product image gallery: a large main frame plus clickable thumbnails that swap it. Client
 * component because the selection is interactive — the server-rendered detail page only ever
 * showed images[0] and rendered the thumbnails as inert <div>s (a broken gallery affordance).
 */
export function ProductGallery({
  images,
  productName,
}: {
  images: ProductImage[];
  productName: string;
}) {
  const [activeIndex, setActiveIndex] = React.useState(0);
  const active = images[activeIndex] ?? images[0];

  return (
    <div>
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-muted">
        {active ? (
          <Image
            src={active.url}
            alt={active.altText ?? productName}
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
      {images.length > 1 && (
        <div className="mt-3 grid grid-cols-5 gap-2">
          {images.slice(0, 5).map((image, index) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={`Xem ảnh ${index + 1}`}
              aria-current={index === activeIndex}
              className={cn(
                'relative aspect-square overflow-hidden rounded-lg bg-muted ring-offset-2 transition',
                index === activeIndex
                  ? 'ring-2 ring-primary'
                  : 'ring-1 ring-transparent hover:ring-border',
              )}
            >
              <Image
                src={image.url}
                alt={image.altText ?? productName}
                fill
                sizes="20vw"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
