import type { Metadata } from 'next';
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
      <OrderConfirmationView orderNumber={orderNumber} />
    </section>
  );
}
