import { describe, expect, it } from 'vitest';
import { getAdenPeriodRange } from './aden-period.js';

describe('getAdenPeriodRange', () => {
  it('uses Monday-to-Monday bounds for weekly rankings in Asia/Aden', () => {
    const range = getAdenPeriodRange('week', new Date('2026-11-21T12:00:00.000Z'));
    expect(range.start.toISOString()).toBe('2026-11-15T21:00:00.000Z');
    expect(range.end.toISOString()).toBe('2026-11-22T21:00:00.000Z');
  });

  it('uses local calendar month bounds for monthly rankings', () => {
    const range = getAdenPeriodRange('month', new Date('2026-11-21T12:00:00.000Z'));
    expect(range.start.toISOString()).toBe('2026-10-31T21:00:00.000Z');
    expect(range.end.toISOString()).toBe('2026-11-30T21:00:00.000Z');
  });
});
