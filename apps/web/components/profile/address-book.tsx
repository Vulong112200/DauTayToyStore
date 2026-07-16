'use client';

import * as React from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import type { AddressInput } from '@repo/contracts';
import { Button } from '@/components/ui/button';
import {
  useAddresses,
  useCreateAddress,
  useDeleteAddress,
  useUpdateAddress,
} from '@/hooks/use-addresses';
import { ApiError } from '@/lib/api-client';
import { AddressForm } from './address-form';

export function AddressBook() {
  const { data: addresses, isLoading } = useAddresses(true);
  const createAddress = useCreateAddress();
  const updateAddress = useUpdateAddress();
  const deleteAddress = useDeleteAddress();

  const [mode, setMode] = React.useState<'idle' | 'create' | string>('idle');
  const [error, setError] = React.useState<string | null>(null);

  async function handleCreate(input: AddressInput) {
    setError(null);
    try {
      await createAddress.mutateAsync(input);
      setMode('idle');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể lưu địa chỉ');
    }
  }

  async function handleUpdate(id: string, input: AddressInput) {
    setError(null);
    try {
      await updateAddress.mutateAsync({ id, input });
      setMode('idle');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể lưu địa chỉ');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold">Địa chỉ đã lưu</h2>
        {mode === 'idle' && (
          <Button size="sm" onClick={() => setMode('create')}>
            Thêm địa chỉ
          </Button>
        )}
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Đang tải...</p>}

      {mode === 'create' && (
        <AddressForm
          onSubmit={handleCreate}
          onCancel={() => setMode('idle')}
          isSubmitting={createAddress.isPending}
          error={error}
        />
      )}

      <div className="space-y-3">
        {addresses?.map((address) =>
          mode === address.id ? (
            <AddressForm
              key={address.id}
              initialValue={address}
              onSubmit={(input) => handleUpdate(address.id, input)}
              onCancel={() => setMode('idle')}
              isSubmitting={updateAddress.isPending}
              error={error}
            />
          ) : (
            <div key={address.id} className="rounded-2xl border border-border p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="text-sm">
                  <p className="font-semibold">
                    {address.recipient} — {address.phone}
                    {address.isDefault && (
                      <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        Mặc định
                      </span>
                    )}
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    {[address.line1, address.ward, address.district, address.province]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Sửa địa chỉ"
                    onClick={() => setMode(address.id)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Xoá địa chỉ"
                    disabled={deleteAddress.isPending}
                    onClick={() => deleteAddress.mutate(address.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ),
        )}
        {addresses?.length === 0 && mode === 'idle' && (
          <p className="text-sm text-muted-foreground">Bạn chưa lưu địa chỉ nào.</p>
        )}
      </div>
    </div>
  );
}
