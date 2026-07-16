import type { Metadata } from 'next';
import { CheckoutForm } from '@/components/checkout/checkout-form';

export const metadata: Metadata = {
  title: 'Thanh toán',
  description: 'Hoàn tất đơn hàng của bạn tại DauTayToy Store.',
};

export default function CheckoutPage() {
  return (
    <section className="container py-12">
      <h1 className="font-display text-3xl font-bold">Thanh toán</h1>
      <div className="mt-8">
        <CheckoutForm />
      </div>
    </section>
  );
}
