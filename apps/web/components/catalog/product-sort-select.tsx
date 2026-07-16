'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { ProductSort } from '@repo/contracts';

const OPTIONS: { value: ProductSort; label: string }[] = [
  { value: 'newest', label: 'Mới nhất' },
  { value: 'price_asc', label: 'Giá tăng dần' },
  { value: 'price_desc', label: 'Giá giảm dần' },
  { value: 'rating', label: 'Đánh giá cao nhất' },
];

export function ProductSortSelect({ defaultValue }: { defaultValue: ProductSort }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function onChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('sort', event.target.value);
    params.delete('page');
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <select
      defaultValue={defaultValue}
      onChange={onChange}
      aria-label="Sắp xếp sản phẩm"
      className="rounded-xl border border-input bg-background px-3 py-2 text-sm"
    >
      {OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
