'use client';

import * as React from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import type { FreeShippingRuleInput } from '@repo/contracts';
import { FreeShippingRuleForm } from '@/components/admin/free-shipping-rules/free-shipping-rule-form';
import { Button } from '@/components/ui/button';
import {
  useAdminFreeShippingRules,
  useCreateFreeShippingRule,
  useDeleteFreeShippingRule,
  useUpdateFreeShippingRule,
} from '@/hooks/use-admin-free-shipping-rules';
import { useCanManageContent } from '@/hooks/use-can-manage';
import { ApiError } from '@/lib/api-client';
import { formatVnd } from '@/lib/utils';

export default function AdminFreeShippingRulesPage() {
  const { data: rules, isLoading } = useAdminFreeShippingRules();
  const createRule = useCreateFreeShippingRule();
  const updateRule = useUpdateFreeShippingRule();
  const deleteRule = useDeleteFreeShippingRule();
  const canManage = useCanManageContent();

  const [mode, setMode] = React.useState<'idle' | 'create' | string>('idle');
  const [error, setError] = React.useState<string | null>(null);

  async function handleCreate(input: FreeShippingRuleInput) {
    setError(null);
    try {
      await createRule.mutateAsync(input);
      setMode('idle');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể lưu quy tắc');
    }
  }

  async function handleUpdate(id: string, input: FreeShippingRuleInput) {
    setError(null);
    try {
      await updateRule.mutateAsync({ id, input });
      setMode('idle');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể lưu quy tắc');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Miễn phí vận chuyển</h1>
        {mode === 'idle' && canManage && (
          <Button size="sm" onClick={() => setMode('create')}>
            <Plus className="h-4 w-4" /> Thêm quy tắc
          </Button>
        )}
      </div>

      {isLoading && <p className="text-muted-foreground">Đang tải...</p>}

      {mode === 'create' && (
        <FreeShippingRuleForm
          onSubmit={handleCreate}
          onCancel={() => setMode('idle')}
          isSubmitting={createRule.isPending}
          error={error}
        />
      )}

      <div className="space-y-3">
        {rules?.map((rule) =>
          mode === rule.id ? (
            <FreeShippingRuleForm
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
                  Từ {formatVnd(rule.minOrderAmount)}
                  {rule.applicableProvinces
                    ? ` · ${rule.applicableProvinces.join(', ')}`
                    : ' · Toàn quốc'}
                </p>
              </div>
              {canManage && (
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Sửa quy tắc"
                    onClick={() => setMode(rule.id)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Xoá quy tắc"
                    disabled={deleteRule.isPending}
                    onClick={() => {
                      if (window.confirm(`Xoá quy tắc "${rule.name}"?`)) {
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
          <p className="text-muted-foreground">Chưa có quy tắc nào.</p>
        )}
      </div>
    </div>
  );
}
