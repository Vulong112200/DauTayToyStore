'use client';

import * as React from 'react';

function pad(value: number): string {
  return value.toString().padStart(2, '0');
}

function partsUntil(endMs: number): { d: number; h: number; m: number; s: number } | null {
  const diff = endMs - Date.now();
  if (diff <= 0) return null;
  const totalSeconds = Math.floor(diff / 1000);
  return {
    d: Math.floor(totalSeconds / 86400),
    h: Math.floor((totalSeconds % 86400) / 3600),
    m: Math.floor((totalSeconds % 3600) / 60),
    s: totalSeconds % 60,
  };
}

/**
 * Live "kết thúc sau" countdown to a flash sale's endsAt. Renders nothing on the
 * server / first paint (time is client-only) to avoid a hydration mismatch, then
 * ticks every second. `onExpire` lets the parent hide/refresh when it hits zero.
 */
export function FlashSaleCountdown({ endsAt }: { endsAt: string }) {
  const endMs = React.useMemo(() => new Date(endsAt).getTime(), [endsAt]);
  const [parts, setParts] = React.useState<ReturnType<typeof partsUntil>>(null);

  React.useEffect(() => {
    setParts(partsUntil(endMs));
    const timer = setInterval(() => setParts(partsUntil(endMs)), 1000);
    return () => clearInterval(timer);
  }, [endMs]);

  if (!parts) {
    return (
      <span className="text-sm font-semibold text-muted-foreground" suppressHydrationWarning>
        Sắp kết thúc
      </span>
    );
  }

  const boxes: Array<[string, string]> = [
    ...(parts.d > 0 ? ([[pad(parts.d), 'ngày']] as Array<[string, string]>) : []),
    [pad(parts.h), 'giờ'],
    [pad(parts.m), 'phút'],
    [pad(parts.s), 'giây'],
  ];

  return (
    <div className="flex items-center gap-1.5" role="timer" aria-label="Thời gian còn lại">
      {boxes.map(([value, label], index) => (
        <span
          key={label}
          className="flex min-w-[2.5rem] flex-col items-center rounded-lg bg-primary px-2 py-1 text-primary-foreground"
          style={{ animationDelay: `${index * 40}ms` }}
        >
          <span className="font-display text-base font-bold leading-none tabular-nums">{value}</span>
          <span className="text-[10px] uppercase opacity-80">{label}</span>
        </span>
      ))}
    </div>
  );
}
