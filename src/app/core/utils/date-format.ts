const relativeTime = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });

const fullDate = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

const longDate = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' });

const units: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 60 * 60 * 24 * 365],
  ['month', 60 * 60 * 24 * 30],
  ['week', 60 * 60 * 24 * 7],
  ['day', 60 * 60 * 24],
  ['hour', 60 * 60],
  ['minute', 60],
];

/** Relative to now, e.g. "há 2 dias", "ontem" or "agora mesmo". */
export function formatRelative(date: Date): string {
  const seconds = Math.round((date.getTime() - Date.now()) / 1000);

  for (const [unit, unitSeconds] of units) {
    if (Math.abs(seconds) >= unitSeconds) {
      return relativeTime.format(Math.round(seconds / unitSeconds), unit);
    }
  }
  return 'agora mesmo';
}

/** Absolute date and time, e.g. "26/09/2026, 14:03". */
export function formatFullDate(date: Date): string {
  return fullDate.format(date);
}

/** Long date without time, e.g. "26 de setembro de 2026". */
export function formatLongDate(date: Date): string {
  return longDate.format(date);
}
