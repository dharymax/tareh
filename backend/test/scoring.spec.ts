import assert from 'node:assert/strict';
import test from 'node:test';
import { calculatePredictionPoints } from '../src/predictions/scoring.js';

test('awards 5 points for an exact score', () => {
  assert.deepEqual(
    calculatePredictionPoints({ homeGoals: 2, awayGoals: 1 }, { homeGoals: 2, awayGoals: 1 }),
    { points: 5, resultType: 'EXACT_SCORE' },
  );
});

test('awards 3 points for the correct match outcome', () => {
  assert.deepEqual(
    calculatePredictionPoints({ homeGoals: 3, awayGoals: 1 }, { homeGoals: 2, awayGoals: 0 }),
    { points: 3, resultType: 'CORRECT_OUTCOME' },
  );
});

test('awards 2 points for the correct total goals', () => {
  assert.deepEqual(
    calculatePredictionPoints({ homeGoals: 1, awayGoals: 1 }, { homeGoals: 2, awayGoals: 0 }),
    { points: 2, resultType: 'CORRECT_TOTAL_GOALS' },
  );
});

test('awards zero points for an incorrect prediction', () => {
  assert.deepEqual(
    calculatePredictionPoints({ homeGoals: 0, awayGoals: 2 }, { homeGoals: 2, awayGoals: 1 }),
    { points: 0, resultType: 'INCORRECT' },
  );
});

test('rejects negative or fractional goals', () => {
  assert.throws(
    () => calculatePredictionPoints({ homeGoals: -1, awayGoals: 0 }, { homeGoals: 0, awayGoals: 0 }),
    RangeError,
  );
  assert.throws(
    () => calculatePredictionPoints({ homeGoals: 1.5, awayGoals: 0 }, { homeGoals: 0, awayGoals: 0 }),
    RangeError,
  );
});
