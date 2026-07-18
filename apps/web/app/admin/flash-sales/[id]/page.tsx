'use client';

import { useParams } from 'next/navigation';
import { AdminQueryError } from '@/components/admin/admin-query-error';
import { FlashSaleForm } from '@/components/admin/flash-sales/flash-sale-form';
import { useAdminFlashSale } from '@/hooks/use-admin-flash-sales';

export default function EditFlashSalePage() {
  const params = useParams<{ id: string }>();
  const { data: flashSale, isLoading, isError, error, refetch } = useAdminFlashSale(params.id);

  if (isError) {
    return <AdminQueryError error={error} onRetry={() => refetch()} />;
  }

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
