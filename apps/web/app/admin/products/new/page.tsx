'use client';

import { ProductForm } from '@/components/admin/products/product-form';

export default function NewProductPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Thêm sản phẩm mới</h1>
      <ProductForm />
    </div>
  );
}
