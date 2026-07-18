'use client';

import * as React from 'react';
import Image from 'next/image';
import { ImagePlus, Upload, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAdminMedia, useUploadMedia } from '@/hooks/use-admin-media';

/**
 * Text input for the URL (so pasting an external image URL still works, same as before) plus
 * a "Chọn từ thư viện" button opening a modal over the existing /admin/media library — pick an
 * existing asset or upload a new one without leaving the form. Deliberately does not replace the
 * text input: every image field across the admin (product/category/brand/blog/banner) is a plain
 * `z.string().url()`, and keeping the text input means this stays a pure additive convenience.
 */
export function MediaPicker({
  value,
  onChange,
  placeholder = 'URL hình ảnh',
}: {
  value: string | undefined;
  onChange: (url: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="flex items-center gap-2">
      <Input
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="flex-1"
      />
      {value ? (
        <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
          {/* Plain <img>, not next/image: this URL can be anything an admin pastes by hand,
              not just R2 asset URLs, so it can't rely on next.config's remotePatterns whitelist. */}
          <img src={value} alt="" className="h-full w-full object-cover" />
        </div>
      ) : null}
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Chọn ảnh từ thư viện"
        onClick={() => setOpen(true)}
      >
        <ImagePlus className="h-4 w-4" />
      </Button>
      <MediaPickerDialog
        open={open}
        onOpenChange={setOpen}
        onSelect={(url) => {
          onChange(url);
          setOpen(false);
        }}
      />
    </div>
  );
}

function MediaPickerDialog({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (url: string) => void;
}) {
  const [page, setPage] = React.useState(1);
  const { data, isLoading } = useAdminMedia({ page, pageSize: 24, type: 'IMAGE' });
  const uploadMedia = useUploadMedia();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  async function handleFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      const asset = await uploadMedia.mutateAsync(file);
      onSelect(asset.url);
    } catch {
      // Success/error toast is surfaced by the mutation hook.
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Chọn ảnh từ thư viện</DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Bấm vào một ảnh để chọn, hoặc tải ảnh mới lên.
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={uploadMedia.isPending}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4" />
            {uploadMedia.isPending ? 'Đang tải lên...' : 'Tải ảnh mới'}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelected}
          />
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Đang tải...</p>
          ) : !data || data.items.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Thư viện chưa có ảnh nào.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
              {data.items.map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  className="group relative aspect-square overflow-hidden rounded-xl border border-border bg-muted transition-colors hover:border-primary"
                  onClick={() => onSelect(asset.url)}
                >
                  <Image src={asset.url} alt="" fill sizes="150px" className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {data && data.meta.totalPages > 1 && (
          <div className="flex items-center justify-center gap-3">
            <Button
              type="button"
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
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= data.meta.totalPages}
              onClick={() => setPage((current) => current + 1)}
            >
              Sau
            </Button>
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" /> Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
