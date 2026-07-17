import Image from 'next/image';
import { LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';

const PASTEL_BG = ['bg-pastel-blue', 'bg-pastel-pink', 'bg-pastel-mint', 'bg-pastel-yellow', 'bg-pastel-lavender'];

export function CategoryIcon({
  name,
  imageUrl,
  index = 0,
  size = 'md',
  className,
}: {
  name: string;
  imageUrl: string | null;
  index?: number;
  size?: 'sm' | 'md';
  className?: string;
}) {
  return (
    <div
      className={cn(
        'relative flex shrink-0 items-center justify-center overflow-hidden rounded-2xl',
        size === 'sm' ? 'h-10 w-10' : 'h-16 w-16',
        PASTEL_BG[index % PASTEL_BG.length],
        className,
      )}
    >
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={name}
          fill
          sizes={size === 'sm' ? '40px' : '64px'}
          className="object-cover"
        />
      ) : (
        <LayoutGrid className={cn(size === 'sm' ? 'h-5 w-5' : 'h-7 w-7', 'text-foreground/60')} aria-hidden />
      )}
    </div>
  );
}
