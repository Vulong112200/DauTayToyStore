import type { PublicFlashSale } from '@repo/contracts';
import { apiFetch } from '../api-client';

export const flashSalesApi = {
  // Short revalidate window: flash sales are time-sensitive (they start/end and
  // sell out), so we don't want the list stale for long — but a little caching
  // still shields the API from every visit hitting it.
  active: () => apiFetch<PublicFlashSale[]>('/flash-sales', { revalidateSeconds: 30 }),
};
