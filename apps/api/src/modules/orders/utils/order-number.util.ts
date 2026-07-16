import { customAlphabet } from 'nanoid';

const generateSuffix = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 8);

/** Human-friendly order number, e.g. "DTT7K2F9QX3A". Unique-enough for display/tracking. */
export function generateOrderNumber(): string {
  return `DTT${generateSuffix()}`;
}
