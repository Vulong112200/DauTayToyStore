import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

const currencyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});

export function formatVnd(amountInVnd: number): string {
  return currencyFormatter.format(amountInVnd);
}

/**
 * Parse a `?page=` query param into a safe 1-based page number. Guards against a
 * hand-edited URL passing a negative value (`-5` is truthy so a bare `|| 1` lets it
 * through), a decimal, or non-numeric junk — all of which produce odd API requests.
 */
export function parsePageParam(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Math.trunc(Number(raw));
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : 1;
}
