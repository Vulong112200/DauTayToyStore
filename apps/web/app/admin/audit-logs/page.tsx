'use client';

import * as React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useAdminAuditLogs } from '@/hooks/use-admin-audit-logs';

export default function AdminAuditLogsPage() {
  const [page, setPage] = React.useState(1);
  const [entityType, setEntityType] = React.useState('');
  const [action, setAction] = React.useState('');
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  const { data, isLoading } = useAdminAuditLogs({
    page,
    pageSize: 20,
    entityType: entityType || undefined,
    action: action || undefined,
  });

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Nhật ký hệ thống</h1>

      <div className="flex flex-wrap gap-3">
        <input
          value={entityType}
          onChange={(event) => {
            setPage(1);
            setEntityType(event.target.value);
          }}
          placeholder="Lọc theo loại đối tượng (vd: Product)"
          aria-label="Lọc theo loại đối tượng"
          className="w-full max-w-xs rounded-xl border border-input bg-background px-4 py-2 text-sm"
        />
        <input
          value={action}
          onChange={(event) => {
            setPage(1);
            setAction(event.target.value);
          }}
          placeholder="Lọc theo hành động (vd: Product.update)"
          aria-label="Lọc theo hành động"
          className="w-full max-w-xs rounded-xl border border-input bg-background px-4 py-2 text-sm"
        />
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Đang tải...</p>
      ) : !data || data.items.length === 0 ? (
        <p className="text-muted-foreground">Không tìm thấy nhật ký nào.</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="p-4" aria-hidden />
                  <th className="p-4 font-medium">Thời gian</th>
                  <th className="p-4 font-medium">Người thực hiện</th>
                  <th className="p-4 font-medium">Hành động</th>
                  <th className="p-4 font-medium">Đối tượng</th>
                  <th className="p-4 font-medium">IP</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((log) => {
                  const isExpanded = expandedId === log.id;
                  return (
                    <React.Fragment key={log.id}>
                      <tr
                        className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/50"
                        onClick={() => setExpandedId(isExpanded ? null : log.id)}
                      >
                        <td className="p-4">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </td>
                        <td className="p-4 text-muted-foreground">
                          {new Date(log.createdAt).toLocaleString('vi-VN')}
                        </td>
                        <td className="p-4">{log.actorEmail ?? 'Hệ thống'}</td>
                        <td className="p-4 font-medium">{log.action}</td>
                        <td className="p-4 text-muted-foreground">
                          {log.entityType}
                          {log.entityId && (
                            <span className="ml-1 text-xs">({log.entityId.slice(0, 8)})</span>
                          )}
                        </td>
                        <td className="p-4 text-muted-foreground">{log.ipAddress ?? '—'}</td>
                      </tr>
                      {isExpanded && (
                        <tr className="border-b border-border last:border-0 bg-muted/30">
                          <td colSpan={6} className="p-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                              <div>
                                <p className="mb-1 text-xs font-semibold text-muted-foreground">
                                  Trước
                                </p>
                                <pre className="overflow-x-auto rounded-lg bg-background p-3 text-xs">
                                  {log.before ? JSON.stringify(log.before, null, 2) : '—'}
                                </pre>
                              </div>
                              <div>
                                <p className="mb-1 text-xs font-semibold text-muted-foreground">
                                  Sau
                                </p>
                                <pre className="overflow-x-auto rounded-lg bg-background p-3 text-xs">
                                  {log.after ? JSON.stringify(log.after, null, 2) : '—'}
                                </pre>
                              </div>
                            </div>
                            <p className="mt-3 text-xs text-muted-foreground">
                              User-Agent: {log.userAgent ?? '—'}
                            </p>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {data.meta.totalPages > 1 && (
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                className="rounded-xl border border-input px-3 py-1.5 text-sm disabled:opacity-50"
                disabled={page <= 1}
                onClick={() => setPage((current) => current - 1)}
              >
                Trước
              </button>
              <span className="text-sm text-muted-foreground">
                Trang {data.meta.page} / {data.meta.totalPages}
              </span>
              <button
                type="button"
                className="rounded-xl border border-input px-3 py-1.5 text-sm disabled:opacity-50"
                disabled={page >= data.meta.totalPages}
                onClick={() => setPage((current) => current + 1)}
              >
                Sau
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
