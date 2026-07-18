import type { QueryClient } from '@tanstack/react-query';
import { toastError, toastSuccess } from '@/lib/toast';

/**
 * Shared success/error callbacks for admin delete mutations.
 *
 * Admin list-page deletes are fire-and-forget (`mutate(id)` with no local
 * handling), so a failure — including a STAFF 403 the backend enforces but the
 * UI doesn't pre-hide — used to be a silent no-op. These callbacks give every
 * delete a visible toast on both outcomes and keep the list refresh on success.
 */
export function deleteMutationCallbacks(
  queryClient: QueryClient,
  invalidateKey: readonly unknown[],
  successMessage: string,
  errorMessage: string,
) {
  return {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invalidateKey });
      toastSuccess(successMessage);
    },
    onError: (error: unknown) => toastError(error, errorMessage),
  };
}
