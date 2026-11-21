export type LeaderboardPeriod = 'all' | 'week' | 'month';

export type DateRange = {
  start: Date;
  end: Date;
};

function dateKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function adenMidnight(date: string): Date {
  return new Date(`${date}T00:00:00+03:00`);
}

export function getAdenPeriodRange(
  period: Exclude<LeaderboardPeriod, 'all'>,
  now = new Date(),
): DateRange {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Aden',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const currentDate = new Date(
    Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day)),
  );

  let start: Date;
  let end: Date;

  if (period === 'week') {
    const daysSinceMonday = (currentDate.getUTCDay() + 6) % 7;
    start = new Date(currentDate.getTime() - daysSinceMonday * 86400000);
    end = new Date(start.getTime() + 7 * 86400000);
  } else {
    start = new Date(Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth(), 1));
    end = new Date(Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth() + 1, 1));
  }

  return { start: adenMidnight(dateKey(start)), end: adenMidnight(dateKey(end)) };
}
