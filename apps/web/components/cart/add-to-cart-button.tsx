'use client';

import * as React from 'react';
import { Minus, Plus, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAddToCart } from '@/hooks/use-cart';
import { ApiError } from '@/lib/api-client';
import { toastError } from '@/lib/toast';

export function AddToCartButton({
  productId,
  inStock,
}: {
  productId: string;
  inStock: boolean;
}) {
  const [quantity, setQuantity] = React.useState(1);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);
  const addToCart = useAddToCart();
  const successTimer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  React.useEffect(() => () => clearTimeout(successTimer.current), []);

  async function handleAdd() {
    setError(null);
    // Show success immediately (the header badge also bumps optimistically) so
    // the click feels instant; roll it back if the request actually fails.
    setSuccess(true);
    clearTimeout(successTimer.current);
    try {
      await addToCart.mutateAsync({ productId, quantity });
      // Auto-clear so the confirmation doesn't linger forever (and doesn't stay showing
      // after the user changes the quantity, implying the new amount was already added).
      successTimer.current = setTimeout(() => setSuccess(false), 2500);
    } catch (err) {
      setSuccess(false);
      setError(err instanceof ApiError ? err.message : 'Không thể thêm vào giỏ hàng');
      toastError(err, 'Không thể thêm vào giỏ hàng');
    }
  }

  if (!inStock) {
    return (
      <Button size="lg" disabled className="w-full sm:w-auto">
        Hết hàng
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <div className="flex items-center rounded-xl border border-input">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="p-2"
            aria-label="Giảm số lượng"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-10 text-center text-sm font-medium">{quantity}</span>
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.min(99, q + 1))}
            className="p-2"
            aria-label="Tăng số lượng"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <Button
          size="lg"
          onClick={handleAdd}
          disabled={addToCart.isPending}
          className="flex-1 sm:flex-none"
        >
          <ShoppingCart className="h-4 w-4" />
          {addToCart.isPending ? 'Đang thêm...' : 'Thêm vào giỏ'}
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {success && <p className="text-sm text-green-600 dark:text-green-400">Đã thêm vào giỏ hàng!</p>}
    </div>
  );
}
