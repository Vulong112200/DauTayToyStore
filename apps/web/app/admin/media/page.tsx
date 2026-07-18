'use client';

import * as React from 'react';
import Image from 'next/image';
import { Copy, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAdminMedia, useDeleteMedia, useUploadMedia } from '@/hooks/use-admin-media';
import { useCanManageContent } from '@/hooks/use-can-manage';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AdminMediaPage() {
  const [page, setPage] = React.useState(1);
  const { data, isLoading } = useAdminMedia({ page, pageSize: 24 });
  const uploadMedia = useUploadMedia();
  const deleteMedia = useDeleteMedia();
  const canManage = useCanManageContent();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  async function handleFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      await uploadMedia.mutateAsync(file);
    } catch {
      // Success/error toast is surfaced by the mutation hook.
    }
  }

  async function handleCopyUrl(url: string) {
    await navigator.clipboard.writeText(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Thư viện media</h1>
        {canManage && (
          <>
            <Button size="sm" disabled={uploadMedia.isPending} onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4" />
              {uploadMedia.isPending ? 'Đang tải lên...' : 'Tải tệp lên'}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*,application/pdf"
              className="hidden"
              onChange={handleFileSelected}
            />
          </>
        )}
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Đang tải...</p>
      ) : !data || data.items.length === 0 ? (
        <p className="text-muted-foreground">Thư viện chưa có tệp nào.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {data.items.map((asset) => (
              <div
                key={asset.id}
                className="group relative overflow-hidden rounded-2xl border border-border bg-card"
              >
                <div className="relative aspect-square bg-muted">
                  {asset.type === 'IMAGE' ? (
                    <Image src={asset.url} alt={asset.altText ?? ''} fill sizes="200px" className="object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-3xl" aria-hidden>
                      {asset.type === 'VIDEO' ? '🎬' : '📄'}
                    </div>
                  )}
                </div>
                <div className="p-2">
                  <p className="truncate text-xs text-muted-foreground">{formatBytes(asset.sizeBytes)}</p>
                </div>
                <div className="absolute inset-x-0 top-0 flex justify-end gap-1 bg-gradient-to-b from-black/50 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button
                    variant="secondary"
                    size="icon"
                    aria-label="Sao chép URL"
                    onClick={() => handleCopyUrl(asset.url)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  {canManage && (
                    <Button
                      variant="secondary"
                      size="icon"
                      aria-label="Xoá tệp"
                      disabled={deleteMedia.isPending}
                      onClick={() => {
                        if (window.confirm('Xoá tệp này khỏi thư viện?')) {
                          deleteMedia.mutate(asset.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {data.meta.totalPages > 1 && (
            <div className="flex items-center justify-center gap-3">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((current) => current - 1)}
              >
                Trước
              </Button>
              <span className="text-sm text-muted-foreground">
                Trang {data.meta.page} / {data.meta.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= data.meta.totalPages}
                onClick={() => setPage((current) => current + 1)}
              >
                Sau
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
