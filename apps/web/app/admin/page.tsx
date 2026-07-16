'use client';

import { useAdminDashboard } from '@/hooks/use-admin-dashboard';
import { ORDER_STATUS_LABELS } from '@/lib/order-status';
import { formatVnd } from '@/lib/utils';

export default function AdminDashboardPage() {
  const { data, isLoading } = useAdminDashboard();

  if (isLoading || !data) {
    return <p className="text-muted-foreground">Đang tải...</p>;
  }

  const stats = [
    { label: 'Tổng sản phẩm', value: data.totalProducts.toLocaleString('vi-VN') },
    { label: 'Tổng đơn hàng', value: data.totalOrders.toLocaleString('vi-VN') },
    { label: 'Doanh thu', value: formatVnd(data.totalRevenue) },
    { label: 'Khách hàng', value: data.totalCustomers.toLocaleString('vi-VN') },
  ];

  return (
    <div className="space-y-8">
      <h1 className="font-display text-2xl font-bold">Tổng quan</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-border bg-card p-6">
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            <p className="mt-2 font-display text-2xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      <div>
        <h2 className="font-display text-lg font-bold">Đơn hàng gần đây</h2>
        {data.recentOrders.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">Chưa có đơn hàng nào.</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="p-4 font-medium">Mã đơn hàng</th>
                  <th className="p-4 font-medium">Khách hàng</th>
                  <th className="p-4 font-medium">Trạng thái</th>
                  <th className="p-4 font-medium">Ngày đặt</th>
                  <th className="p-4 text-right font-medium">Tổng tiền</th>
                </tr>
              </thead>
              <tbody>
                {data.recentOrders.map((order) => (
                  <tr key={order.orderNumber} className="border-b border-border last:border-0">
                    <td className="p-4 font-medium">{order.orderNumber}</td>
                    <td className="p-4">{order.customerName}</td>
                    <td className="p-4">{ORDER_STATUS_LABELS[order.status] ?? order.status}</td>
                    <td className="p-4">
                      {new Date(order.createdAt).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="p-4 text-right font-semibold">{formatVnd(order.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
