'use client';

import * as React from 'react';
import { Plus } from 'lucide-react';
import { RoleName, type CreateUserInput } from '@repo/contracts';
import { UserCreateForm } from '@/components/admin/users/user-create-form';
import { UserEditForm } from '@/components/admin/users/user-edit-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  useAdminUsers,
  useCreateUser,
  useUpdateUser,
  useUpdateUserRoles,
} from '@/hooks/use-admin-users';
import { useAuthStore } from '@/store/auth-store';

const ROLE_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Tất cả vai trò' },
  { value: RoleName.SUPER_ADMIN, label: 'Super Admin' },
  { value: RoleName.ADMIN, label: 'Admin' },
  { value: RoleName.STAFF, label: 'Nhân viên' },
  { value: RoleName.CUSTOMER, label: 'Khách hàng' },
];

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  STAFF: 'Nhân viên',
  CUSTOMER: 'Khách hàng',
};

export default function AdminUsersPage() {
  const currentUser = useAuthStore((state) => state.user);
  const isSuperAdmin = !!currentUser?.roles.includes(RoleName.SUPER_ADMIN);

  const [page, setPage] = React.useState(1);
  const [q, setQ] = React.useState('');
  const [role, setRole] = React.useState('');
  const [mode, setMode] = React.useState<'idle' | 'create' | string>('idle');

  const { data, isLoading } = useAdminUsers({
    page,
    pageSize: 20,
    q: q || undefined,
    role: (role || undefined) as RoleName | undefined,
  });
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const updateUserRoles = useUpdateUserRoles();

  async function handleCreate(input: CreateUserInput) {
    try {
      await createUser.mutateAsync(input);
      setMode('idle');
    } catch {
      // Error toast is surfaced by the mutation hook.
    }
  }

  async function handleUpdate(
    id: string,
    input: Parameters<typeof updateUser.mutateAsync>[0]['input'],
    roles: RoleName[],
    originalRoles: RoleName[],
  ) {
    try {
      await updateUser.mutateAsync({ id, input });
      const rolesChanged =
        roles.length !== originalRoles.length ||
        roles.some((r) => !originalRoles.includes(r));
      if (rolesChanged) {
        await updateUserRoles.mutateAsync({ id, input: { roles } });
      }
      setMode('idle');
    } catch {
      // Error toast is surfaced by the mutation hook.
    }
  }

  const isSaving = updateUser.isPending || updateUserRoles.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Người dùng</h1>
        {mode === 'idle' && (
          <Button size="sm" onClick={() => setMode('create')}>
            <Plus className="h-4 w-4" /> Thêm người dùng
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Tìm theo tên hoặc email..."
          value={q}
          onChange={(e) => {
            setPage(1);
            setQ(e.target.value);
          }}
          className="max-w-xs"
        />
        <select
          value={role}
          onChange={(e) => {
            setPage(1);
            setRole(e.target.value);
          }}
          className="rounded-xl border border-input bg-background px-3 py-2 text-sm"
        >
          {ROLE_FILTER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {isLoading && <p className="text-muted-foreground">Đang tải...</p>}

      {mode === 'create' && (
        <UserCreateForm
          isSuperAdmin={isSuperAdmin}
          onSubmit={handleCreate}
          onCancel={() => setMode('idle')}
          isSubmitting={createUser.isPending}
        />
      )}

      <div className="space-y-3">
        {data?.items.map((user) =>
          mode === user.id ? (
            <UserEditForm
              key={user.id}
              user={user}
              isSuperAdmin={isSuperAdmin}
              isSelf={user.id === currentUser?.id}
              onSubmit={(input, roles) =>
                handleUpdate(user.id, input, roles, user.roles as RoleName[])
              }
              onCancel={() => setMode('idle')}
              isSubmitting={isSaving}
            />
          ) : (
            <div
              key={user.id}
              className="flex items-center justify-between rounded-2xl border border-border bg-card p-4"
            >
              <div>
                <p className="font-semibold">
                  {user.fullName}
                  {!user.isActive && (
                    <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      Đã khoá
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
                <p className="mt-1 flex gap-1 text-xs">
                  {user.roles.map((r) => (
                    <span
                      key={r}
                      className="rounded-full bg-primary/10 px-2 py-0.5 text-primary"
                    >
                      {ROLE_LABELS[r] ?? r}
                    </span>
                  ))}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMode(user.id)}
              >
                Chỉnh sửa
              </Button>
            </div>
          ),
        )}
        {data?.items.length === 0 && mode === 'idle' && (
          <p className="text-muted-foreground">Không tìm thấy người dùng nào.</p>
        )}
      </div>

      {data && data.meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Trước
          </Button>
          <span className="text-sm text-muted-foreground">
            Trang {data.meta.page}/{data.meta.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= data.meta.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Sau
          </Button>
        </div>
      )}
    </div>
  );
}
