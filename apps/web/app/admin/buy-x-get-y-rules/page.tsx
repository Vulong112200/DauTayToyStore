'use client';

import * as React from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import type { BuyXGetYRuleInput } from '@repo/contracts';
import { BuyXGetYRuleForm } from '@/components/admin/buy-x-get-y-rules/buy-x-get-y-rule-form';
import { Button } from '@/components/ui/button';
import {
  useAdminBuyXGetYRules,
  useCreateBuyXGetYRule,
  useDeleteBuyXGetYRule,
  useUpdateBuyXGetYRule,
} from '@/hooks/use-admin-buy-x-get-y-rules';
import { useCanManageContent } from '@/hooks/use-can-manage';
import { ApiError } from '@/lib/api-client';

export default function AdminBuyXGetYRulesPage() {
  const { data: rules, isLoading } = useAdminBuyXGetYRules();
  const createRule = useCreateBuyXGetYRule();
  const updateRule = useUpdateBuyXGetYRule();
  const deleteRule = useDeleteBuyXGetYRule();
  const canManage = useCanManageContent();

  const [mode, setMode] = React.useState<'idle' | 'create' | string>('idle');
  const [error, setError] = React.useState<string | null>(null);

  async function handleCreate(input: BuyXGetYRuleInput) {
    setError(null);
    try {
      await createRule.mutateAsync(input);
      setMode('idle');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể lưu chương trình');
    }
  }

  async function handleUpdate(id: string, input: BuyXGetYRuleInput) {
    setError(null);
    try {
      await updateRule.mutateAsync({ id, input });
      setMode('idle');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể lưu chương trình');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Mua X tặng Y</h1>
        {mode === 'idle' && canManage && (
          <Button size="sm" onClick={() => setMode('create')}>
            <Plus className="h-4 w-4" /> Thêm chương trình
          </Button>
        )}
      </div>

      {isLoading && <p className="text-muted-foreground">Đang tải...</p>}

      {mode === 'create' && (
        <BuyXGetYRuleForm
          onSubmit={handleCreate}
          onCancel={() => setMode('idle')}
          isSubmitting={createRule.isPending}
          error={error}
        />
      )}

      <div className="space-y-3">
        {rules?.map((rule) =>
          mode === rule.id ? (
            <BuyXGetYRuleForm
              key={rule.id}
              initialValue={rule}
              onSubmit={(input) => handleUpdate(rule.id, input)}
              onCancel={() => setMode('idle')}
              isSubmitting={updateRule.isPending}
              error={error}
            />
          ) : (
            <div
              key={rule.id}
              className="flex items-center justify-between rounded-2xl border border-border bg-card p-4"
            >
              <div>
                <p className="font-semibold">
                  {rule.name}
                  {!rule.isActive && (
                    <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      Tắt
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  Mua {rule.buyQuantity} {rule.buyProductName} → Tặng {rule.getQuantity}{' '}
                  {rule.getProductName} (giảm {rule.discountPercent}%)
                </p>
              </div>
              {canManage && (
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Sửa chương trình"
                    onClick={() => setMode(rule.id)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Xoá chương trình"
                    disabled={deleteRule.isPending}
                    onClick={() => {
                      if (window.confirm(`Xoá chương trình "${rule.name}"?`)) {
                        deleteRule.mutate(rule.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          ),
        )}
        {rules?.length === 0 && mode === 'idle' && (
          <p className="text-muted-foreground">Chưa có chương trình nào.</p>
        )}
      </div>
    </div>
  );
}
