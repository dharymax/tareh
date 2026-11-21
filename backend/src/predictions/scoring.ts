export type PredictionScore = {
  homeGoals: number;
  awayGoals: number;
};

export type ScoringResultType =
  | 'EXACT_SCORE'
  | 'CORRECT_OUTCOME'
  | 'CORRECT_TOTAL_GOALS'
  | 'INCORRECT';

export type ScoringResult = {
  points: number;
  resultType: ScoringResultType;
};

function outcome(score: PredictionScore): -1 | 0 | 1 {
  if (score.homeGoals > score.awayGoals) return 1;
  if (score.homeGoals < score.awayGoals) return -1;
  return 0;
}

/** Awards only the highest matching category; categories are never added together. */
export function calculatePredictionPoints(
  prediction: PredictionScore,
  actual: PredictionScore,
): ScoringResult {
  const scores = [
    prediction.homeGoals,
    prediction.awayGoals,
    actual.homeGoals,
    actual.awayGoals,
  ];
  if (scores.some((score) => !Number.isInteger(score) || score < 0)) {
    throw new RangeError('Goals must be non-negative integers');
  }

  if (
    prediction.homeGoals === actual.homeGoals &&
    prediction.awayGoals === actual.awayGoals
  ) {
    return { points: 5, resultType: 'EXACT_SCORE' };
  }
  if (outcome(prediction) === outcome(actual)) {
    return { points: 3, resultType: 'CORRECT_OUTCOME' };
  }
  if (
    prediction.homeGoals + prediction.awayGoals ===
    actual.homeGoals + actual.awayGoals
  ) {
    return { points: 2, resultType: 'CORRECT_TOTAL_GOALS' };
  }
  return { points: 0, resultType: 'INCORRECT' };
}
