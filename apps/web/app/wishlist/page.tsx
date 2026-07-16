import type { Metadata } from 'next';
import { WishlistView } from './wishlist-view';

export const metadata: Metadata = {
  title: 'Danh sách yêu thích',
  description: 'Sản phẩm bạn đã lưu tại DauTayToy Store.',
};

export default function WishlistPage() {
  return (
    <section className="container py-12">
      <h1 className="font-display text-3xl font-bold">Danh sách yêu thích</h1>
      <div className="mt-8">
        <WishlistView />
      </div>
    </section>
  );
}
