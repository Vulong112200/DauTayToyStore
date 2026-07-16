import type { Metadata } from 'next';
import { CartView } from './cart-view';

export const metadata: Metadata = {
  title: 'Giỏ hàng',
  description: 'Xem và quản lý giỏ hàng của bạn tại DauTayToy Store.',
};

export default function CartPage() {
  return (
    <section className="container py-12">
      <h1 className="font-display text-3xl font-bold">Giỏ hàng</h1>
      <div className="mt-8">
        <CartView />
      </div>
    </section>
  );
}
