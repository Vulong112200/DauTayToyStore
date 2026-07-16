const UNIT_TO_MS: Record<string, number> = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
};

/** Parses durations like "15m", "30d", "12h" into milliseconds. */
export function parseDurationToMs(duration: string): number {
  const match = /^(\d+)(s|m|h|d)$/.exec(duration.trim());
  if (!match) {
    throw new Error(`Invalid duration format: ${duration}`);
  }
  const amount = match[1] as string;
  const unit = match[2] as string;
  const unitMs = UNIT_TO_MS[unit];
  if (unitMs === undefined) {
    throw new Error(`Unknown duration unit: ${unit}`);
  }
  return Number(amount) * unitMs;
}
