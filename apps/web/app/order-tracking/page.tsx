import type { Metadata } from 'next';
import { Suspense } from 'react';
import { OrderTrackingForm } from '@/components/orders/order-tracking-form';

export const metadata: Metadata = {
  title: 'Tra cứu đơn hàng',
  description: 'Tra cứu trạng thái đơn hàng của bạn tại DauTayToy Store.',
};

export default function OrderTrackingPage() {
  return (
    <section className="container py-12">
      <h1 className="text-center font-display text-3xl font-bold">Tra cứu đơn hàng</h1>
      <p className="mx-auto mt-2 max-w-md text-center text-muted-foreground">
        Nhập mã đơn hàng và email đã dùng khi đặt hàng để xem trạng thái.
      </p>
      <div className="mt-8">
        <Suspense fallback={<p className="text-center text-muted-foreground">Đang tải...</p>}>
          <OrderTrackingForm />
        </Suspense>
      </div>
    </section>
  );
}
