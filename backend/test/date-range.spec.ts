import assert from 'node:assert/strict';
import test from 'node:test';
import { BadRequestException } from '@nestjs/common';
import { adenDayRange, currentAdenDateKey, dateRange } from '../src/football/date-range.js';

test('builds a local Aden day as a 24-hour UTC interval', () => {
  const range = adenDayRange('2026-11-21');
  assert.equal(currentAdenDateKey(range.gte), '2026-11-21');
  assert.equal(range.lt.getTime() - range.gte.getTime(), 24 * 60 * 60 * 1000);
});

test('rejects impossible calendar dates', () => {
  assert.throws(() => adenDayRange('2026-02-30'), BadRequestException);
});

test('rejects a reversed date range', () => {
  assert.throws(() => dateRange('2026-11-22', '2026-11-21'), BadRequestException);
});

test('rejects date ranges wider than 31 days', () => {
  assert.throws(() => dateRange('2026-01-01', '2026-02-02'), BadRequestException);
});
