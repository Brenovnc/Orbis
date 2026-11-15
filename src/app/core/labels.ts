// Interface texts live in core/i18n. This file only formats the clock.

/** m:ss, or h:mm:ss from one hour on. Rounds up for countdowns, down for count-ups. */
export function formatClock(ms: number, mode: 'up' | 'down'): string {
  const seconds = Math.max(0, mode === 'down' ? Math.ceil(ms / 1000) : Math.floor(ms / 1000));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = String(seconds % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}
