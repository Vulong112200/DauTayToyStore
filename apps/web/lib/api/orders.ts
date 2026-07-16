import type { CheckoutInput, OrderListItem, OrderTrackQuery, OrderView } from '@repo/contracts';
import { apiFetch } from '../api-client';
import { cartIdentityHeaders } from '../cart-headers';

export const ordersApi = {
  checkout: (input: CheckoutInput) =>
    apiFetch<OrderView>('/orders', { body: input, headers: cartIdentityHeaders() }),

  track: (query: OrderTrackQuery) =>
    apiFetch<OrderView>(
      `/orders/track?orderNumber=${encodeURIComponent(query.orderNumber)}&email=${encodeURIComponent(query.email)}`,
    ),

  listMine: () => apiFetch<OrderListItem[]>('/orders', { auth: true }),

  getMine: (orderNumber: string) =>
    apiFetch<OrderView>(`/orders/${encodeURIComponent(orderNumber)}`, { auth: true }),
};
