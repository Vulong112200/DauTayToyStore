import type { Metadata } from 'next';
import { Suspense } from 'react';
import { OrderConfirmationView } from './confirmation-view';

export const metadata: Metadata = {
  title: 'Đặt hàng thành công',
  robots: { index: false, follow: false },
};

export default async function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;

  return (
    <section className="container py-12">
      <Suspense fallback={<p className="text-muted-foreground">Đang tải...</p>}>
        <OrderConfirmationView orderNumber={orderNumber} />
      </Suspense>
    </section>
  );
}
