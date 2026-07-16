'use client';

import { FlashSaleForm } from '@/components/admin/flash-sales/flash-sale-form';

export default function NewFlashSalePage() {
  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Thêm flash sale mới</h1>
      <FlashSaleForm />
    </div>
  );
}
