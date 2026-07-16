'use client';

import { useParams } from 'next/navigation';
import { ComboDealForm } from '@/components/admin/combo-deals/combo-deal-form';
import { useAdminComboDeal } from '@/hooks/use-admin-combo-deals';

export default function EditComboDealPage() {
  const params = useParams<{ id: string }>();
  const { data: comboDeal, isLoading } = useAdminComboDeal(params.id);

  if (isLoading || !comboDeal) {
    return <p className="text-muted-foreground">Đang tải...</p>;
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Chỉnh sửa: {comboDeal.name}</h1>
      <ComboDealForm comboDeal={comboDeal} />
    </div>
  );
}
