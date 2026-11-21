import { BadRequestException } from '@nestjs/common';

const ADEN_OFFSET = '+03:00';

export function adenDayRange(dateKey: string): { gte: Date; lt: Date } {
  const start = new Date(`${dateKey}T00:00:00${ADEN_OFFSET}`);
  if (Number.isNaN(start.getTime()) || currentAdenDateKey(start) !== dateKey) {
    throw new BadRequestException('Invalid calendar date');
  }
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { gte: start, lt: end };
}

export function currentAdenDateKey(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Aden',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function dateRange(from: string, to: string): { gte: Date; lte: Date } {
  const start = adenDayRange(from).gte;
  const end = adenDayRange(to).lt;
  if (start > end) {
    throw new BadRequestException('"from" must be on or before "to"');
  }
  const maxRange = 31 * 24 * 60 * 60 * 1000;
  if (end.getTime() - start.getTime() > maxRange) {
    throw new BadRequestException('Date range cannot exceed 31 days');
  }
  return { gte: start, lte: new Date(end.getTime() - 1) };
}
