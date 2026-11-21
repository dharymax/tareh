import { describe, expect, it } from 'vitest';
import { calculatePredictionPoints } from './scoring.js';

const rules = {
  exactScorePoints: 5,
  correctOutcomePoints: 3,
  correctTotalGoalsPoints: 2,
};

describe('calculatePredictionPoints', () => {
  it('awards exact score points', () => {
    expect(calculatePredictionPoints(
      { homeGoals: 2, awayGoals: 1 },
      { homeGoals: 2, awayGoals: 1 },
      rules,
    )).toEqual({ points: 5, resultType: 'EXACT_SCORE' });
  });

  it('awards outcome points when the result is correct', () => {
    expect(calculatePredictionPoints(
      { homeGoals: 3, awayGoals: 1 },
      { homeGoals: 2, awayGoals: 0 },
      rules,
    )).toEqual({ points: 3, resultType: 'CORRECT_OUTCOME' });
  });

  it('awards total-goals points when the outcome is wrong but total is right', () => {
    expect(calculatePredictionPoints(
      { homeGoals: 0, awayGoals: 3 },
      { homeGoals: 2, awayGoals: 1 },
      rules,
    )).toEqual({ points: 2, resultType: 'CORRECT_TOTAL_GOALS' });
  });

  it('awards zero for an incorrect prediction', () => {
    expect(calculatePredictionPoints(
      { homeGoals: 0, awayGoals: 0 },
      { homeGoals: 2, awayGoals: 1 },
      rules,
    )).toEqual({ points: 0, resultType: 'INCORRECT' });
  });
});
