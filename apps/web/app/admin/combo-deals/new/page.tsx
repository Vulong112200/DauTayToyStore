'use client';

import { ComboDealForm } from '@/components/admin/combo-deals/combo-deal-form';

export default function NewComboDealPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Thêm combo mới</h1>
      <ComboDealForm />
    </div>
  );
}
