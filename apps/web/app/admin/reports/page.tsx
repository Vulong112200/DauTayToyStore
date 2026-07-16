'use client';

import {
  useOrderStatusBreakdownReport,
  useRevenueReport,
  useTopProductsReport,
} from '@/hooks/use-admin-reports';
import { ORDER_STATUS_LABELS } from '@/lib/order-status';
import { formatVnd } from '@/lib/utils';

export default function AdminReportsPage() {
  const { data: revenue, isLoading: isRevenueLoading } = useRevenueReport({ groupBy: 'day' });
  const { data: topProducts, isLoading: isTopProductsLoading } = useTopProductsReport();
  const { data: statusBreakdown, isLoading: isStatusLoading } = useOrderStatusBreakdownReport();

  const totalRevenue = revenue?.reduce((sum, point) => sum + point.revenue, 0) ?? 0;
  const totalOrders = revenue?.reduce((sum, point) => sum + point.orderCount, 0) ?? 0;

  return (
    <div className="space-y-8">
      <h1 className="font-display text-2xl font-bold">Báo cáo</h1>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">Doanh thu 30 ngày qua</p>
          <p className="mt-2 font-display text-2xl font-bold">{formatVnd(totalRevenue)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">Số đơn hàng 30 ngày qua</p>
          <p className="mt-2 font-display text-2xl font-bold">
            {totalOrders.toLocaleString('vi-VN')}
          </p>
        </div>
      </div>

      <section>
        <h2 className="font-display text-lg font-bold">Doanh thu theo ngày</h2>
        {isRevenueLoading ? (
          <p className="mt-4 text-sm text-muted-foreground">Đang tải...</p>
        ) : !revenue || revenue.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">Chưa có dữ liệu doanh thu.</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="p-4 font-medium">Ngày</th>
                  <th className="p-4 font-medium">Số đơn hàng</th>
                  <th className="p-4 text-right font-medium">Doanh thu</th>
                </tr>
              </thead>
              <tbody>
                {revenue.map((point) => (
                  <tr key={point.bucket} className="border-b border-border last:border-0">
                    <td className="p-4">{point.bucket}</td>
                    <td className="p-4">{point.orderCount}</td>
                    <td className="p-4 text-right font-semibold">{formatVnd(point.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="font-display text-lg font-bold">Sản phẩm bán chạy nhất</h2>
          {isTopProductsLoading ? (
            <p className="mt-4 text-sm text-muted-foreground">Đang tải...</p>
          ) : !topProducts || topProducts.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">Chưa có dữ liệu.</p>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="p-4 font-medium">Sản phẩm</th>
                    <th className="p-4 font-medium">Đã bán</th>
                    <th className="p-4 text-right font-medium">Doanh thu</th>
                  </tr>
                </thead>
                <tbody>
                  {topProducts.map((product) => (
                    <tr key={product.productId} className="border-b border-border last:border-0">
                      <td className="p-4">{product.productName}</td>
                      <td className="p-4">{product.quantitySold}</td>
                      <td className="p-4 text-right font-semibold">
                        {formatVnd(product.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section>
          <h2 className="font-display text-lg font-bold">Tỉ lệ đơn hàng theo trạng thái</h2>
          {isStatusLoading ? (
            <p className="mt-4 text-sm text-muted-foreground">Đang tải...</p>
          ) : !statusBreakdown || statusBreakdown.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">Chưa có dữ liệu.</p>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="p-4 font-medium">Trạng thái</th>
                    <th className="p-4 text-right font-medium">Số lượng</th>
                  </tr>
                </thead>
                <tbody>
                  {statusBreakdown.map((item) => (
                    <tr key={item.status} className="border-b border-border last:border-0">
                      <td className="p-4">{ORDER_STATUS_LABELS[item.status] ?? item.status}</td>
                      <td className="p-4 text-right font-semibold">{item.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
