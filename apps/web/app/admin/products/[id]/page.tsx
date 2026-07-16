'use client';

import { useParams } from 'next/navigation';
import { ProductForm } from '@/components/admin/products/product-form';
import { useAdminProduct } from '@/hooks/use-admin-products';

export default function EditProductPage() {
  const params = useParams<{ id: string }>();
  const { data: product, isLoading } = useAdminProduct(params.id);

  if (isLoading || !product) {
    return <p className="text-muted-foreground">Đang tải...</p>;
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Chỉnh sửa: {product.name}</h1>
      <ProductForm product={product} />
    </div>
  );
}
