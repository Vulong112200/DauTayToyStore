'use client';

import { useParams } from 'next/navigation';
import { FlashSaleForm } from '@/components/admin/flash-sales/flash-sale-form';
import { useAdminFlashSale } from '@/hooks/use-admin-flash-sales';

export default function EditFlashSalePage() {
  const params = useParams<{ id: string }>();
  const { data: flashSale, isLoading } = useAdminFlashSale(params.id);

  if (isLoading || !flashSale) {
    return <p className="text-muted-foreground">Đang tải...</p>;
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Chỉnh sửa: {flashSale.name}</h1>
      <FlashSaleForm flashSale={flashSale} />
    </div>
  );
}
